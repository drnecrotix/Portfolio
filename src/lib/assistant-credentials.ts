import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';

const PRIVATE_FIELD = '__aiCredentials';
const ENVELOPE_VERSION = 1;

type JsonRecord = Record<string, Prisma.JsonValue>;
type CredentialVault = {
    version: number;
    keys: Record<string, string>;
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function secretKey() {
    const secret = process.env.AI_CREDENTIALS_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AI_CREDENTIALS_SECRET or AUTH_SECRET is required before API keys can be stored in the CMS.');
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

function readVault(value: unknown): CredentialVault {
    const raw = record(value);
    const keysRaw = record(raw.keys);
    const keys = Object.fromEntries(
        Object.entries(keysRaw)
            .filter(([, stored]) => typeof stored === 'string' && stored.length > 0)
            .map(([id, stored]) => [id, String(stored)]),
    );
    return { version: ENVELOPE_VERSION, keys };
}

export function assistantSettingsRecord(value: unknown): Record<string, unknown> {
    return { ...record(value) };
}

export function getStoredAssistantApiKeys(value: unknown): Record<string, string> {
    const raw = record(value);
    const vault = readVault(raw[PRIVATE_FIELD]);
    const resolved: Record<string, string> = {};
    for (const [providerId, stored] of Object.entries(vault.keys)) {
        const apiKey = decrypt(stored);
        if (apiKey) resolved[providerId] = apiKey;
    }
    return resolved;
}

export function hasStoredAssistantApiKey(value: unknown, providerId: string) {
    const raw = record(value);
    const vault = readVault(raw[PRIVATE_FIELD]);
    return Boolean(vault.keys[providerId]);
}

export function resolveAssistantApiKey(value: unknown, providerId: string, envName: string) {
    const stored = getStoredAssistantApiKeys(value)[providerId];
    return stored || process.env[envName] || '';
}

export function mergeAssistantPrivateFields(existing: unknown, nextPublicSettings: Record<string, unknown>) {
    const current = record(existing);
    const privateValue = current[PRIVATE_FIELD];
    return privateValue ? { ...nextPublicSettings, [PRIVATE_FIELD]: privateValue } : { ...nextPublicSettings };
}

export function withAssistantApiKey(existing: unknown, publicSettings: Record<string, unknown>, providerId: string, apiKey: string, clear: boolean) {
    const current = record(existing);
    const vault = readVault(current[PRIVATE_FIELD]);
    const keys = { ...vault.keys };

    if (clear) delete keys[providerId];
    else if (apiKey.trim()) keys[providerId] = encrypt(apiKey.trim());

    const result: Record<string, unknown> = { ...publicSettings };
    if (Object.keys(keys).length) result[PRIVATE_FIELD] = { version: ENVELOPE_VERSION, keys };
    return result;
}

export function toAssistantSettingsJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function maskApiKey(value: string) {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
