import 'server-only';

import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';

type ChallengePayload = {
    a: number;
    b: number;
    issuedAt: number;
    nonce: string;
};

const MAX_AGE_MS = 10 * 60 * 1000;
const MIN_AGE_MS = 1200;

function secret() {
    const value = process.env.AUTH_SECRET;
    if (!value) throw new Error('AUTH_SECRET is required for comment bot checks.');
    return value;
}

function sign(encodedPayload: string) {
    return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

export function createCommentChallenge() {
    const payload: ChallengePayload = {
        a: randomInt(2, 10),
        b: randomInt(2, 10),
        issuedAt: Date.now(),
        nonce: randomUUID(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
        question: `${payload.a} + ${payload.b} = ?`,
        token: `${encodedPayload}.${sign(encodedPayload)}`,
    };
}

export function verifyCommentChallenge(token: string, answer: string) {
    const [encodedPayload, receivedSignature] = token.split('.');
    if (!encodedPayload || !receivedSignature) return false;

    const expectedSignature = sign(encodedPayload);
    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

    let payload: ChallengePayload;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ChallengePayload;
    } catch {
        return false;
    }

    const age = Date.now() - Number(payload.issuedAt);
    if (!Number.isFinite(age) || age < MIN_AGE_MS || age > MAX_AGE_MS) return false;
    const numericAnswer = Number(answer.trim());
    return Number.isFinite(numericAnswer) && numericAnswer === payload.a + payload.b;
}
