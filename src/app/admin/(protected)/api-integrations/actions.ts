'use server';

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import {
    getStoredAssistantApiKeys,
    toAssistantSettingsJson,
    withAssistantApiKey,
} from '@/lib/assistant-credentials';
import {
    getStoredIntegrationValues,
    toIntegrationSettingsJson,
    updateIntegrationValues,
    withIntegrationTest,
    type IntegrationTestRecord,
} from '@/lib/integration-credentials';

export type ApiIntegrationId = 'github' | 'wakatime' | 'openai' | 'groq' | 'gemini' | 'openrouter' | 'r2';
export type ApiActionResult = { ok: boolean; message: string; testedAt?: string; latencyMs?: number };

const allowedFields: Record<ApiIntegrationId, readonly string[]> = {
    github: ['github.apiKey'],
    wakatime: ['wakatime.apiKey'],
    openai: ['openai.apiKey'],
    groq: ['groq.apiKey'],
    gemini: ['gemini.apiKey'],
    openrouter: ['openrouter.apiKey'],
    r2: ['r2.accountId', 'r2.accessKeyId', 'r2.secretAccessKey', 'r2.bucket', 'r2.publicBaseUrl'],
};

const envNames: Record<string, string> = {
    'github.apiKey': 'GITHUB_TOKEN',
    'wakatime.apiKey': 'WAKATIME_API_KEY',
    'openai.apiKey': 'OPENAI_API_KEY',
    'groq.apiKey': 'GROQ_API_KEY',
    'gemini.apiKey': 'GEMINI_API_KEY',
    'openrouter.apiKey': 'OPENROUTER_API_KEY',
    'r2.accountId': 'R2_ACCOUNT_ID',
    'r2.accessKeyId': 'R2_ACCESS_KEY_ID',
    'r2.secretAccessKey': 'R2_SECRET_ACCESS_KEY',
    'r2.bucket': 'R2_BUCKET',
    'r2.publicBaseUrl': 'R2_PUBLIC_BASE_URL',
};

const aiProviders = new Set<ApiIntegrationId>(['openai', 'groq', 'gemini', 'openrouter']);

async function requireApiAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function validIntegrationId(value: string): value is ApiIntegrationId {
    return value in allowedFields;
}

async function loadRuntimeSettings() {
    return prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { integrationSettings: true, assistantSettings: true },
    });
}

function effectiveValues(integrationSettings: unknown, assistantSettings: unknown) {
    const stored = getStoredIntegrationValues(integrationSettings);
    const assistantKeys = getStoredAssistantApiKeys(assistantSettings);
    const values: Record<string, string> = {};

    for (const [field, envName] of Object.entries(envNames)) {
        const provider = field.split('.')[0];
        values[field] = stored[field]
            || (field.endsWith('.apiKey') ? assistantKeys[provider] : '')
            || String(process.env[envName] ?? '').trim();
    }
    return values;
}

function safeValue(value: unknown, max = 2000) {
    return String(value ?? '').trim().slice(0, max);
}

export async function saveApiIntegration(input: {
    id: ApiIntegrationId;
    values: Record<string, string>;
    clearFields?: string[];
}): Promise<ApiActionResult> {
    try {
        await requireApiAdmin();
        if (!validIntegrationId(input.id)) return { ok: false, message: 'Unknown API integration.' };

        const permitted = new Set(allowedFields[input.id]);
        const clearFields = new Set((input.clearFields ?? []).filter((field) => permitted.has(field)));
        const changes: Record<string, string | null> = {};

        for (const field of permitted) {
            if (clearFields.has(field)) {
                changes[field] = null;
                continue;
            }
            const max = field.endsWith('publicBaseUrl') ? 500 : 2000;
            const clean = safeValue(input.values?.[field], max);
            if (clean) changes[field] = clean;
        }

        if (input.id === 'r2') {
            const publicBaseUrl = changes['r2.publicBaseUrl'];
            if (typeof publicBaseUrl === 'string') {
                try {
                    const url = new URL(publicBaseUrl);
                    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid');
                } catch {
                    return { ok: false, message: 'R2 public base URL must be a valid http(s) URL.' };
                }
            }
        }

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true, assistantSettings: true },
        });
        const nextIntegrationSettings = updateIntegrationValues(existing?.integrationSettings, changes);

        let nextAssistantSettings = existing?.assistantSettings;
        if (aiProviders.has(input.id)) {
            const apiField = `${input.id}.apiKey`;
            if (apiField in changes) {
                const current = normalizeAssistantSettings(existing?.assistantSettings);
                nextAssistantSettings = withAssistantApiKey(
                    existing?.assistantSettings,
                    { ...current } as Record<string, unknown>,
                    input.id,
                    typeof changes[apiField] === 'string' ? String(changes[apiField]) : '',
                    changes[apiField] === null,
                );
            }
        }

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                integrationSettings: toIntegrationSettingsJson(nextIntegrationSettings),
                ...(nextAssistantSettings ? { assistantSettings: toAssistantSettingsJson(nextAssistantSettings as Record<string, unknown>) } : {}),
            },
            update: {
                integrationSettings: toIntegrationSettingsJson(nextIntegrationSettings),
                ...(nextAssistantSettings ? { assistantSettings: toAssistantSettingsJson(nextAssistantSettings as Record<string, unknown>) } : {}),
            },
        });

        revalidatePath('/admin/api-integrations');
        revalidatePath('/admin/assistant');
        revalidatePath('/lab');
        revalidatePath('/api/github-proof');
        revalidatePath('/api/github-stats');
        revalidatePath('/api/github-languages');
        revalidatePath('/api/wakatime');
        revalidatePath('/api/wakatime-stats');
        revalidatePath('/api/chat');
        revalidatePath('/admin/media');

        return { ok: true, message: 'Integration credentials saved securely. Run Test connection to verify them.' };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to save API integration.' };
    }
}

