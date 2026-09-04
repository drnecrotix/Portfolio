import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
    adminLoginThrottleKeys,
    clearAdminLoginFailures,
    isAdminLoginAllowed,
    recordAdminLoginFailure,
} from '@/lib/admin-login-security';

const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const nextAuth = NextAuth({
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/admin/login',
    },
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(rawCredentials, request) {
                const parsed = credentialsSchema.safeParse(rawCredentials);
                if (!parsed.success) return null;

                const email = parsed.data.email.toLowerCase();
                const throttleKeys = adminLoginThrottleKeys(email, request?.headers);
                if (!isAdminLoginAllowed(throttleKeys)) return null;

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.isActive) {
                    recordAdminLoginFailure(throttleKeys);
                    return null;
                }

                const validPassword = await compare(parsed.data.password, user.passwordHash);
                if (!validPassword) {
                    recordAdminLoginFailure(throttleKeys);
                    return null;
                }

                clearAdminLoginFailures(throttleKeys);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = String(token.id ?? token.sub ?? '');
                session.user.role = token.role as 'OWNER' | 'ADMIN' | 'EDITOR';
            }
            return session;
        },
    },
});

export const { handlers, signIn, signOut } = nextAuth;
const rawAuth = nextAuth.auth;

/**
 * Return only sessions backed by an active administrator record.
 * This makes account deactivation and role changes effective immediately,
 * instead of waiting for the previously issued JWT to expire.
 */
export async function auth() {
    const session = await rawAuth();
    if (!session?.user?.id) return session;

    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, role: true, isActive: true },
    }).catch(() => null);

    if (!currentUser?.isActive) return null;

    session.user.id = currentUser.id;
    session.user.name = currentUser.name;
    session.user.email = currentUser.email;
    session.user.role = currentUser.role;
    return session;
}
