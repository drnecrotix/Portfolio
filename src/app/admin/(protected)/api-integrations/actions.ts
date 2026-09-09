'use server';

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import { resolveCreemEnvironment } from '@/lib/creem';
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
    withoutIntegrationTest,
    type IntegrationTestRecord,
} from '@/lib/integration-credentials';

export type ApiIntegrationId = 'github' | 'wakatime' | 'openai' | 'groq' | 'gemini' | 'openrouter' | 'r2' | 'lemonsqueezy' | 'creem' | 'smtp' | 'hibp' | 'holehe' | 'emailrep' | 'leakcheck' | 'dehashed';
export type ApiActionResult = { ok: boolean; message: string; testedAt?: string; latencyMs?: number };

const allowedFields: Record<ApiIntegrationId, readonly string[]> = {
    github: ['github.username', 'github.apiKey'],
    wakatime: ['wakatime.apiKey'],
    openai: ['openai.apiKey'],
    groq: ['groq.apiKey'],
    gemini: ['gemini.apiKey'],
    openrouter: ['openrouter.apiKey'],
    r2: ['r2.accountId', 'r2.accessKeyId', 'r2.secretAccessKey', 'r2.bucket', 'r2.storeBucket', 'r2.publicBaseUrl'],
    lemonsqueezy: ['lemonsqueezy.apiKey', 'lemonsqueezy.storeId', 'lemonsqueezy.webhookSecret'],
    creem: ['creem.apiKey', 'creem.webhookSecret'],
    smtp: ['smtp.user', 'smtp.password', 'smtp.host', 'smtp.port', 'smtp.secure'],
    hibp: ['hibp.apiKey'],
    holehe: ['holehe.apiUrl', 'holehe.apiToken'],
    emailrep: ['emailrep.apiKey'],
    leakcheck: ['leakcheck.apiKey'],
    dehashed: ['dehashed.email', 'dehashed.apiKey'],
};

const envNames: Record<string, string> = {
    'github.username': 'GITHUB_USERNAME',
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
    'r2.storeBucket': 'R2_STORE_BUCKET',
    'r2.publicBaseUrl': 'R2_PUBLIC_BASE_URL',
    'lemonsqueezy.apiKey': 'LEMON_SQUEEZY_API_KEY',
    'lemonsqueezy.storeId': 'LEMON_SQUEEZY_STORE_ID',
    'lemonsqueezy.webhookSecret': 'LEMON_SQUEEZY_WEBHOOK_SECRET',
    'creem.apiKey': 'CREEM_API_KEY',
    'creem.webhookSecret': 'CREEM_WEBHOOK_SECRET',
    'smtp.user': 'EMAIL_USER',
    'smtp.password': 'EMAIL_APP_PASSWORD',
    'smtp.host': 'SMTP_HOST',
    'smtp.port': 'SMTP_PORT',
    'smtp.secure': 'SMTP_SECURE',
    'hibp.apiKey': 'HIBP_API_KEY',
    'holehe.apiUrl': 'HOLEHE_API_URL',
    'holehe.apiToken': 'HOLEHE_API_TOKEN',
    'emailrep.apiKey': 'EMAILREP_API_KEY',
    'leakcheck.apiKey': 'LEAKCHECK_API_KEY',
    'dehashed.email': 'DEHASHED_EMAIL',
    'dehashed.apiKey': 'DEHASHED_API_KEY',
};

const aiProviders = new Set<ApiIntegrationId>(['openai', 'groq', 'gemini', 'openrouter']);

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function githubUsernameFromUrl(value: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        if (!/(^|\.)github\.com$/i.test(url.hostname)) return '';
        return url.pathname.split('/').filter(Boolean)[0] ?? '';
    } catch {
        return '';
    }
}

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
        select: { integrationSettings: true, assistantSettings: true, socialLinks: true },
    });
}

