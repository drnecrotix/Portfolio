import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type MonitoringSchedulerCredential = {
    token: string;
    source: 'environment' | 'derived';
};

const MONITORING_SCOPE = 'necrotixlab:service-monitoring:v1';

function clean(value: string | undefined) {
    return String(value ?? '').trim();
}

function derivedRootSecret() {
    const candidates = [
        process.env.INTEGRATION_CREDENTIALS_SECRET,
        process.env.AI_CREDENTIALS_SECRET,
        process.env.AUTH_SECRET,
    ];

    return candidates.map(clean).find((value) => value.length >= 24) ?? '';
}

export function monitoringSchedulerCredential(): MonitoringSchedulerCredential | null {
    const explicit = clean(process.env.MONITORING_CRON_SECRET);
    if (explicit.length >= 24) return { token: explicit, source: 'environment' };

    const root = derivedRootSecret();
    if (!root) return null;

    const token = createHmac('sha256', root)
        .update(MONITORING_SCOPE)
        .digest('base64url');

    return { token, source: 'derived' };
}

export function verifyMonitoringSchedulerToken(candidate: string) {
    const credential = monitoringSchedulerCredential();
    const token = clean(candidate);
    if (!credential || !token) return false;

    const expected = Buffer.from(credential.token, 'utf8');
    const received = Buffer.from(token, 'utf8');
    return expected.length === received.length && timingSafeEqual(expected, received);
}

export function maskedMonitoringSchedulerToken(token: string) {
    if (token.length <= 16) return '••••••••';
    return `${token.slice(0, 8)}••••••••${token.slice(-6)}`;
}
