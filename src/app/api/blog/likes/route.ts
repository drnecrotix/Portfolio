import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'necrotix_blog_like_id';

function cleanId(value: unknown) {
    return String(value ?? '').trim().slice(0, 64);
}

function readCookie(request: Request, name: string) {
    const raw = request.headers.get('cookie') || '';
    const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json() as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const postId = cleanId(body.postId);
    if (!postId) return NextResponse.json({ error: 'Missing publication.' }, { status: 400 });

    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true, publishedAt: true },
    });
    if (!post || post.status !== 'PUBLISHED' || (post.publishedAt && post.publishedAt > new Date())) {
        return NextResponse.json({ error: 'Publication not found.' }, { status: 404 });
    }

    let visitorId = readCookie(request, COOKIE_NAME);
    let setVisitorCookie = false;
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
        visitorId = randomUUID();
        setVisitorCookie = true;
    }

    const existing = await prisma.blogPostLike.findUnique({
        where: { postId_visitorId: { postId, visitorId } },
        select: { id: true },
    });

    let liked: boolean;
    if (existing) {
        await prisma.blogPostLike.delete({ where: { id: existing.id } });
        liked = false;
    } else {
        await prisma.blogPostLike.create({ data: { postId, visitorId } });
        liked = true;
    }

    const count = await prisma.blogPostLike.count({ where: { postId } });
    const response = NextResponse.json({ liked, count });
    if (setVisitorCookie) {
        response.cookies.set(COOKIE_NAME, visitorId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 365 * 2,
        });
    }
    return response;
}
