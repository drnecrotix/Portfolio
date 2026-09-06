import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    LIVE_VISITOR_WINDOW_MINUTES,
    TRAFFIC_IP_RETENTION_HOURS,
    TRAFFIC_METRIC_RETENTION_DAYS,
    TRAFFIC_PAGE_EVENT_ADMIN_LIMIT,
    TRAFFIC_PAGE_EVENT_RETENTION_DAYS,
    TRAFFIC_SESSION_RETENTION_HOURS,
    TRAFFIC_VISIT_TIMEOUT_MINUTES,
    countryName,
    decodePageEventDeviceContext,
    parseTrafficRange,
    startOfUtcDay,
    startOfUtcHour,
    trafficRangeHours,
} from '@/lib/traffic-analytics';

export const dynamic = 'force-dynamic';

type ChartBucket = { key: string; label: string; pageViews: number; visits: number };
type LiveCountry = { code: string; name: string; visitors: number };
type LiveCity = { name: string; countryCode: string; countryName: string; visitors: number };
type LivePage = { path: string; visitors: number; countries: LiveCountry[]; lastSeenAt: string };

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
    const ipCutoff = new Date(now.getTime() - TRAFFIC_IP_RETENTION_HOURS * 60 * 60 * 1000);

    const [rows, liveSessions, recentActivity, recentActivityTotal, cityRows] = await Promise.all([
        prisma.trafficMetric.findMany({
            where: { bucketStart: { gte: cutoff } },
            orderBy: { bucketStart: 'asc' },
        }),
        prisma.trafficSession.findMany({
            where: { lastSeenAt: { gte: liveCutoff } },
            select: {
                sessionHash: true,
                currentPath: true,
                currentCity: true,
                countryCode: true,
                lastSeenAt: true,
            },
            orderBy: { lastSeenAt: 'desc' },
        }),
        prisma.trafficPageEvent.findMany({
            where: { occurredAt: { gte: cutoff } },
            select: {
                id: true,
                sessionHash: true,
                path: true,
                countryCode: true,
                city: true,
                ipAddress: true,
                deviceType: true,
                occurredAt: true,
            },
            orderBy: { occurredAt: 'desc' },
            take: TRAFFIC_PAGE_EVENT_ADMIN_LIMIT,
        }),
        prisma.trafficPageEvent.count({ where: { occurredAt: { gte: cutoff } } }),
        prisma.trafficPageEvent.groupBy({
            by: ['city', 'countryCode'],
            where: { occurredAt: { gte: cutoff }, city: { not: null } },
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 100,
        }),
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

    const liveCountryTotals = new Map<string, number>();
    const liveCityTotals = new Map<string, { name: string; countryCode: string; visitors: number }>();
    const livePageTotals = new Map<string, { visitors: number; countries: Map<string, number>; lastSeenAt: Date }>();
    const liveCurrentPathBySession = new Map<string, string>();

    for (const liveSession of liveSessions) {
        const countryCode = liveSession.countryCode || 'XX';
        liveCountryTotals.set(countryCode, (liveCountryTotals.get(countryCode) || 0) + 1);

        const city = liveSession.currentCity?.trim();
        if (city) {
            const cityKey = `${countryCode}:${city.toLocaleLowerCase('en')}`;
            const currentCity = liveCityTotals.get(cityKey) || { name: city, countryCode, visitors: 0 };
            currentCity.visitors += 1;
            liveCityTotals.set(cityKey, currentCity);
        }

        const path = liveSession.currentPath || 'Unknown page';
        if (liveSession.currentPath) liveCurrentPathBySession.set(liveSession.sessionHash, liveSession.currentPath);
        const current = livePageTotals.get(path) || {
            visitors: 0,
            countries: new Map<string, number>(),
            lastSeenAt: liveSession.lastSeenAt,
        };
        current.visitors += 1;
        current.countries.set(countryCode, (current.countries.get(countryCode) || 0) + 1);
        if (liveSession.lastSeenAt > current.lastSeenAt) current.lastSeenAt = liveSession.lastSeenAt;
        livePageTotals.set(path, current);
    }

    const liveCountries: LiveCountry[] = [...liveCountryTotals.entries()]
        .map(([code, visitors]) => ({ code, name: countryName(code), visitors }))
        .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name));

    const liveCities: LiveCity[] = [...liveCityTotals.values()]
        .map((city) => ({ ...city, countryName: countryName(city.countryCode) }))
        .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name));

    const livePages: LivePage[] = [...livePageTotals.entries()]
        .map(([path, value]) => ({
            path,
            visitors: value.visitors,
            countries: [...value.countries.entries()]
                .map(([code, visitors]) => ({ code, name: countryName(code), visitors }))
                .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name)),
            lastSeenAt: value.lastSeenAt.toISOString(),
        }))
        .sort((a, b) => b.visitors - a.visitors || b.lastSeenAt.localeCompare(a.lastSeenAt));

    const countries = [...countryTotals.entries()]
        .map(([code, value]) => ({
            code,
            name: countryName(code),
            ...value,
            liveVisitors: liveCountryTotals.get(code) || 0,
        }))
        .sort((a, b) => b.visits - a.visits || b.pageViews - a.pageViews);

    const devices = [...deviceTotals.entries()]
        .map(([device, value]) => ({ device, ...value }))
        .sort((a, b) => b.visits - a.visits || b.pageViews - a.pageViews);

    const cities = cityRows
        .filter((row) => Boolean(row.city?.trim()))
        .map((row) => {
            const name = row.city!.trim();
            const liveKey = `${row.countryCode}:${name.toLocaleLowerCase('en')}`;
            return {
                name,
                countryCode: row.countryCode,
                countryName: countryName(row.countryCode),
                pageViews: row._count.city,
                liveVisitors: liveCityTotals.get(liveKey)?.visitors || 0,
            };
        });

    const activity = recentActivity.map((item) => {
        const { device, operatingSystem } = decodePageEventDeviceContext(item.deviceType);
        return {
            id: item.id,
            path: item.path,
            countryCode: item.countryCode,
            countryName: countryName(item.countryCode),
            city: item.city,
            device,
            operatingSystem,
            ipAddress: item.occurredAt >= ipCutoff ? item.ipAddress : null,
            ipExpired: item.occurredAt < ipCutoff,
            isLiveCurrent: liveCurrentPathBySession.get(item.sessionHash) === item.path,
            occurredAt: item.occurredAt.toISOString(),
        };
    });

    return NextResponse.json({
        range,
        summary: {
            liveVisitors: liveSessions.length,
            livePages: livePages.filter((item) => item.path !== 'Unknown page').length,
            pageViews,
            visits,
            countries: countries.filter((item) => item.code !== 'XX' && item.visits > 0).length,
        },
        live: {
            visitors: liveSessions.length,
            pages: livePages,
            countries: liveCountries,
            cities: liveCities,
            windowMinutes: LIVE_VISITOR_WINDOW_MINUTES,
        },
        chart,
        countries,
        cities,
        devices,
        activity: {
            items: activity,
            total: recentActivityTotal,
            limit: TRAFFIC_PAGE_EVENT_ADMIN_LIMIT,
        },
        retention: {
            aggregateDays: TRAFFIC_METRIC_RETENTION_DAYS,
            pageActivityDays: TRAFFIC_PAGE_EVENT_RETENTION_DAYS,
            sessionHours: TRAFFIC_SESSION_RETENTION_HOURS,
            ipHours: TRAFFIC_IP_RETENTION_HOURS,
            visitTimeoutMinutes: TRAFFIC_VISIT_TIMEOUT_MINUTES,
        },
        updatedAt: now.toISOString(),
    }, {
        headers: { 'cache-control': 'no-store, max-age=0' },
    });
}
