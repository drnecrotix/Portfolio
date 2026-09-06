import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    COUNTRY_LOOKUP_RETRY_HOURS,
    TRAFFIC_IP_RETENTION_HOURS,
    TRAFFIC_METRIC_RETENTION_DAYS,
    TRAFFIC_PAGE_EVENT_RETENTION_DAYS,
    TRAFFIC_SESSION_COOKIE,
    TRAFFIC_SESSION_RETENTION_HOURS,
    TRAFFIC_VISIT_TIMEOUT_MINUTES,
    cityFromHeaders,
    clientIpFromHeaders,
    countryCodeFromHeaders,
    deviceFromUserAgent,
    ipLocationFromIp,
    isLikelyBot,
    startOfUtcHour,
} from '@/lib/traffic-analytics';

export const dynamic = 'force-dynamic';

function isSameOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    if (!origin) return true;

    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim() || request.nextUrl.host;
    if (!host) return false;

    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

function sessionHash(value: string) {
    const secret = process.env.AUTH_SECRET || 'necrotix-traffic-session';
    return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

function isPublicIpAddress(value: string | null) {
    if (!value) return false;
    const version = isIP(value);
    if (version === 4) {
        const [a, b] = value.split('.').map(Number);
        if (a === 10 || a === 127 || a === 0) return false;
        if (a === 169 && b === 254) return false;
        if (a === 172 && b >= 16 && b <= 31) return false;
        if (a === 192 && b === 168) return false;
        if (a === 100 && b >= 64 && b <= 127) return false;
        if (a >= 224) return false;
        return true;
    }
    if (version === 6) {
        const normalized = value.toLowerCase();
        if (normalized === '::' || normalized === '::1') return false;
        if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return false;
        if (normalized.startsWith('ff') || normalized.startsWith('2001:db8:')) return false;
        return true;
    }
    return false;
}

async function readTrafficPayload(request: NextRequest) {
    try {
        const payload = await request.json() as { path?: unknown; heartbeat?: unknown };
        const rawPath = typeof payload.path === 'string' && payload.path.startsWith('/')
            ? payload.path
            : null;
        const path = rawPath
            ? rawPath.split('?')[0].split('#')[0].slice(0, 512)
            : null;
        return { path, heartbeat: payload.heartbeat === true };
    } catch {
        return { path: null, heartbeat: false };
    }
}

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userAgent = request.headers.get('user-agent');
    if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

    const { path, heartbeat } = await readTrafficPayload(request);
    const now = new Date();
    const deviceType = deviceFromUserAgent(userAgent);
    const bucketStart = startOfUtcHour(now);
    const cookieValue = request.cookies.get(TRAFFIC_SESSION_COOKIE)?.value || randomUUID();
    const hash = sessionHash(cookieValue);
    const existing = await prisma.trafficSession.findUnique({ where: { sessionHash: hash } }).catch(() => null);
    const visitCutoff = new Date(now.getTime() - TRAFFIC_VISIT_TIMEOUT_MINUTES * 60 * 1000);
    const isNewVisit = !existing || existing.lastSeenAt < visitCutoff;

    const rawIpAddress = clientIpFromHeaders(request.headers);
    const ipAddress = isPublicIpAddress(rawIpAddress) ? rawIpAddress : null;
    const ipChanged = Boolean(ipAddress && existing && existing.ipAddress !== ipAddress);
    const headerCountry = countryCodeFromHeaders(request.headers);
    const headerCity = cityFromHeaders(request.headers);

    let countryCode = headerCountry !== 'XX'
        ? headerCountry
        : (ipChanged ? 'XX' : (existing?.countryCode || 'XX'));
    let currentCity = headerCity || (ipChanged ? null : existing?.currentCity) || null;
    let countryLookupAt = ipChanged ? null : (existing?.countryLookupAt || null);

    const retryBefore = new Date(now.getTime() - COUNTRY_LOOKUP_RETRY_HOURS * 60 * 60 * 1000);
    const needsFallbackLocation = Boolean(ipAddress)
        && !headerCity
        && (countryCode === 'XX' || !currentCity)
        && (!countryLookupAt || countryLookupAt < retryBefore);

    if (needsFallbackLocation && ipAddress) {
        const location = await ipLocationFromIp(ipAddress);
        if (headerCountry === 'XX' && location.countryCode !== 'XX') countryCode = location.countryCode;
        if (location.city) currentCity = location.city;
        countryLookupAt = now;
    }

    const currentPath = path || existing?.currentPath || null;
    const sessionUpsert = prisma.trafficSession.upsert({
        where: { sessionHash: hash },
        create: {
            sessionHash: hash,
            countryCode,
            deviceType,
            currentPath,
            currentCity,
            ipAddress,
            countryLookupAt,
            startedAt: now,
            lastSeenAt: now,
        },
        update: {
            lastSeenAt: now,
            countryCode,
            deviceType,
            currentPath,
            currentCity,
            ipAddress,
            countryLookupAt,
        },
    });

    // Heartbeats only refresh live presence. A visit starts again after the
    // inactivity window, while page views and page history are stored only on
    // real navigation requests.
    if (heartbeat && !isNewVisit) {
        await sessionUpsert;
    } else {
        const pageViewIncrement = heartbeat ? 0 : 1;
        const metricUpsert = prisma.trafficMetric.upsert({
            where: { bucketStart_countryCode_deviceType: { bucketStart, countryCode, deviceType } },
            create: {
                bucketStart,
                countryCode,
                deviceType,
                pageViews: pageViewIncrement,
                visits: isNewVisit ? 1 : 0,
            },
            update: {
                pageViews: { increment: pageViewIncrement },
                visits: { increment: isNewVisit ? 1 : 0 },
            },
        });

        if (!heartbeat && currentPath) {
            await prisma.$transaction([
                sessionUpsert,
                metricUpsert,
                prisma.trafficPageEvent.create({
                    data: {
                        sessionHash: hash,
                        path: currentPath,
                        countryCode,
                        city: currentCity,
                        ipAddress,
                        deviceType,
                        occurredAt: now,
                    },
                }),
            ]);
        } else {
            await prisma.$transaction([sessionUpsert, metricUpsert]);
        }
    }

    if (Math.random() < 0.025) {
        const staleSession = new Date(now.getTime() - TRAFFIC_SESSION_RETENTION_HOURS * 60 * 60 * 1000);
        const staleMetric = new Date(now.getTime() - TRAFFIC_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const stalePageEvent = new Date(now.getTime() - TRAFFIC_PAGE_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const stalePageIp = new Date(now.getTime() - TRAFFIC_IP_RETENTION_HOURS * 60 * 60 * 1000);
        void Promise.all([
            prisma.trafficSession.deleteMany({ where: { lastSeenAt: { lt: staleSession } } }),
            prisma.trafficMetric.deleteMany({ where: { bucketStart: { lt: staleMetric } } }),
            prisma.trafficPageEvent.deleteMany({ where: { occurredAt: { lt: stalePageEvent } } }),
            prisma.trafficPageEvent.updateMany({
                where: { occurredAt: { lt: stalePageIp }, ipAddress: { not: null } },
                data: { ipAddress: null },
            }),
        ]).catch(() => undefined);
    }

    const response = new NextResponse(null, { status: 204 });
    if (!request.cookies.get(TRAFFIC_SESSION_COOKIE)?.value) {
        response.cookies.set(TRAFFIC_SESSION_COOKIE, cookieValue, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
    }
    return response;
}
