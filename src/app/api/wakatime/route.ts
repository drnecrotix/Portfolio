import { NextResponse } from 'next/server';
import { getRuntimeIntegrationValue } from '@/lib/integration-runtime';

const headers = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
};

export async function GET() {
    const apiKey = await getRuntimeIntegrationValue('wakatime.apiKey', 'WAKATIME_API_KEY');

    if (!apiKey) {
        return NextResponse.json({ error: 'Metrics are unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const authorization = `Basic ${Buffer.from(apiKey).toString('base64')}`;
        const response = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
            headers: { Authorization: authorization },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            console.warn('[WakaTime] Stats request failed with status', response.status);
            return NextResponse.json({ error: 'Metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
        }

        const data = await response.json();
        return NextResponse.json(data, { headers });
    } catch (error) {
        console.error('[WakaTime] Stats request failed:', error instanceof Error ? error.message : 'unknown error');
        return NextResponse.json({ error: 'Metrics are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
