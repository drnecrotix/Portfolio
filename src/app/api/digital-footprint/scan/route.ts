import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bearerToken, clientIp, rateLimited, validOrigin } from '@/modules/digital-footprint/http';
import { resolveVerifiedEmail } from '@/modules/digital-footprint/security';
import { calculateRiskScore, runFootprintProviders } from '@/modules/digital-footprint/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ usernames: z.array(z.string().trim().regex(/^[a-zA-Z0-9_.-]{2,40}$/)).max(3).default([]) });

export async function POST(request: Request) {
    const headers = { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, noarchive' };
    if (!validOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
    if (rateLimited(`scan:${clientIp(request)}`, 6, 60 * 60 * 1000)) return NextResponse.json({ error: 'Scan limit reached. Try again later.' }, { status: 429, headers });
    const email = await resolveVerifiedEmail(bearerToken(request));
    if (!email) return NextResponse.json({ error: 'Email verification expired.' }, { status: 401, headers });
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'One or more usernames are invalid.' }, { status: 400, headers });
    const result = await runFootprintProviders(email, [...new Set(parsed.data.usernames.map((value) => value.toLowerCase()))]);
    return NextResponse.json({
        scan: {
            email,
            checkedAt: new Date().toISOString(),
            ...result,
            riskScore: calculateRiskScore(result.findings),
            notice: 'A match is a research lead, not proof that separate profiles belong to the same person. Scan results are not stored by NecrotixLab.',
        },
    }, { headers });
}
