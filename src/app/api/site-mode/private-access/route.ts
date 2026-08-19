import { createHmac } from 'node:crypto';
import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function sign(expiry: number) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET is required for private access.');
    return createHmac('sha256', secret).update(`private:${expiry}`).digest('base64url');
}

export async function POST(request: Request) {
    const settings = await prisma.siteModeSettings.findUnique({ where: { id: 'default' } });
    if (!settings || settings.mode !== 'PRIVATE' || !settings.passwordHash) {
        return NextResponse.json({ ok: false, error: 'Private access is not available.' }, { status: 409 });
    }

    const formData = await request.formData();
    const password = String(formData.get('password') || '');
    if (!password || !(await compare(password, settings.passwordHash))) {
        return NextResponse.json({ ok: false, error: 'Invalid access password.' }, { status: 401 });
    }

    const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    const response = NextResponse.redirect(new URL('/', request.url), 303);
    response.cookies.set('portfolio-private-access', `${expiry}.${sign(expiry)}`, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
    });
    return response;
}
