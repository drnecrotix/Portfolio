import { NextResponse } from 'next/server';
import { createCommentChallenge } from '@/lib/comment-challenge';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        return NextResponse.json(createCommentChallenge(), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch {
        return NextResponse.json({ error: 'Comment verification is temporarily unavailable.' }, { status: 503 });
    }
}
