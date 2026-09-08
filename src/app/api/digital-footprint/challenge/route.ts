import { NextResponse } from 'next/server';
import { createCommentChallenge } from '@/lib/comment-challenge';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function isBotCheckEnabled() {
    try {
        const settings = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const raw = settings?.integrationSettings;
        const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
        if (obj['footprint.botCheckEnabled'] === false || obj['footprint.botCheckEnabled'] === 'false') return false;
        return true;
    } catch {
        return true;
    }
}

export async function GET() {
    try {
        const enabled = await isBotCheckEnabled();
        if (!enabled) {
            return NextResponse.json({ enabled: false, question: '', token: '' }, { headers: { 'Cache-Control': 'no-store' } });
        }
        return NextResponse.json({ enabled: true, ...createCommentChallenge() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: 'Bot verification is temporarily unavailable.' }, { status: 503 });
    }
}
