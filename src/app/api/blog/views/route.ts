import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function cleanId(value: unknown) {
    return String(value ?? '').trim().slice(0, 64);
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

    const updated = await prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
    });

    return NextResponse.json(
        { count: updated.viewCount },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
}
