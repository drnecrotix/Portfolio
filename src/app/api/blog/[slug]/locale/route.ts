import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAvailablePostLocales, getLocalizedPostFields, type BlogLocale } from '@/lib/cms-posts';

const supportedLocales = new Set<BlogLocale>(['en', 'bg']);

function isPublicPost(post: { status: string; publishedAt: Date | null }) {
    return post.status === 'PUBLISHED' && (!post.publishedAt || post.publishedAt <= new Date());
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const body = await request.json().catch(() => null) as { locale?: string } | null;
    const locale = body?.locale as BlogLocale | undefined;

    if (!locale || !supportedLocales.has(locale)) {
        return NextResponse.json({ error: 'Unsupported locale.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { slug } });
    if (!post || !isPublicPost(post)) {
        return NextResponse.json({ error: 'Publication not found.' }, { status: 404 });
    }

    const availableLocales = getAvailablePostLocales(post);
    if (!availableLocales.includes(locale)) {
        return NextResponse.json({ error: 'Translation is not available.' }, { status: 404 });
    }

    const localized = getLocalizedPostFields(post, locale);
    const response = NextResponse.json({
        ok: true,
        locale,
        title: localized.title,
        excerpt: localized.excerpt,
        content: localized.content,
        availableLocales,
    });

    response.cookies.set('locale', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
    });

    return response;
}
