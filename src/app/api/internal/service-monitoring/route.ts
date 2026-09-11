import { NextResponse } from 'next/server';
import { runDueServiceMonitoring } from '@/modules/service-requests/monitoring';
import { monitoringSchedulerCredential, verifyMonitoringSchedulerToken } from '@/modules/service-requests/monitoring-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
};

export async function POST(request: Request) {
    const credential = monitoringSchedulerCredential();
    if (!credential) return NextResponse.json({ error: 'Monitoring scheduler is not configured.' }, { status: 503, headers: noStoreHeaders });

    const header = request.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!verifyMonitoringSchedulerToken(token)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: noStoreHeaders });

    try {
        const result = await runDueServiceMonitoring(3);
        return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
    } catch (error) {
        console.error('[Service Monitoring] scheduled run failed', error);
        return NextResponse.json({ error: 'Scheduled monitoring run failed.' }, { status: 500, headers: noStoreHeaders });
    }
}
