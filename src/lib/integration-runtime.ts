import 'server-only';

import { prisma } from '@/lib/prisma';
import { getStoredAssistantApiKeys } from '@/lib/assistant-credentials';
import { getStoredIntegrationValues } from '@/lib/integration-credentials';

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

async function loadSettings() {
    try {
        return await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true, assistantSettings: true, socialLinks: true },
        });
    } catch {
        return null;
    }
}

export async function getRuntimeIntegrationValue(field: string, envName: string, assistantProvider?: string) {
    const settings = await loadSettings();
    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    if (stored[field]) return stored[field];

    if (assistantProvider) {
        const assistantKeys = getStoredAssistantApiKeys(settings?.assistantSettings);
        if (assistantKeys[assistantProvider]) return assistantKeys[assistantProvider];
    }

    return String(process.env[envName] ?? '').trim();
}

export async function getRuntimeGithubConfig() {
    const settings = await loadSettings();
    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    const socialLinks = record(settings?.socialLinks);
    const token = stored['github.apiKey'] || String(process.env.GITHUB_TOKEN ?? '').trim();
    const username = stored['github.username']
        || String(process.env.GITHUB_USERNAME ?? '').trim()
        || githubUsernameFromUrl(socialLinks.github);

    return { token, username };
}

export async function getRuntimeAiApiKeys() {
    const settings = await loadSettings();
    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    const assistantKeys = getStoredAssistantApiKeys(settings?.assistantSettings);

    return {
        openai: stored['openai.apiKey'] || assistantKeys.openai || String(process.env.OPENAI_API_KEY ?? '').trim(),
        groq: stored['groq.apiKey'] || assistantKeys.groq || String(process.env.GROQ_API_KEY ?? '').trim(),
        gemini: stored['gemini.apiKey'] || assistantKeys.gemini || String(process.env.GEMINI_API_KEY ?? '').trim(),
        openrouter: stored['openrouter.apiKey'] || assistantKeys.openrouter || String(process.env.OPENROUTER_API_KEY ?? '').trim(),
    };
}

export async function getRuntimeR2Config() {
    const settings = await loadSettings();
    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    return {
        accountId: stored['r2.accountId'] || String(process.env.R2_ACCOUNT_ID ?? '').trim(),
        accessKeyId: stored['r2.accessKeyId'] || String(process.env.R2_ACCESS_KEY_ID ?? '').trim(),
        secretAccessKey: stored['r2.secretAccessKey'] || String(process.env.R2_SECRET_ACCESS_KEY ?? '').trim(),
        bucket: stored['r2.bucket'] || String(process.env.R2_BUCKET ?? '').trim(),
        publicBaseUrl: stored['r2.publicBaseUrl'] || String(process.env.R2_PUBLIC_BASE_URL ?? '').trim(),
    };
}
