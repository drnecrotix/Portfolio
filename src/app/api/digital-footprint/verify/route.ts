import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimited, validOrigin } from '@/modules/digital-footprint/http';
import { verifyCode } from '@/modules/digital-footprint/security';

export const runtime = 'nodejs';
const schema = z.object({ email: z.string().trim().email().max(200), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
    const headers = { 'Cache-Control': 'no-store' };
    if (!validOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
    if (rateLimited(`verify:${clientIp(request)}`, 10, 30 * 60 * 1000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429, headers });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter the six-digit code.' }, { status: 400, headers });
    const token = await verifyCode(parsed.data.email, parsed.data.code);
    if (!token) return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 401, headers });
    return NextResponse.json({ token, expiresIn: 1800 }, { headers });
}
