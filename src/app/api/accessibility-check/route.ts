import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inspectAccessibility } from '@/modules/web-health/accessibility';
import { WebHealthError } from '@/modules/web-health/http';
import { hasValidOrigin, isRateLimited, noStoreHeaders } from '@/modules/web-health/route-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ url: z.string().trim().min(3).max(2048) });

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: noStoreHeaders });
    if (isRateLimited('accessibility', request, 10)) return NextResponse.json({ error: 'Check limit reached. Try again in a few minutes.' }, { status: 429, headers: noStoreHeaders });

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid website URL.' }, { status: 400, headers: noStoreHeaders });

    try {
        const report = await inspectAccessibility(parsed.data.url);
        return NextResponse.json({ report }, { headers: noStoreHeaders });
    } catch (error) {
        if (error instanceof WebHealthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStoreHeaders });
        const message = error instanceof Error ? error.message : 'Accessibility check failed.';
        return NextResponse.json({ error: message }, { status: 422, headers: noStoreHeaders });
    }
}
