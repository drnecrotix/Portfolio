import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    TRAFFIC_METRIC_RETENTION_DAYS,
    TRAFFIC_SESSION_COOKIE,
    TRAFFIC_SESSION_RETENTION_HOURS,
    countryCodeFromHeaders,
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

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userAgent = request.headers.get('user-agent');
    if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

    const now = new Date();
    const countryCode = countryCodeFromHeaders(request.headers);
    const deviceType = deviceFromUserAgent(userAgent);
    const bucketStart = startOfUtcHour(now);
    const cookieValue = request.cookies.get(TRAFFIC_SESSION_COOKIE)?.value || randomUUID();
    const hash = sessionHash(cookieValue);
    const existing = await prisma.trafficSession.findUnique({ where: { sessionHash: hash } }).catch(() => null);
    const isNewVisit = !existing;

    await prisma.$transaction([
        prisma.trafficSession.upsert({
            where: { sessionHash: hash },
            create: {
                sessionHash: hash,
                countryCode,
                deviceType,
                startedAt: now,
                lastSeenAt: now,
            },
            update: {
                lastSeenAt: now,
                countryCode,
                deviceType,
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
