import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    COUNTRY_LOOKUP_RETRY_HOURS,
    TRAFFIC_METRIC_RETENTION_DAYS,
    TRAFFIC_SESSION_COOKIE,
    TRAFFIC_SESSION_RETENTION_HOURS,
    clientIpFromHeaders,
    countryCodeFromHeaders,
    countryCodeFromIp,
    deviceFromUserAgent,
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

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userAgent = request.headers.get('user-agent');
    if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

    const now = new Date();
    const deviceType = deviceFromUserAgent(userAgent);
    const bucketStart = startOfUtcHour(now);
    const cookieValue = request.cookies.get(TRAFFIC_SESSION_COOKIE)?.value || randomUUID();
    const hash = sessionHash(cookieValue);
    const existing = await prisma.trafficSession.findUnique({ where: { sessionHash: hash } }).catch(() => null);
    const isNewVisit = !existing;

    const rawIpAddress = clientIpFromHeaders(request.headers);
    const ipAddress = isPublicIpAddress(rawIpAddress) ? rawIpAddress : null;
    const headerCountry = countryCodeFromHeaders(request.headers);
    let countryCode = headerCountry !== 'XX' ? headerCountry : (existing?.countryCode || 'XX');
    let countryLookupAt = existing?.countryLookupAt || null;

    const retryBefore = new Date(now.getTime() - COUNTRY_LOOKUP_RETRY_HOURS * 60 * 60 * 1000);
    const ipChanged = Boolean(ipAddress && existing?.ipAddress && existing.ipAddress !== ipAddress);
    const shouldLookupCountry = countryCode === 'XX'
        && Boolean(ipAddress)
        && (ipChanged || !countryLookupAt || countryLookupAt < retryBefore);

    if (shouldLookupCountry && ipAddress) {
        countryCode = await countryCodeFromIp(ipAddress);
        countryLookupAt = now;
    }

    await prisma.$transaction([
        prisma.trafficSession.upsert({
            where: { sessionHash: hash },
            create: {
                sessionHash: hash,
                countryCode,
                deviceType,
                ipAddress,
                countryLookupAt,
                startedAt: now,
                lastSeenAt: now,
            },
            update: {
                lastSeenAt: now,
                countryCode,
                deviceType,
                ipAddress,
                countryLookupAt,
            },
        }),
        prisma.trafficMetric.upsert({
            where: { bucketStart_countryCode_deviceType: { bucketStart, countryCode, deviceType } },
            create: {
                bucketStart,
                countryCode,
                deviceType,
                pageViews: 1,
                visits: isNewVisit ? 1 : 0,
            },
            update: {
                pageViews: { increment: 1 },
                visits: { increment: isNewVisit ? 1 : 0 },
            },
        }),
    ]);

    if (Math.random() < 0.025) {
        const staleSession = new Date(now.getTime() - TRAFFIC_SESSION_RETENTION_HOURS * 60 * 60 * 1000);
        const staleMetric = new Date(now.getTime() - TRAFFIC_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        void Promise.all([
            prisma.trafficSession.deleteMany({ where: { lastSeenAt: { lt: staleSession } } }),
            prisma.trafficMetric.deleteMany({ where: { bucketStart: { lt: staleMetric } } }),
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