function effectiveValues(integrationSettings: unknown, assistantSettings: unknown, socialLinks?: unknown) {
    const stored = getStoredIntegrationValues(integrationSettings);
    const assistantKeys = getStoredAssistantApiKeys(assistantSettings);
    const values: Record<string, string> = {};

    for (const [field, envName] of Object.entries(envNames)) {
        const provider = field.split('.')[0];
        values[field] = stored[field]
            || (field.endsWith('.apiKey') ? assistantKeys[provider] : '')
            || String(process.env[envName] ?? '').trim();
    }
    if (!values['github.username']) values['github.username'] = githubUsernameFromUrl(record(socialLinks).github);
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

        if (input.id === 'creem' && typeof changes['creem.apiKey'] === 'string') {
            try {
                resolveCreemEnvironment(changes['creem.apiKey']);
            } catch (error) {
                return { ok: false, message: error instanceof Error ? error.message : 'Invalid Creem API key.' };
            }
        }

        if (input.id === 'smtp') {
            const portValue = changes['smtp.port'];
            if (typeof portValue === 'string') {
                const port = Number(portValue);
                if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, message: 'SMTP port must be an integer from 1 to 65535.' };
            }
            const secureValue = changes['smtp.secure'];
            if (typeof secureValue === 'string' && !['true', 'false'].includes(secureValue.toLowerCase())) return { ok: false, message: 'SMTP secure must be true or false.' };
        }

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true, assistantSettings: true },
        });
        const updatedIntegrationSettings = updateIntegrationValues(existing?.integrationSettings, changes);
        const nextIntegrationSettings = Object.keys(changes).length > 0
            ? withoutIntegrationTest(updatedIntegrationSettings, input.id)
            : updatedIntegrationSettings;

        let nextAssistantSettings: unknown = existing?.assistantSettings;
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

        const assistantSettingsJson = nextAssistantSettings
            ? toAssistantSettingsJson(nextAssistantSettings as Record<string, unknown>)
            : undefined;

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: {
                id: 'default',
                integrationSettings: toIntegrationSettingsJson(nextIntegrationSettings),
                ...(assistantSettingsJson ? { assistantSettings: assistantSettingsJson } : {}),
            },
            update: {
                integrationSettings: toIntegrationSettingsJson(nextIntegrationSettings),
                ...(assistantSettingsJson ? { assistantSettings: assistantSettingsJson } : {}),
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
        revalidatePath('/admin/store');
        revalidatePath('/digital-footprint');

        return { ok: true, message: Object.keys(changes).length > 0 ? 'Integration credentials saved securely. Run Test connection to verify them.' : 'No credential changes were submitted.' };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to save API integration.' };
    }
}

async function fetchChecked(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Remote API returned HTTP ${response.status}.`);
    return response;
}

async function testGitHub(values: Record<string, string>) {
    const token = values['github.apiKey'];
    let username = values['github.username'];

    if (token) {
        const userResponse = await fetchChecked('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Portfolio' },
        });
        const userData = await userResponse.json();
        username = username || String(userData?.login ?? '').trim();
    }

    if (!username) throw new Error('No GitHub username is configured. Set it here or in Site Settings → Social links.');

    if (token) {
        const query = `query LabConnection($login: String!) { user(login: $login) { login repositories(first: 1, isFork: false, privacy: PUBLIC) { totalCount nodes { name } } } }`;
        try {
            const response = await fetchChecked('https://api.github.com/graphql', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'NecrotixLab-Portfolio' },
                body: JSON.stringify({ query, variables: { login: username } }),
            });
            const data = await response.json();
            const user = data?.data?.user;
            if (!Array.isArray(data?.errors) && user) {
                const count = Number(user?.repositories?.totalCount ?? 0);
                if (count > 0) return `GitHub Lab connection is healthy for @${String(user.login ?? username)}. GraphQL can see ${count} public repositories.`;
            }
        } catch {
            // REST fallback is tested below.
        }
    }

    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Portfolio' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetchChecked(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=1&type=owner&sort=updated`, { headers });
    const repos = await response.json();
    if (!Array.isArray(repos)) throw new Error('GitHub public repositories response is invalid.');
    return token
        ? `GitHub is connected as @${username}. Lab GraphQL is unavailable for this token, but the public REST fallback is healthy.`
        : `GitHub public REST data is healthy for @${username}. No token is required for the Lab fallback; adding one enables richer GraphQL detection and a higher rate limit.`;
}

