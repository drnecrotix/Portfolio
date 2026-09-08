import { NextResponse } from 'next/server';
import { clientIp, rateLimited } from '@/modules/digital-footprint/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ prefix: string }> }) {
    const { prefix } = await params;
    if (!/^[A-F0-9]{5}$/i.test(prefix)) return new NextResponse('Invalid hash prefix.', { status: 400 });
    if (rateLimited(`password:${clientIp(request)}`, 30, 10 * 60 * 1000)) return new NextResponse('Rate limit reached.', { status: 429 });
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`, {
        cache: 'no-store', headers: { 'Add-Padding': 'true', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
    });
    if (!response.ok) return new NextResponse('Password range provider unavailable.', { status: 502 });
    return new NextResponse(await response.text(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
