import { createHash } from 'node:crypto';

type LoginThrottleBucket = {
    failures: number;
    windowStartedAt: number;
    lockedUntil: number;
};

type LoginThrottleDescriptor = {
    key: string;
    maxFailures: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const IP_FAILURE_LIMIT = 8;
const EMAIL_FAILURE_LIMIT = 20;
const MAX_BUCKETS = 5000;

type LoginThrottleGlobal = typeof globalThis & {
    __necrotixAdminLoginThrottle?: Map<string, LoginThrottleBucket>;
};

const globalState = globalThis as LoginThrottleGlobal;
const throttleBuckets = globalState.__necrotixAdminLoginThrottle ?? new Map<string, LoginThrottleBucket>();
globalState.__necrotixAdminLoginThrottle = throttleBuckets;

function hashThrottleKey(scope: string, value: string) {
    return createHash('sha256').update(`${scope}:${value}`).digest('hex');
}

function clientIpFromHeaders(headers?: Headers | null) {
    if (!headers) return null;

    const candidates = [
        headers.get('cf-connecting-ip'),
        headers.get('x-real-ip'),
        headers.get('x-forwarded-for'),
    ];

    for (const raw of candidates) {
        const value = raw?.split(',')[0]?.trim();
        if (value) return value.slice(0, 128);
    }

    return null;
}

function pruneExpiredBuckets(now: number) {
    for (const [key, bucket] of throttleBuckets) {
        const windowExpired = now - bucket.windowStartedAt >= WINDOW_MS;
        const lockExpired = bucket.lockedUntil <= now;
        if (windowExpired && lockExpired) throttleBuckets.delete(key);
    }

    while (throttleBuckets.size > MAX_BUCKETS) {
        const oldestKey = throttleBuckets.keys().next().value as string | undefined;
        if (!oldestKey) break;
        throttleBuckets.delete(oldestKey);
    }
}

export function adminLoginThrottleKeys(email: string, headers?: Headers | null): LoginThrottleDescriptor[] {
    const normalizedEmail = email.trim().toLowerCase();
    const descriptors: LoginThrottleDescriptor[] = [
        {
            key: hashThrottleKey('email', normalizedEmail),
            maxFailures: EMAIL_FAILURE_LIMIT,
        },
    ];

    const clientIp = clientIpFromHeaders(headers);
    if (clientIp) {
        descriptors.unshift({
            key: hashThrottleKey('ip', clientIp),
            maxFailures: IP_FAILURE_LIMIT,
        });
    }

    return descriptors;
}

export function isAdminLoginAllowed(descriptors: LoginThrottleDescriptor[]) {
    const now = Date.now();
    pruneExpiredBuckets(now);

    return descriptors.every(({ key }) => {
        const bucket = throttleBuckets.get(key);
        return !bucket || bucket.lockedUntil <= now;
    });
}

export function recordAdminLoginFailure(descriptors: LoginThrottleDescriptor[]) {
    const now = Date.now();
    pruneExpiredBuckets(now);

    for (const descriptor of descriptors) {
        const current = throttleBuckets.get(descriptor.key);

        if (current?.lockedUntil && current.lockedUntil > now) continue;

        const withinWindow = current && now - current.windowStartedAt < WINDOW_MS;
        const failures = withinWindow ? current.failures + 1 : 1;
        const windowStartedAt = withinWindow ? current.windowStartedAt : now;
        const lockedUntil = failures >= descriptor.maxFailures ? now + LOCK_MS : 0;

        // Refresh insertion order so the map also acts as a bounded LRU-like cache.
        throttleBuckets.delete(descriptor.key);
        throttleBuckets.set(descriptor.key, { failures, windowStartedAt, lockedUntil });
    }

    pruneExpiredBuckets(now);
}

export function clearAdminLoginFailures(descriptors: LoginThrottleDescriptor[]) {
    for (const { key } of descriptors) throttleBuckets.delete(key);
}
