export type TrafficRange = '24h' | '7d' | '30d';
export type TrafficDevice = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export const TRAFFIC_SESSION_COOKIE = 'necrotix_traffic_session';
export const TRAFFIC_SESSION_RETENTION_HOURS = 24;
export const TRAFFIC_IP_RETENTION_HOURS = 24;
export const TRAFFIC_METRIC_RETENTION_DAYS = 31;
export const LIVE_VISITOR_WINDOW_MINUTES = 5;
export const COUNTRY_LOOKUP_RETRY_HOURS = 6;

export function parseTrafficRange(value: string | null | undefined): TrafficRange {
    return value === '7d' || value === '30d' ? value : '24h';
}

export function trafficRangeHours(range: TrafficRange) {
    if (range === '7d') return 24 * 7;
    if (range === '30d') return 24 * 30;
    return 24;
}

export function startOfUtcHour(value: Date) {
    return new Date(Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        value.getUTCHours(),
        0,
        0,
        0,
    ));
}

export function startOfUtcDay(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

export function countryCodeFromHeaders(headers: Headers) {
    const direct = [
        headers.get('cf-ipcountry'),
        headers.get('x-vercel-ip-country'),
        headers.get('cloudfront-viewer-country'),
        headers.get('x-country-code'),
        headers.get('x-country'),
        headers.get('x-geo-country'),
        headers.get('x-geoip-country'),
        headers.get('x-geoip-country-code'),
        headers.get('x-forwarded-country'),
        headers.get('x-client-country'),
        headers.get('geoip-country-code'),
        headers.get('fastly-client-country'),
        headers.get('fly-client-country'),
        headers.get('x-appengine-country'),
    ].find((value) => value?.trim())?.trim().toUpperCase();

    if (direct && /^[A-Z]{2}$/.test(direct)) return direct;

    const edgeScape = headers.get('x-akamai-edgescape');
    const edgeCountry = edgeScape?.match(/(?:^|,)\s*country_code=([A-Za-z]{2})(?:,|$)/i)?.[1]?.toUpperCase();
    return edgeCountry && /^[A-Z]{2}$/.test(edgeCountry) ? edgeCountry : 'XX';
}

function normalizeIpCandidate(value: string | null | undefined) {
    if (!value) return null;
    let candidate = value.trim().replace(/^for=/i, '').replace(/^"|"$/g, '');
    if (candidate.startsWith('[')) {
        const closing = candidate.indexOf(']');
        if (closing > 0) candidate = candidate.slice(1, closing);
    } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
        candidate = candidate.slice(0, candidate.lastIndexOf(':'));
    }
    if (candidate.toLowerCase().startsWith('::ffff:')) candidate = candidate.slice(7);
    return candidate || null;
}

export function clientIpFromHeaders(headers: Headers) {
    const direct = [
        headers.get('cf-connecting-ip'),
        headers.get('true-client-ip'),
        headers.get('x-real-ip'),
        headers.get('x-client-ip'),
    ];

    for (const value of direct) {
        const candidate = normalizeIpCandidate(value);
        if (candidate) return candidate;
    }

    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        for (const value of forwarded.split(',')) {
            const candidate = normalizeIpCandidate(value);
            if (candidate) return candidate;
        }
    }

    return null;
}

export async function countryCodeFromIp(ipAddress: string) {
    try {
        const response = await fetch(`https://api.country.is/${encodeURIComponent(ipAddress)}`, {
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'NecrotixLab-Traffic-Country-Lookup',
            },
            signal: AbortSignal.timeout(1600),
        });
        if (!response.ok) return 'XX';
        const payload = await response.json() as { country?: string };
        const country = payload.country?.trim().toUpperCase();
        return country && /^[A-Z]{2}$/.test(country) ? country : 'XX';
    } catch {
        return 'XX';
    }
}

export function deviceFromUserAgent(userAgent: string | null | undefined): TrafficDevice {
    const ua = userAgent || '';
    if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile';
    if (!ua) return 'unknown';
    return 'desktop';
}

export function isLikelyBot(userAgent: string | null | undefined) {
    return /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless/i.test(userAgent || '');
}

export function countryName(code: string) {
    if (!code || code === 'XX') return 'Unknown';
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
}
