import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
    const value = process.env.AUTH_SECRET || process.env.INTEGRATION_CREDENTIALS_SECRET;
    if (!value || value.length < 24) throw new Error('Service request status access is not configured.');
    return value;
}

export function serviceStatusToken(reference: string, email: string) {
    return createHmac('sha256', secret())
        .update(`${reference}\n${email.trim().toLowerCase()}`)
        .digest('base64url');
}

export function verifyServiceStatusToken(reference: string, email: string, token: string) {
    try {
        const expected = serviceStatusToken(reference, email);
        const left = Buffer.from(expected);
        const right = Buffer.from(String(token || ''));
        return left.length === right.length && timingSafeEqual(left, right);
    } catch {
        return false;
    }
}

export function serviceStatusUrl(reference: string, email: string) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://necrotixlab.com').replace(/\/$/, '');
    const token = serviceStatusToken(reference, email);
    return `${base}/service/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`;
}
