import { NextResponse } from 'next/server';
import { z } from 'zod';
import { crawlSite } from '@/modules/web-health/site-crawl';
import { WebHealthError } from '@/modules/web-health/http';
import { hasValidOrigin, isRateLimited, noStoreHeaders } from '@/modules/web-health/route-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ url: z.string().trim().min(3).max(2048) });
const globalForCrawl = globalThis as unknown as { siteCrawlActive?: number };

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: noStoreHeaders });
    if (isRateLimited('site-crawl', request, 6)) return NextResponse.json({ error: 'Crawl limit reached. Try again in a few minutes.' }, { status: 429, headers: noStoreHeaders });

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid website URL.' }, { status: 400, headers: noStoreHeaders });

    const active = globalForCrawl.siteCrawlActive ?? 0;
    if (active >= 1) return NextResponse.json({ error: 'The bounded crawler is busy. Try again in a moment.' }, { status: 503, headers: { ...noStoreHeaders, 'Retry-After': '10' } });
    globalForCrawl.siteCrawlActive = active + 1;

    try {
        const report = await crawlSite(parsed.data.url);
        return NextResponse.json({ report }, { headers: noStoreHeaders });
    } catch (error) {
        if (error instanceof WebHealthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStoreHeaders });
        const message = error instanceof Error ? error.message : 'Site crawl failed.';
        return NextResponse.json({ error: message }, { status: 422, headers: noStoreHeaders });
    } finally {
        globalForCrawl.siteCrawlActive = Math.max(0, (globalForCrawl.siteCrawlActive ?? 1) - 1);
    }
}
