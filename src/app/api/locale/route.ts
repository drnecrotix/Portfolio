import { NextResponse } from 'next/server';

const supportedLocales = new Set(['en', 'bg']);

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { locale?: string } | null;
    const locale = body?.locale;

    if (!locale || !supportedLocales.has(locale)) {
        return NextResponse.json({ error: 'Unsupported locale.' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true, locale });
    response.cookies.set('locale', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
    });
    return response;
}
