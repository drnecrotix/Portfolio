import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runDueServiceMonitoring } from '@/modules/service-requests/monitoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
};

function authorized(request: Request, secret: string) {
    const header = request.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return false;
    const expected = Buffer.from(secret);
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
    const secret = String(process.env.MONITORING_CRON_SECRET ?? '').trim();
    if (secret.length < 24) return NextResponse.json({ error: 'Monitoring scheduler is not configured.' }, { status: 503, headers: noStoreHeaders });
    if (!authorized(request, secret)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: noStoreHeaders });

    try {
        const result = await runDueServiceMonitoring(3);
        return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
    } catch (error) {
        console.error('[Service Monitoring] scheduled run failed', error);
        return NextResponse.json({ error: 'Scheduled monitoring run failed.' }, { status: 500, headers: noStoreHeaders });
    }
}
