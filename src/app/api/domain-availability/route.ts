import { NextResponse } from 'next/server';
import { z } from 'zod';
import { domainSuggestions, domainTld, normalizeDomainCandidate } from '@/modules/domain-availability/domain';
import { hasValidOrigin, isRateLimited, noStoreHeaders } from '@/modules/web-health/route-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ domain: z.string().trim().min(3).max(300) });
type Bootstrap = { services?: Array<[string[], string[]]> };

function timeout(ms: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, stop: () => clearTimeout(timer) };
}

export async function POST(request: Request) {
    if (!hasValidOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders });
    if (isRateLimited('domain-availability', request, 12, 10 * 60 * 1000)) return NextResponse.json({ error: 'Domain check limit reached. Try again later.' }, { status: 429, headers: noStoreHeaders });
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const domain = parsed.success ? normalizeDomainCandidate(parsed.data.domain) : '';
    if (!domain) return NextResponse.json({ error: 'Enter a valid domain such as example.com.' }, { status: 400, headers: noStoreHeaders });

    try {
        const bootstrapTimer = timeout(6000);
        const bootstrapResponse = await fetch('https://data.iana.org/rdap/dns.json', { signal: bootstrapTimer.signal, next: { revalidate: 86400 } });
        bootstrapTimer.stop();
        if (!bootstrapResponse.ok) throw new Error('RDAP bootstrap unavailable');
        const bootstrap = await bootstrapResponse.json() as Bootstrap;
        const tld = domainTld(domain);
        const service = bootstrap.services?.find(([tlds]) => tlds.some((item) => item.toLowerCase() === tld));
        const baseUrl = service?.[1]?.[0];
        if (!baseUrl) return NextResponse.json({ domain, status: 'unknown', message: `Automatic registration lookup is not supported for .${tld}. Confirm it with your preferred registrar.` }, { headers: noStoreHeaders });

        const lookupTimer = timeout(7000);
        const response = await fetch(new URL(`domain/${encodeURIComponent(domain)}`, baseUrl), { headers: { Accept: 'application/rdap+json, application/json' }, cache: 'no-store', signal: lookupTimer.signal, redirect: 'error' });
        lookupTimer.stop();
        if (response.status === 404) return NextResponse.json({ domain, status: 'likely_available', message: 'No registration record was found. The domain appears available, subject to final registrar confirmation.' }, { headers: noStoreHeaders });
        if (response.ok) return NextResponse.json({ domain, status: 'registered', message: 'A registration record exists for this domain.', suggestions: domainSuggestions(domain) }, { headers: noStoreHeaders });
        return NextResponse.json({ domain, status: 'unknown', message: 'The registry did not provide a conclusive result. Confirm availability with a registrar.' }, { headers: noStoreHeaders });
    } catch {
        return NextResponse.json({ domain, status: 'unknown', message: 'The registration service could not be reached. Try again or confirm with a registrar.' }, { headers: noStoreHeaders });
    }
}
