import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { resolveMx, resolveTxt } from 'node:dns/promises';
import type { FootprintExposedData, FootprintFinding, FootprintProvider, FootprintRelatedAccount } from './types';

function finding(input: Omit<FootprintFinding, 'id'>): FootprintFinding {
    return { id: randomUUID(), ...input };
}

function pickExposed(data: Record<string, unknown>, keys: Array<[string, string]>): FootprintExposedData {
    const out: FootprintExposedData = {};
    for (const [src, label] of keys) {
        const value = data[src];
        if (value === undefined || value === null || value === '') continue;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out[label] = value;
    }
    return out;
}

function asExposed(data: FootprintExposedData): FootprintExposedData | undefined {
    return Object.keys(data).length ? data : undefined;
}

const hibp: FootprintProvider = {
    id: 'hibp', label: 'Have I Been Pwned', category: 'breach', supports: ['email'],
    configured: () => Boolean(process.env.HIBP_API_KEY),
    async check({ email, signal }) {
        if (!process.env.HIBP_API_KEY || !email) return [];
        const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
            signal,
            headers: { 'hibp-api-key': process.env.HIBP_API_KEY, 'user-agent': 'NecrotixLab-Digital-Footprint' },
            cache: 'no-store',
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'hibp', category: 'breach', title: 'HIBP rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`HIBP ${response.status}`);
        const rows = await response.json() as Array<Record<string, unknown>>;
        return rows.map((row) => {
            const fields = Array.isArray(row.DataClasses) ? row.DataClasses.map(String) : [];
            const passwordExposed = fields.some((value) => /password/i.test(value));
            const exposedData = asExposed({
                Breach: String(row.Title || row.Name || ''),
                Domain: row.Domain ? String(row.Domain) : undefined,
                'Breach date': row.BreachDate ? String(row.BreachDate) : undefined,
                'Added date': row.AddedDate ? String(row.AddedDate) : undefined,
                'Records reported': typeof row.PwnCount === 'number' ? row.PwnCount : undefined,
                Verified: typeof row.IsVerified === 'boolean' ? row.IsVerified : undefined,
                Sensitive: typeof row.IsSensitive === 'boolean' ? row.IsSensitive : undefined,
                Fabricated: typeof row.IsFabricated === 'boolean' ? row.IsFabricated : undefined,
                Retired: typeof row.IsRetired === 'boolean' ? row.IsRetired : undefined,
                'Spam list': typeof row.IsSpamList === 'boolean' ? row.IsSpamList : undefined,
                'Data classes': fields.length ? fields.join(', ') : undefined,
                'Matched email': email,
            });
            return finding({
                provider: 'hibp', category: 'breach', title: String(row.Title || row.Name || 'Data breach'), status: 'found', confidence: 100,
                risk: passwordExposed ? 'critical' : 'high',
                summary: String(row.Description || 'Your verified email appears in this breach.').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                sourceUrl: String(row.Domain || '') ? `https://${String(row.Domain)}` : undefined,
                exposedFields: fields,
                exposedData,
                occurredAt: String(row.BreachDate || ''),
                remediation: passwordExposed ? ['Change the affected password everywhere it was reused.', 'Enable multi-factor authentication.'] : ['Review the exposed data and the affected account security settings.'],
            });
        });
    },
};
