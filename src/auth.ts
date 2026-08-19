import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
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
            async authorize(rawCredentials) {
                const parsed = credentialsSchema.safeParse(rawCredentials);
                if (!parsed.success) return null;

                const user = await prisma.user.findUnique({
                    where: { email: parsed.data.email.toLowerCase() },
                });

                if (!user || !user.isActive) return null;

                const validPassword = await compare(parsed.data.password, user.passwordHash);
                if (!validPassword) return null;

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
