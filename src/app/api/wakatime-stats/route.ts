import { NextResponse } from 'next/server';

const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
};

function unavailable() {
    return NextResponse.json(
        { error: 'WakaTime metrics are temporarily unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
}

export async function GET() {
    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) return unavailable();

    const headers = { Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` };

    try {
        const statsRes = await fetch('https://wakatime.com/api/v1/users/current/summaries?range=last_7_days', {
            headers,
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(8000),
        });

        if (!statsRes.ok) {
            console.warn('[WakaTime] Summary request failed with status', statsRes.status);
            return unavailable();
        }

        const statsData = await statsRes.json();
        if (!Array.isArray(statsData?.data)) return unavailable();

        let bestDay = { total: 0, text: '0 mins', date: '' };
        for (const day of statsData.data) {
            const total = Number(day?.grand_total?.total_seconds ?? 0);
            if (Number.isFinite(total) && total > bestDay.total) {
                bestDay = {
                    total,
                    text: String(day?.grand_total?.text ?? '0 mins'),
                    date: String(day?.range?.date ?? ''),
                };
            }
        }

        let allTimeCoding: string | null = null;
        try {
            const allTimeRes = await fetch('https://wakatime.com/api/v1/users/current/all_time_since_today', {
                headers,
                next: { revalidate: 3600 },
                signal: AbortSignal.timeout(8000),
            });
            if (allTimeRes.ok) {
                const allTimeData = await allTimeRes.json();
                allTimeCoding = typeof allTimeData?.data?.text === 'string' ? allTimeData.data.text : null;
            }
        } catch (error) {
            console.warn('[WakaTime] All-time request failed:', error instanceof Error ? error.message : 'unknown error');
        }

        const formatDate = (value: unknown) => {
            const parsed = new Date(String(value ?? ''));
            return Number.isNaN(parsed.getTime())
                ? null
                : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return NextResponse.json({
            startDate: formatDate(statsData.start),
            endDate: formatDate(statsData.end),
            dailyAverage: String(statsData?.daily_average?.text ?? ''),
            totalThisWeek: String(statsData?.cumulative_total?.text ?? ''),
            bestDay: {
                date: formatDate(bestDay.date),
                text: bestDay.text,
            },
            allTimeCoding,
            languages: [],
            lastUpdate: new Date().toISOString(),
        }, { headers: cacheHeaders });
    } catch (error) {
        console.error('[WakaTime] Metrics request failed:', error instanceof Error ? error.message : 'unknown error');
        return unavailable();
    }
}