async function runIntegrationTest(id: ApiIntegrationId, values: Record<string, string>): Promise<string> {
    if (id === 'github') return testGitHub(values);

    if (id === 'smtp') {
        const user = values['smtp.user'];
        const password = values['smtp.password'];
        const host = values['smtp.host'] || 'smtp.gmail.com';
        const port = Number(values['smtp.port'] || 465);
        const secure = (values['smtp.secure'] || 'true').toLowerCase() === 'true';
        if (!user || !password || !host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP requires a user, app password, valid host and port.');
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass: password } });
        await transporter.verify();
        transporter.close();
        return `SMTP authentication is valid for ${user}.`;
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

    if (id === 'creem') {
        const apiKey = values['creem.apiKey'];
        if (!apiKey) throw new Error('No Creem API key is configured.');
        const environment = resolveCreemEnvironment(apiKey);
        const response = await fetchChecked(`${environment.baseUrl}/v1/products/search?page_number=1&page_size=1`, {
            headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        });
        const data = await response.json();
        const count = Number(data?.pagination?.total_records ?? 0);
        const webhookNote = values['creem.webhookSecret'] ? ' Webhook secret is configured.' : ' Add the webhook secret before testing paid delivery.';
        return `Connected to Creem ${environment.mode} mode. ${count} product${count === 1 ? '' : 's'} available.${webhookNote}`;
    }

    if (id === 'lemonsqueezy') {
        const apiKey = values['lemonsqueezy.apiKey'];
        const storeId = values['lemonsqueezy.storeId'];
        const webhookSecret = values['lemonsqueezy.webhookSecret'];
        if (!apiKey || !storeId || !webhookSecret) throw new Error('Lemon Squeezy requires API Key, Store ID and Webhook Secret.');
        const response = await fetchChecked(`https://api.lemonsqueezy.com/v1/stores/${encodeURIComponent(storeId)}`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' },
        });
        const data = await response.json();
        const storeName = String(data?.data?.attributes?.name ?? '').trim();
        return storeName ? `Connected to Lemon Squeezy store “${storeName}”.` : `Lemon Squeezy store ${storeId} is reachable.`;
    }

    if (id === 'hibp') {
        const apiKey = values['hibp.apiKey'];
        if (!apiKey) throw new Error('Have I Been Pwned API key is required.');
        const response = await fetch('https://haveibeenpwned.com/api/v3/breachedaccount/test%40example.com?truncateResponse=true', {
            headers: { 'hibp-api-key': apiKey, 'user-agent': 'NecrotixLab-Admin-Test' },
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401 || response.status === 403) throw new Error('HIBP rejected the API key.');
        if (response.status === 429) throw new Error('HIBP rate limit — key is likely valid, try again later.');
        if (response.status !== 404 && response.status !== 200) {
            throw new Error(`HIBP returned HTTP ${response.status}.`);
        }
        return 'Have I Been Pwned API key is accepted.';
    }

    if (id === 'holehe') {
        const base = (values['holehe.apiUrl'] || '').replace(/\/+$/, '');
        const token = values['holehe.apiToken'];
        if (!base || !token) throw new Error('Holehe API URL and token are required.');
        const health = await fetchChecked(`${base}/health`);
        const payload = await health.json().catch(() => ({})) as Record<string, unknown>;
        if (payload.ok !== true) throw new Error('Holehe health endpoint did not return ok: true.');
        const scan = await fetch(`${base}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email: 'holehe-admin-test@example.com' }),
            signal: AbortSignal.timeout(60_000),
            cache: 'no-store',
        });
        if (scan.status === 401 || scan.status === 403) throw new Error('Holehe rejected the API token.');
        if (scan.status === 504) return 'Holehe is reachable (scan timed out on cold start — normal).';
        if (!scan.ok && scan.status !== 404) {
            const detail = await scan.text().catch(() => '');
            throw new Error(`Holehe scan probe failed (HTTP ${scan.status}). ${detail.slice(0, 120)}`);
        }
        const body = await scan.json().catch(() => ({})) as Record<string, unknown>;
        const checked = Number(body.checked || 0);
        return checked
            ? `Holehe sidecar is reachable · ${checked} modules loaded.`
            : 'Holehe sidecar is reachable and accepted the token.';
    }

    if (id === 'emailrep') {
        const apiKey = values['emailrep.apiKey'];
        if (!apiKey) throw new Error('EmailRep API key is required.');
        await fetchChecked('https://emailrep.io/test@example.com', {
            headers: { Key: apiKey, 'User-Agent': 'NecrotixLab-Admin-Test' },
        });
        return 'EmailRep API key is accepted.';
    }

    if (id === 'leakcheck') {
        const apiKey = values['leakcheck.apiKey'];
        if (!apiKey) throw new Error('LeakCheck Pro API key is required.');
        const response = await fetch('https://leakcheck.io/api/v2/query/test@example.com', {
            headers: { Accept: 'application/json', 'X-API-Key': apiKey, 'User-Agent': 'NecrotixLab-Admin-Test' },
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401 || response.status === 403) throw new Error('LeakCheck Pro rejected the API key.');
        if (response.status === 429) return 'LeakCheck Pro is reachable. The connection test was rate-limited.';
        if (response.status !== 404 && !response.ok) throw new Error(`LeakCheck Pro returned HTTP ${response.status}.`);
        return 'LeakCheck Pro API key is accepted.';
    }

    if (id === 'dehashed') {
        const email = values['dehashed.email'];
        const apiKey = values['dehashed.apiKey'];
        if (!email || !apiKey) throw new Error('DeHashed account email and API key are required.');
        const response = await fetch('https://api.dehashed.com/v2/search', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`,
                'User-Agent': 'NecrotixLab-Admin-Test',
            },
            body: JSON.stringify({ query: 'email:test@example.com', page: 1, size: 1, wildcard: false, regex: false, de_duplicate: true }),
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401 || response.status === 403) throw new Error('DeHashed rejected the configured credentials.');
        if (response.status === 429) return 'DeHashed is reachable. The connection test was rate-limited.';
        if (!response.ok) throw new Error(`DeHashed returned HTTP ${response.status}.`);
        return 'DeHashed credentials are accepted and the Search API is reachable.';
    }

    if (id === 'r2') {
        const accountId = values['r2.accountId'];
        const accessKeyId = values['r2.accessKeyId'];
        const secretAccessKey = values['r2.secretAccessKey'];
        const bucket = values['r2.bucket'];
        const storeBucket = values['r2.storeBucket'];
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
            if (storeBucket && storeBucket !== bucket) {
                await client.send(new HeadBucketCommand({ Bucket: storeBucket }), { abortSignal: AbortSignal.timeout(10_000) });
            }
        } finally {
            client.destroy();
        }
        return storeBucket
            ? `Cloudflare R2 media bucket “${bucket}” and private Store bucket “${storeBucket}” are reachable.`
            : `Cloudflare R2 bucket “${bucket}” is reachable. Configure a separate private Store bucket before publishing downloadable products.`;
    }

    throw new Error(`Unsupported integration: ${id}`);
}

export async function testApiIntegration(id: ApiIntegrationId): Promise<ApiActionResult> {
    try {
        await requireApiAdmin();
    } catch {
        return { ok: false, message: 'Forbidden' };
    }
    if (!validIntegrationId(id)) return { ok: false, message: 'Unknown API integration.' };

    const startedAt = Date.now();
    let result: ApiActionResult;
    try {
        const settings = await loadRuntimeSettings();
        const values = effectiveValues(settings?.integrationSettings, settings?.assistantSettings, settings?.socialLinks);
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
