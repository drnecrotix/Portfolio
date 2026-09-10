import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SeoIntelligenceError, runNativeSeoIntelligence } from '@/modules/seo-intelligence/native';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
    mode: z.enum(['overview', 'keywords', 'competitors', 'links']),
    query: z.string().trim().min(3).max(2048),
    competitors: z.array(z.string().trim().min(3).max(255)).max(3).optional().default([]),
});

type RateEntry = { count: number; resetAt: number };
const globalForSeo = globalThis as unknown as {
    seoIntelligenceRateLimit?: Map<string, RateEntry>;
    seoIntelligenceActive?: number;
};
const rateLimit = globalForSeo.seoIntelligenceRateLimit ?? new Map<string, RateEntry>();
globalForSeo.seoIntelligenceRateLimit = rateLimit;
globalForSeo.seoIntelligenceActive ??= 0;

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
    return current.count > 6;
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

function acquireSlot() {
    const active = globalForSeo.seoIntelligenceActive ?? 0;
    if (active >= 1) return false;
    globalForSeo.seoIntelligenceActive = active + 1;
    return true;
}

function releaseSlot() {
    globalForSeo.seoIntelligenceActive = Math.max(0, (globalForSeo.seoIntelligenceActive ?? 1) - 1);
}

const responseHeaders = {
    'Cache-Control': 'no-store, private',
    'X-Robots-Tag': 'noindex, noarchive',
};

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: responseHeaders });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: responseHeaders });
    }
    if (isRateLimited(clientIp(request))) {
        return NextResponse.json({ error: 'SEO Intelligence request limit reached. Try again later.' }, { status: 429, headers: responseHeaders });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid website and comparison inputs.' }, { status: 400, headers: responseHeaders });
    if (!acquireSlot()) {
        return NextResponse.json({ error: 'SEO Intelligence is busy. Try again in a few seconds.' }, { status: 503, headers: { ...responseHeaders, 'Retry-After': '10' } });
    }

    try {
        const result = await runNativeSeoIntelligence(parsed.data);
        return NextResponse.json({ result }, { headers: responseHeaders });
    } catch (error) {
        if (error instanceof SeoIntelligenceError) return NextResponse.json({ error: error.message }, { status: error.status, headers: responseHeaders });
        console.error('[SEO Intelligence] unexpected failure', error);
        return NextResponse.json({ error: 'SEO Intelligence is temporarily unavailable.' }, { status: 500, headers: responseHeaders });
    } finally {
        releaseSlot();
    }
}
