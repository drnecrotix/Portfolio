import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inspectEmailDomain } from '@/modules/web-health/email-domain';
import { hasValidOrigin, isRateLimited, noStoreHeaders } from '@/modules/web-health/route-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
    domain: z.string().trim().min(3).max(253),
    selector: z.string().trim().max(63).optional().default(''),
});

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Unsupported request format.' }, { status: 415, headers: noStoreHeaders });
    if (isRateLimited('email-domain', request, 12)) return NextResponse.json({ error: 'Check limit reached. Try again in a few minutes.' }, { status: 429, headers: noStoreHeaders });

    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid domain name.' }, { status: 400, headers: noStoreHeaders });

    try {
        const report = await inspectEmailDomain(parsed.data.domain, parsed.data.selector);
        return NextResponse.json({ report }, { headers: noStoreHeaders });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Domain security check failed.';
        return NextResponse.json({ error: message }, { status: 422, headers: noStoreHeaders });
    }
}
