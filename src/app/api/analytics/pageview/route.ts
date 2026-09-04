import { createHash, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
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

const COUNTRY_LOOKUP_RETRY_MS = 60 * 60 * 1000;
const COUNTRY_LOOKUP_TIMEOUT_MS = 1800;
const DEFAULT_GEOIP_URLS = [
    'https://api.country.is/{ip}',
    'https://ipapi.co/{ip}/country/',
] as const;

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

function normalizeIpCandidate(raw: string | null | undefined) {
    if (!raw) return null;
    let value = raw.trim().replace(/^for=/i, '').replace(/^['"]|['"]$/g, '');
    if (!value || value.toLowerCase() === 'unknown') return null;

    if (value.startsWith('[')) {
        const end = value.indexOf(']');
        if (end > 1) value = value.slice(1, end);
    } else {
        const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
        if (ipv4WithPort) value = ipv4WithPort[1];
    }

    const zoneIndex = value.indexOf('%');
    if (zoneIndex > 0) value = value.slice(0, zoneIndex);
    return isIP(value) ? value : null;
}

function isPrivateOrLocalIp(ip: string) {
    const mapped = ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip;
    if (isIP(mapped) === 4) {
        const [a, b] = mapped.split('.').map(Number);
        return a === 0
            || a === 10
            || a === 127
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168)
            || (a === 100 && b >= 64 && b <= 127)
            || a >= 224;
    }

    const normalized = mapped.toLowerCase();
    return normalized === '::1'
        || normalized === '::'
        || normalized.startsWith('fc')
        || normalized.startsWith('fd')
        || /^fe[89ab]/.test(normalized);
}

function clientIpFromHeaders(headers: Headers) {
    const forwarded = headers.get('x-forwarded-for')?.split(',') || [];
    const forwardedHeader = headers.get('forwarded')
        ?.split(',')
        .map((part) => part.match(/(?:^|;)\s*for=("?\[[^\]]+\](?::\d+)?"?|"?[^;\s]+"?)/i)?.[1] || '') || [];

    const candidates = [
        headers.get('cf-connecting-ip'),
        headers.get('true-client-ip'),
        headers.get('x-real-ip'),
        headers.get('x-client-ip'),
        ...forwarded,
        ...forwardedHeader,
    ];

    for (const candidate of candidates) {
        const ip = normalizeIpCandidate(candidate);
        if (ip && !isPrivateOrLocalIp(ip)) return ip;
    }
    return null;
}

function countryCodeFromLookupPayload(text: string) {
    const trimmed = text.trim();
    if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();

    try {
        const payload = JSON.parse(trimmed) as Record<string, unknown>;
        const candidate = [payload.country, payload.country_code, payload.countryCode, payload.country_code2]
            .find((value) => typeof value === 'string' && /^[A-Za-z]{2}$/.test(value.trim()));
        return typeof candidate === 'string' ? candidate.trim().toUpperCase() : null;
    } catch {
        return null;
    }
}

async function lookupCountryByIp(ip: string) {
    const custom = process.env.TRAFFIC_GEOIP_LOOKUP_URL?.trim();
    const templates = custom ? [custom, ...DEFAULT_GEOIP_URLS] : [...DEFAULT_GEOIP_URLS];
    const seen = new Set<string>();

    for (const template of templates) {
        const url = template.replace('{ip}', encodeURIComponent(ip));
        if (!/^https:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    Accept: 'application/json, text/plain;q=0.9',
                    'User-Agent': 'NecrotixLab-Country-Analytics/1.0',
                },
                signal: AbortSignal.timeout(COUNTRY_LOOKUP_TIMEOUT_MS),
            });
            if (!response.ok) continue;
            const code = countryCodeFromLookupPayload(await response.text());
            if (code) return { code, source: custom && template === custom ? 'geoip-custom' : 'geoip-ip' };
        } catch {
            // Country attribution is best effort and must never break public page tracking.
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userAgent = request.headers.get('user-agent');
    if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

    const now = new Date();
    const headerCountry = countryCodeFromHeaders(request.headers);
    const clientIp = clientIpFromHeaders(request.headers);
    const deviceType = deviceFromUserAgent(userAgent);
    const bucketStart = startOfUtcHour(now);
    const cookieValue = request.cookies.get(TRAFFIC_SESSION_COOKIE)?.value || randomUUID();
    const hash = sessionHash(cookieValue);
    const existing = await prisma.trafficSession.findUnique({ where: { sessionHash: hash } }).catch(() => null);
    const isNewVisit = !existing;

    let countryCode = headerCountry;
    let countrySource = headerCountry !== 'XX' ? 'header' : 'unknown';
    let countryLookupAt = existing?.countryLookupAt || null;

    const sameIp = Boolean(clientIp && existing?.ipAddress === clientIp);
    if (countryCode === 'XX' && existing?.countryCode && existing.countryCode !== 'XX' && (sameIp || !existing.ipAddress)) {
        countryCode = existing.countryCode;
        countrySource = existing.countrySource || 'session';
    }

    const lookupIsStale = !countryLookupAt || now.getTime() - countryLookupAt.getTime() >= COUNTRY_LOOKUP_RETRY_MS;
    const shouldLookup = countryCode === 'XX' && Boolean(clientIp) && (!sameIp || lookupIsStale || isNewVisit);
    if (shouldLookup && clientIp) {
        countryLookupAt = now;
        const lookup = await lookupCountryByIp(clientIp);
        if (lookup) {
            countryCode = lookup.code;
            countrySource = lookup.source;
        } else {
            countrySource = 'unresolved-ip';
        }
    }

    await prisma.$transaction([
        prisma.trafficSession.upsert({
            where: { sessionHash: hash },
            create: {
                sessionHash: hash,
                countryCode,
                deviceType,
                ipAddress: clientIp,
                countrySource,
                countryLookupAt,
                startedAt: now,
                lastSeenAt: now,
            },
            update: {
                lastSeenAt: now,
                countryCode,
                deviceType,
                ipAddress: clientIp,
                countrySource,
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
