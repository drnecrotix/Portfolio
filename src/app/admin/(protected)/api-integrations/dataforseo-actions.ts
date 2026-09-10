'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    getStoredIntegrationValues,
    toIntegrationSettingsJson,
    updateIntegrationValues,
    withIntegrationTest,
    withoutIntegrationTest,
    type IntegrationTestRecord,
} from '@/lib/integration-credentials';

export type DataForSeoActionResult = {
    ok: boolean;
    message: string;
    testedAt?: string;
    latencyMs?: number;
};

async function requireApiAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function clean(value: unknown, maxLength: number) {
    return String(value ?? '').trim().slice(0, maxLength);
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

export async function saveDataForSeoIntegration(input: {
    login?: string;
    password?: string;
    clearLogin?: boolean;
    clearPassword?: boolean;
}): Promise<DataForSeoActionResult> {
    try {
        await requireApiAdmin();

        const changes: Record<string, string | null> = {};
        if (input.clearLogin) changes['dataforseo.login'] = null;
        else {
            const login = clean(input.login, 320);
            if (login) changes['dataforseo.login'] = login;
        }

        if (input.clearPassword) changes['dataforseo.password'] = null;
        else {
            const password = clean(input.password, 2000);
            if (password) changes['dataforseo.password'] = password;
        }

        if (Object.keys(changes).length === 0) {
            return { ok: true, message: 'No DataForSEO credential changes were submitted.' };
        }

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const updated = updateIntegrationValues(existing?.integrationSettings, changes);
        const next = withoutIntegrationTest(updated, 'dataforseo');

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', integrationSettings: toIntegrationSettingsJson(next) },
            update: { integrationSettings: toIntegrationSettingsJson(next) },
        });

        revalidatePath('/admin/api-integrations');
        revalidatePath('/seo-intelligence');
        return { ok: true, message: 'DataForSEO credentials saved securely. Run Test connection to verify them.' };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to save DataForSEO credentials.' };
    }
}

export async function testDataForSeoIntegration(): Promise<DataForSeoActionResult> {
    try {
        await requireApiAdmin();
    } catch {
        return { ok: false, message: 'Forbidden' };
    }

    const startedAt = Date.now();
    let result: DataForSeoActionResult;

    try {
        const settings = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const stored = getStoredIntegrationValues(settings?.integrationSettings);
        const login = stored['dataforseo.login'] || String(process.env.DATAFORSEO_LOGIN ?? '').trim();
        const password = stored['dataforseo.password'] || String(process.env.DATAFORSEO_PASSWORD ?? '').trim();

        if (!login || !password) throw new Error('DataForSEO API login and password are required.');

        const response = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(`${login}:${password}`, 'utf8').toString('base64')}`,
                Accept: 'application/json',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`DataForSEO returned HTTP ${response.status}.`);

        const payload = record(await response.json());
        const statusCode = Number(payload.status_code);
        if (statusCode !== 20000) {
            const message = clean(payload.status_message, 300) || `status ${statusCode || 'unknown'}`;
            throw new Error(`DataForSEO rejected the credentials: ${message}.`);
        }

        result = {
            ok: true,
            message: 'DataForSEO credentials are valid. The free account endpoint is reachable.',
            latencyMs: Date.now() - startedAt,
            testedAt: new Date().toISOString(),
        };
    } catch (error) {
        result = {
            ok: false,
            message: error instanceof Error ? error.message : 'DataForSEO connection test failed.',
            latencyMs: Date.now() - startedAt,
            testedAt: new Date().toISOString(),
        };
    }

    try {
        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const testRecord: IntegrationTestRecord = {
            ok: result.ok,
            message: result.message,
            latencyMs: result.latencyMs,
            testedAt: result.testedAt ?? new Date().toISOString(),
        };
        const next = withIntegrationTest(existing?.integrationSettings, 'dataforseo', testRecord);
        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', integrationSettings: toIntegrationSettingsJson(next) },
            update: { integrationSettings: toIntegrationSettingsJson(next) },
        });
        revalidatePath('/admin/api-integrations');
    } catch {
        // The live test result is still useful if test metadata cannot be persisted.
    }

    return result;
}
