import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    LIVE_VISITOR_WINDOW_MINUTES,
    TRAFFIC_METRIC_RETENTION_DAYS,
    TRAFFIC_SESSION_RETENTION_HOURS,
    countryName,
    parseTrafficRange,
    startOfUtcDay,
    startOfUtcHour,
    trafficRangeHours,
} from '@/lib/traffic-analytics';

export const dynamic = 'force-dynamic';

type ChartBucket = { key: string; label: string; pageViews: number; visits: number };

function buildChartBuckets(range: ReturnType<typeof parseTrafficRange>, now: Date) {
    const buckets: ChartBucket[] = [];

    if (range === '24h') {
        const lastHour = startOfUtcHour(now);
        for (let index = 23; index >= 0; index -= 1) {
            const date = new Date(lastHour.getTime() - index * 60 * 60 * 1000);
            buckets.push({
                key: date.toISOString().slice(0, 13),
                label: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
                pageViews: 0,
                visits: 0,
            });
        }
        return buckets;
    }

    const days = range === '7d' ? 7 : 30;
    const lastDay = startOfUtcDay(now);
    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(lastDay.getTime() - index * 24 * 60 * 60 * 1000);
        buckets.push({
            key: date.toISOString().slice(0, 10),
            label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
            pageViews: 0,
            visits: 0,
        });
    }
    return buckets;
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const range = parseTrafficRange(request.nextUrl.searchParams.get('range'));
    const now = new Date();
    const cutoff = new Date(now.getTime() - trafficRangeHours(range) * 60 * 60 * 1000);
    const liveCutoff = new Date(now.getTime() - LIVE_VISITOR_WINDOW_MINUTES * 60 * 1000);
    const staleSession = new Date(now.getTime() - TRAFFIC_SESSION_RETENTION_HOURS * 60 * 60 * 1000);
    const staleMetric = new Date(now.getTime() - TRAFFIC_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    await Promise.all([
        prisma.trafficSession.deleteMany({ where: { lastSeenAt: { lt: staleSession } } }).catch(() => undefined),
        prisma.trafficMetric.deleteMany({ where: { bucketStart: { lt: staleMetric } } }).catch(() => undefined),
    ]);

    const [rows, liveVisitors] = await Promise.all([
        prisma.trafficMetric.findMany({
            where: { bucketStart: { gte: cutoff } },
            orderBy: { bucketStart: 'asc' },
        }),
        prisma.trafficSession.count({ where: { lastSeenAt: { gte: liveCutoff } } }),
    ]);

    const chart = buildChartBuckets(range, now);
    const chartByKey = new Map(chart.map((bucket) => [bucket.key, bucket]));
    const countryTotals = new Map<string, { pageViews: number; visits: number }>();
    const deviceTotals = new Map<string, { pageViews: number; visits: number }>();
    let pageViews = 0;
    let visits = 0;

    for (const row of rows) {
        pageViews += row.pageViews;
        visits += row.visits;

        const chartKey = range === '24h'
            ? row.bucketStart.toISOString().slice(0, 13)
            : row.bucketStart.toISOString().slice(0, 10);
        const bucket = chartByKey.get(chartKey);
        if (bucket) {
            bucket.pageViews += row.pageViews;
            bucket.visits += row.visits;
        }

        const country = countryTotals.get(row.countryCode) || { pageViews: 0, visits: 0 };
        country.pageViews += row.pageViews;
        country.visits += row.visits;
        countryTotals.set(row.countryCode, country);

        const device = deviceTotals.get(row.deviceType) || { pageViews: 0, visits: 0 };
        device.pageViews += row.pageViews;
        device.visits += row.visits;
        deviceTotals.set(row.deviceType, device);
    }

    const countries = [...countryTotals.entries()]
        .map(([code, value]) => ({ code, name: countryName(code), ...value }))
        .sort((a, b) => b.pageViews - a.pageViews || b.visits - a.visits);
    const devices = [...deviceTotals.entries()]
        .map(([device, value]) => ({ device, ...value }))
        .sort((a, b) => b.pageViews - a.pageViews || b.visits - a.visits);

    return NextResponse.json({
        range,
        summary: {
            liveVisitors,
            pageViews,
            visits,
            countries: countries.filter((item) => item.code !== 'XX').length,
        },
        chart,
        countries,
        devices,
        retention: {
            aggregateDays: TRAFFIC_METRIC_RETENTION_DAYS,
            sessionHours: TRAFFIC_SESSION_RETENTION_HOURS,
        },
        updatedAt: now.toISOString(),
    }, {
        headers: { 'cache-control': 'no-store, max-age=0' },
    });
}
