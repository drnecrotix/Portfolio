import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const settings = await prisma.siteModeSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default' },
        select: { updatedAt: true },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set('portfolio-admin-bypass', settings.updatedAt.toISOString(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
    });
    return response;
}
