import 'server-only';

import { prisma } from '@/lib/prisma';
import { getStoredIntegrationValues } from '@/lib/integration-credentials';

/**
 * Resolve a Digital Footprint credential: environment first, then API Integrations CMS vault.
 */
export async function resolveFootprintCredential(field: string, envName: string): Promise<string> {
    const fromEnv = String(process.env[envName] ?? '').trim();
    if (fromEnv) return fromEnv;
    try {
        const settings = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const stored = getStoredIntegrationValues(settings?.integrationSettings);
        return String(stored[field] ?? '').trim();
    } catch {
        return '';
    }
}

export async function resolveHoleheConfig(): Promise<{ url: string; token: string }> {
    const [url, token] = await Promise.all([
        resolveFootprintCredential('holehe.apiUrl', 'HOLEHE_API_URL'),
        resolveFootprintCredential('holehe.apiToken', 'HOLEHE_API_TOKEN'),
    ]);
    return { url: url.replace(/\/+$/, ''), token };
}
