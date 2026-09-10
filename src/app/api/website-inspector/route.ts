import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inspectWebsite, WebsiteInspectorError } from '@/modules/website-inspector/inspect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
    url: z.string().trim().min(3).max(2048),
});

type RateEntry = { count: number; resetAt: number };
const globalForInspector = globalThis as unknown as {
    websiteInspectorRateLimit?: Map<string, RateEntry>;
    websiteInspectorActiveScans?: number;
};
const rateLimit = globalForInspector.websiteInspectorRateLimit ?? new Map<string, RateEntry>();
globalForInspector.websiteInspectorRateLimit = rateLimit;
globalForInspector.websiteInspectorActiveScans ??= 0;

function clientIp(request: Request) {
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
}

function isRateLimited(ip: string) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const current = rateLimit.get(ip);
    if (!current || current.resetAt <= now) {
        rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }
    current.count += 1;
    rateLimit.set(ip, current);
    return current.count > 10;
}

function hasValidOrigin(request: Request) {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0]?.trim();
    if (!host) return true;
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

function acquireScanSlot() {
    const active = globalForInspector.websiteInspectorActiveScans ?? 0;
    if (active >= 2) return false;
    globalForInspector.websiteInspectorActiveScans = active + 1;
    return true;
}

function releaseScanSlot() {
    globalForInspector.websiteInspectorActiveScans = Math.max(0, (globalForInspector.websiteInspectorActiveScans ?? 1) - 1);
}

const responseHeaders = {
    'Cache-Control': 'no-store, private',
    'X-Robots-Tag': 'noindex, noarchive',
};

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) {
        return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: responseHeaders });
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: responseHeaders });
    }
    if (isRateLimited(clientIp(request))) {
        return NextResponse.json({ error: 'Inspection limit reached. Try again in a few minutes.' }, { status: 429, headers: responseHeaders });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Enter a valid website URL.' }, { status: 400, headers: responseHeaders });
    }

    if (!acquireScanSlot()) {
        return NextResponse.json(
            { error: 'Website Inspector is busy with other scans. Try again in a few seconds.' },
            { status: 503, headers: { ...responseHeaders, 'Retry-After': '10' } },
        );
    }

    try {
        const inspection = await inspectWebsite(parsed.data.url);
        return NextResponse.json({ inspection }, { headers: responseHeaders });
    } catch (error) {
        if (error instanceof WebsiteInspectorError) {
            return NextResponse.json({ error: error.message }, { status: error.status, headers: responseHeaders });
        }
        console.error('[Website Inspector] unexpected failure', error);
        return NextResponse.json({ error: 'Website inspection is temporarily unavailable.' }, { status: 500, headers: responseHeaders });
    } finally {
        releaseScanSlot();
    }
}
