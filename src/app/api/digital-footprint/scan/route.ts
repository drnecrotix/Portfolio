import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyCommentChallenge } from '@/lib/comment-challenge';
import { clientIp, rateLimited, validOrigin } from '@/modules/digital-footprint/http';
import { calculateRiskScore, runFootprintProviders } from '@/modules/digital-footprint/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
    queryType: z.enum(['email', 'phone', 'username']),
    query: z.string().trim().min(2).max(160),
    consent: z.literal(true),
    challengeToken: z.string().min(10).max(2000),
    challengeAnswer: z.string().trim().min(1).max(12),
    company: z.string().max(200).optional().default(''),
});

function normalizeQuery(type: 'email' | 'phone' | 'username', value: string) {
    if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
    if (type === 'phone') {
        const normalized = value.replace(/[\s().-]/g, '');
        return /^\+?[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
    }
    return /^[a-zA-Z0-9_.-]{2,40}$/.test(value) ? value.toLowerCase() : null;
}

export async function POST(request: Request) {
    const headers = { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, noarchive' };
    if (!validOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
    if (rateLimited(`scan:${clientIp(request)}`, 8, 60 * 60 * 1000)) return NextResponse.json({ error: 'Scan limit reached. Try again later.' }, { status: 429, headers });
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'The lookup request is invalid.' }, { status: 400, headers });
    if (parsed.data.company) return NextResponse.json({ accepted: true }, { status: 202, headers });
    if (!verifyCommentChallenge(parsed.data.challengeToken, parsed.data.challengeAnswer)) return NextResponse.json({ error: 'Bot check failed or expired. Please try the new question.' }, { status: 400, headers });
    const query = normalizeQuery(parsed.data.queryType, parsed.data.query);
    if (!query) return NextResponse.json({ error: `Enter a valid ${parsed.data.queryType}.` }, { status: 400, headers });
    const result = await runFootprintProviders({
        email: parsed.data.queryType === 'email' ? query : undefined,
        phone: parsed.data.queryType === 'phone' ? query : undefined,
        usernames: parsed.data.queryType === 'username' ? [query] : [],
    });
    return NextResponse.json({
        scan: {
            queryType: parsed.data.queryType,
            query,
            checkedAt: new Date().toISOString(),
            ...result,
            riskScore: calculateRiskScore(result.findings),
            notice: 'A match is a research lead, not proof that separate profiles belong to the same person. Provider coverage varies by identifier type. Scan results are not stored by NecrotixLab.',
        },
    }, { headers });
}
