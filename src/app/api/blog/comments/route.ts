import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCommentChallenge } from '@/lib/comment-challenge';

const MAX_NAME = 80;
const MAX_EMAIL = 160;
const MAX_COMMENT = 3000;

function cleanText(value: unknown, max: number) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanComment(value: unknown) {
    return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, MAX_COMMENT);
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json() as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const postId = cleanText(body.postId, 64);
    const authorName = cleanText(body.authorName, MAX_NAME);
    const authorEmail = cleanText(body.authorEmail, MAX_EMAIL).toLowerCase();
    const content = cleanComment(body.content);
    const challengeToken = String(body.challengeToken ?? '');
    const challengeAnswer = String(body.challengeAnswer ?? '');
    const website = cleanText(body.website, 200);

    if (website) return NextResponse.json({ error: 'Comment rejected.' }, { status: 400 });
    if (!postId || !authorName || !content) {
        return NextResponse.json({ error: 'Name and comment are required.' }, { status: 400 });
    }
    if (authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!verifyCommentChallenge(challengeToken, challengeAnswer)) {
        return NextResponse.json({ error: 'Bot check failed or expired. Please try the new question.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true, publishedAt: true },
    });
    if (!post || post.status !== 'PUBLISHED' || (post.publishedAt && post.publishedAt > new Date())) {
        return NextResponse.json({ error: 'This publication is not accepting comments.' }, { status: 404 });
    }

    const comment = await prisma.blogComment.create({
        data: {
            postId,
            authorName,
            authorEmail: authorEmail || null,
            content,
            status: 'APPROVED',
        },
        select: {
            id: true,
            authorName: true,
            content: true,
            createdAt: true,
        },
    });

    return NextResponse.json({
        comment: {
            ...comment,
            createdAt: comment.createdAt.toISOString(),
        },
    }, { status: 201 });
}
