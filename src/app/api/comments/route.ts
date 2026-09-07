import { NextResponse } from 'next/server';
import { verifyCommentChallenge } from '@/lib/comment-challenge';
import {
    cleanupExpiredSpamComments,
    containsPublicLink,
    isCommentSourceType,
    resolveCommentSource,
} from '@/lib/comment-engine';
import { prisma } from '@/lib/prisma';

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
    void cleanupExpiredSpamComments().catch(() => undefined);

    let body: Record<string, unknown>;
    try {
        body = await request.json() as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    if (!isCommentSourceType(body.sourceType)) {
        return NextResponse.json({ error: 'Invalid comment source.' }, { status: 400 });
    }

    const source = await resolveCommentSource(body.sourceType, body.sourceKey);
    if (!source) return NextResponse.json({ error: 'This page is not accepting comments.' }, { status: 404 });

    const parentId = cleanText(body.parentId, 64) || null;
    const authorName = cleanText(body.authorName, MAX_NAME);
    const authorEmail = cleanText(body.authorEmail, MAX_EMAIL).toLowerCase();
    const content = cleanComment(body.content);
    const challengeToken = String(body.challengeToken ?? '');
    const challengeAnswer = String(body.challengeAnswer ?? '');
    const website = cleanText(body.website, 200);

    if (website) return NextResponse.json({ accepted: true }, { status: 202 });
    if (!authorName || !content) {
        return NextResponse.json({ error: 'Name and comment are required.' }, { status: 400 });
    }
    if (authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!verifyCommentChallenge(challengeToken, challengeAnswer)) {
        return NextResponse.json({ error: 'Bot check failed or expired. Please try the new question.' }, { status: 400 });
    }

    if (parentId) {
        const parent = await prisma.blogComment.findFirst({
            where: {
                id: parentId,
                sourceType: source.type,
                sourceKey: source.key,
                status: 'APPROVED',
            },
            select: { id: true },
        });
        if (!parent) return NextResponse.json({ error: 'The comment you are replying to is unavailable.' }, { status: 404 });
    }

    const spam = containsPublicLink(content);
    const comment = await prisma.blogComment.create({
        data: {
            postId: source.postId,
            sourceType: source.type,
            sourceKey: source.key,
            sourceTitle: source.title,
            sourcePath: source.path,
            parentId,
            authorName,
            authorEmail: authorEmail || null,
            content,
            status: spam ? 'SPAM' : 'APPROVED',
            spamAt: spam ? new Date() : null,
        },
        select: {
            id: true,
            parentId: true,
            authorName: true,
            content: true,
            status: true,
            createdAt: true,
        },
    });

    if (spam) {
        return NextResponse.json({ accepted: true, status: 'SPAM' }, { status: 202 });
    }

    return NextResponse.json({
        accepted: true,
        status: 'APPROVED',
        comment: {
            ...comment,
            createdAt: comment.createdAt.toISOString(),
        },
    }, { status: 201 });
}
