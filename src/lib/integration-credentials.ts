import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';

const ENVELOPE_VERSION = 1;

type IntegrationVault = {
    version: number;
    values: Record<string, string>;
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function secretKey() {
    const secret = process.env.INTEGRATION_CREDENTIALS_SECRET || process.env.AI_CREDENTIALS_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('INTEGRATION_CREDENTIALS_SECRET, AI_CREDENTIALS_SECRET or AUTH_SECRET is required before API credentials can be stored in the CMS.');
    }
    return createHash('sha256').update(secret).digest();
}

function encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decrypt(value: string) {
    try {
        const [version, ivValue, tagValue, encryptedValue] = value.split('.');
        if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) return null;
        const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivValue, 'base64url'));
        decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
        return Buffer.concat([
            decipher.update(Buffer.from(encryptedValue, 'base64url')),
            decipher.final(),
        ]).toString('utf8');
    } catch {
        return null;
    }
}

function readVault(value: unknown): IntegrationVault {
    const raw = record(value);
    const valuesRaw = record(raw.values);
    const values = Object.fromEntries(
        Object.entries(valuesRaw)
            .filter(([, stored]) => typeof stored === 'string' && stored.length > 0)
            .map(([id, stored]) => [id, String(stored)]),
    );
    return { version: ENVELOPE_VERSION, values };
}

export function getStoredIntegrationValues(value: unknown): Record<string, string> {
    const vault = readVault(value);
    const resolved: Record<string, string> = {};
    for (const [id, stored] of Object.entries(vault.values)) {
        const decrypted = decrypt(stored);
        if (decrypted) resolved[id] = decrypted;
    }
    return resolved;
}

export function hasStoredIntegrationValue(value: unknown, id: string) {
    return Boolean(readVault(value).values[id]);
}

export function updateIntegrationValues(existing: unknown, changes: Record<string, string | null | undefined>) {
    const vault = readVault(existing);
    const values = { ...vault.values };

    for (const [id, nextValue] of Object.entries(changes)) {
        if (nextValue === null) {
            delete values[id];
            continue;
        }
        const clean = String(nextValue ?? '').trim();
        if (clean) values[id] = encrypt(clean);
    }

    return { version: ENVELOPE_VERSION, values };
}

export function toIntegrationSettingsJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? { version: ENVELOPE_VERSION, values: {} })) as Prisma.InputJsonValue;
}

export function resolveIntegrationValue(settings: unknown, id: string, envName?: string) {
    const stored = getStoredIntegrationValues(settings)[id];
    if (stored) return stored;
    return envName ? String(process.env[envName] ?? '').trim() : '';
}

export function integrationValueSource(settings: unknown, id: string, envName?: string): 'cms' | 'environment' | 'missing' {
    if (hasStoredIntegrationValue(settings, id)) return 'cms';
    if (envName && String(process.env[envName] ?? '').trim()) return 'environment';
    return 'missing';
}
