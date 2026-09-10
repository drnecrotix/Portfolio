import 'server-only';

type RateEntry = { count: number; resetAt: number };
const globalForWebHealth = globalThis as unknown as { webHealthRateLimit?: Map<string, RateEntry> };
const rateLimit = globalForWebHealth.webHealthRateLimit ?? new Map<string, RateEntry>();
globalForWebHealth.webHealthRateLimit = rateLimit;

export function clientIp(request: Request) {
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
}

export function hasValidOrigin(request: Request) {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0]?.trim();
    if (!host) return true;
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

export function isRateLimited(scope: string, request: Request, limit = 10, windowMs = 10 * 60 * 1000) {
    const key = `${scope}:${clientIp(request)}`;
    const now = Date.now();
    const current = rateLimit.get(key);
    if (!current || current.resetAt <= now) {
        rateLimit.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }
    current.count += 1;
    rateLimit.set(key, current);
    return current.count > limit;
}

export const noStoreHeaders = {
    'Cache-Control': 'no-store, private',
    'X-Robots-Tag': 'noindex, noarchive',
};
