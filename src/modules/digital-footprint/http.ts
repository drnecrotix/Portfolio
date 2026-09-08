export function clientIp(request: Request) {
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
}

export function validOrigin(request: Request) {
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

type Entry = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { footprintRateLimits?: Map<string, Entry> };
const store = globalStore.footprintRateLimits ?? new Map<string, Entry>();
globalStore.footprintRateLimits = store;

export function rateLimited(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = store.get(key);
    if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }
    current.count += 1;
    store.set(key, current);
    return current.count > limit;
}

export function bearerToken(request: Request) {
    const value = request.headers.get('authorization') || '';
    return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}
