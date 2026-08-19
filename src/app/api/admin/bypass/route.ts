import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('portfolio-admin-bypass', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
    });
    return response;
}