async function fetchChecked(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Remote API returned HTTP ${response.status}.`);
    return response;
}

async function runIntegrationTest(id: ApiIntegrationId, values: Record<string, string>): Promise<string> {
    if (id === 'github') {
        const token = values['github.apiKey'];
        if (!token) throw new Error('No GitHub token is configured.');
        const response = await fetchChecked('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Portfolio' },
        });
        const data = await response.json();
        const login = String(data?.login ?? '').trim();
        return login ? `Connected to GitHub as @${login}.` : 'GitHub connection is valid.';
    }

    if (id === 'wakatime') {
        const apiKey = values['wakatime.apiKey'];
        if (!apiKey) throw new Error('No WakaTime API key is configured.');
        const response = await fetchChecked('https://wakatime.com/api/v1/users/current', {
            headers: { Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` },
        });
        const data = await response.json();
        const username = String(data?.data?.username ?? data?.data?.display_name ?? '').trim();
        return username ? `Connected to WakaTime as ${username}.` : 'WakaTime connection is valid.';
    }

    if (id === 'openai') {
        const apiKey = values['openai.apiKey'];
        if (!apiKey) throw new Error('No OpenAI API key is configured.');
        await fetchChecked('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        return 'OpenAI API key is valid and the Models API is reachable.';
    }

    if (id === 'groq') {
        const apiKey = values['groq.apiKey'];
        if (!apiKey) throw new Error('No Groq API key is configured.');
        await fetchChecked('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        return 'Groq API key is valid and the Models API is reachable.';
    }

    if (id === 'gemini') {
        const apiKey = values['gemini.apiKey'];
        if (!apiKey) throw new Error('No Gemini API key is configured.');
        await fetchChecked(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        return 'Google Gemini API key is valid and the Models API is reachable.';
    }

    if (id === 'openrouter') {
        const apiKey = values['openrouter.apiKey'];
        if (!apiKey) throw new Error('No OpenRouter API key is configured.');
        await fetchChecked('https://openrouter.ai/api/v1/auth/key', { headers: { Authorization: `Bearer ${apiKey}` } });
        return 'OpenRouter API key is valid.';
    }

    const accountId = values['r2.accountId'];
    const accessKeyId = values['r2.accessKeyId'];
    const secretAccessKey = values['r2.secretAccessKey'];
    const bucket = values['r2.bucket'];
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error('R2 requires Account ID, Access Key ID, Secret Access Key and Bucket.');
    }

    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
    try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }), { abortSignal: AbortSignal.timeout(10_000) });
    } finally {
        client.destroy();
    }
    return `Cloudflare R2 bucket “${bucket}” is reachable.`;
}

export async function testApiIntegration(id: ApiIntegrationId): Promise<ApiActionResult> {
    const startedAt = Date.now();
    let result: ApiActionResult;
    try {
        await requireApiAdmin();
        if (!validIntegrationId(id)) return { ok: false, message: 'Unknown API integration.' };
        const settings = await loadRuntimeSettings();
        const values = effectiveValues(settings?.integrationSettings, settings?.assistantSettings);
        const message = await runIntegrationTest(id, values);
        result = { ok: true, message, latencyMs: Date.now() - startedAt, testedAt: new Date().toISOString() };
    } catch (error) {
        result = {
            ok: false,
            message: error instanceof Error ? error.message : 'Connection test failed.',
            latencyMs: Date.now() - startedAt,
            testedAt: new Date().toISOString(),
        };
    }

    try {
        const existing = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { integrationSettings: true } });
        const record: IntegrationTestRecord = {
            ok: result.ok,
            message: result.message,
            latencyMs: result.latencyMs,
            testedAt: result.testedAt ?? new Date().toISOString(),
        };
        const next = withIntegrationTest(existing?.integrationSettings, id, record);
        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', integrationSettings: toIntegrationSettingsJson(next) },
            update: { integrationSettings: toIntegrationSettingsJson(next) },
        });
        revalidatePath('/admin/api-integrations');
    } catch {
        // A test result is still useful even if its audit metadata could not be persisted.
    }

    return result;
}
