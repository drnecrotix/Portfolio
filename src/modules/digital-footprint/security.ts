import 'server-only';

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;

function secret() {
    const value = process.env.FOOTPRINT_SECRET || process.env.AUTH_SECRET;
    if (!value) throw new Error('FOOTPRINT_SECRET or AUTH_SECRET is required.');
    return createHash('sha256').update(value).digest();
}

export function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
}

export function hashValue(value: string) {
    return createHmac('sha256', secret()).update(value).digest('hex');
}

function encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', secret(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decrypt(value: string) {
    const [version, iv, tag, payload] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !payload) throw new Error('Invalid encrypted verification record.');
    const decipher = createDecipheriv('aes-256-gcm', secret(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(payload, 'base64url')), decipher.final()]).toString('utf8');
}

export async function createVerification(email: string, code: string) {
    const normalized = normalizeEmail(email);
    await prisma.footprintVerification.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return prisma.footprintVerification.upsert({
        where: { emailHash: hashValue(normalized) },
        update: {
            emailCipher: encrypt(normalized),
            codeHash: hashValue(`${normalized}:${code}`),
            sessionHash: null,
            attempts: 0,
            verifiedAt: null,
            expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        },
        create: {
            emailHash: hashValue(normalized),
            emailCipher: encrypt(normalized),
            codeHash: hashValue(`${normalized}:${code}`),
            expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        },
    });
}

export async function verifyCode(email: string, code: string) {
    const normalized = normalizeEmail(email);
    const record = await prisma.footprintVerification.findUnique({ where: { emailHash: hashValue(normalized) } });
    if (!record || record.expiresAt <= new Date() || record.attempts >= 5) return null;

    const actual = Buffer.from(record.codeHash, 'hex');
    const expected = Buffer.from(hashValue(`${normalized}:${code}`), 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        await prisma.footprintVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
        return null;
    }

    const token = randomBytes(32).toString('base64url');
    await prisma.footprintVerification.update({
        where: { id: record.id },
        data: { sessionHash: hashValue(token), verifiedAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return token;
}

export async function resolveVerifiedEmail(token: string) {
    if (!token || token.length < 32) return null;
    const record = await prisma.footprintVerification.findUnique({ where: { sessionHash: hashValue(token) } });
    if (!record?.verifiedAt || record.expiresAt <= new Date()) return null;
    return decrypt(record.emailCipher);
}

export async function revokeVerification(token: string) {
    if (!token) return;
    await prisma.footprintVerification.deleteMany({ where: { sessionHash: hashValue(token) } });
}
