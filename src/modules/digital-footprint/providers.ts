import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { resolveMx, resolveTxt } from 'node:dns/promises';
import type { FootprintExposedData, FootprintFinding, FootprintProvider, FootprintRelatedAccount } from './types';
import { extraProviders } from './providers-extra';

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
            return finding({
                provider: 'hibp', category: 'breach', title: String(row.Title || row.Name || 'Data breach'), status: 'found', confidence: 100,
                risk: passwordExposed ? 'critical' : 'high',
                summary: String(row.Description || 'Your verified email appears in this breach.').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                sourceUrl: String(row.Domain || '') ? `https://${String(row.Domain)}` : undefined,
                exposedFields: fields,
                occurredAt: String(row.BreachDate || ''),
                remediation: passwordExposed ? ['Change the affected password everywhere it was reused.', 'Enable multi-factor authentication.'] : ['Review the exposed data and the affected account security settings.'],
            });
        });
    },
};

const holehe: FootprintProvider = {
    id: 'holehe', label: 'Holehe', category: 'account', supports: ['email'],
    configured: () => Boolean(process.env.HOLEHE_API_URL && process.env.HOLEHE_API_TOKEN),
    async check({ email, signal }) {
        if (!process.env.HOLEHE_API_URL || !process.env.HOLEHE_API_TOKEN || !email) return [];
        const base = process.env.HOLEHE_API_URL.replace(/\/+$/, '');
        const response = await fetch(`${base}/scan`, {
            method: 'POST', signal, cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOLEHE_API_TOKEN}` },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error(`Holehe ${response.status}`);
        const payload = await response.json() as {
            results?: Array<Record<string, unknown>> | { used?: string[] };
            found?: number;
        };
        let rows: Array<Record<string, unknown>> = [];
        if (Array.isArray(payload.results)) {
            rows = payload.results.filter((row) => row.exists === true || row.exists === 'true');
        } else if (payload.results && typeof payload.results === 'object' && Array.isArray((payload.results as { used?: string[] }).used)) {
            rows = ((payload.results as { used: string[] }).used).map((name) => ({ name, exists: true }));
        }
        return rows.map((row) => {
            const name = String(row.name || 'Registered service');
            const domain = typeof row.domain === 'string' ? row.domain : undefined;
            const username = typeof row.username === 'string' ? row.username : undefined;
            const exposedData: FootprintExposedData = {
                Service: name,
                Domain: domain || null,
                'Matched email': email,
                'Registration signal': true,
            };
            if (username) exposedData.Username = username;
            if (row.emailrecovery) exposedData['Recovery email (masked)'] = String(row.emailrecovery);
            if (row.phoneNumber) exposedData['Recovery phone (masked)'] = String(row.phoneNumber);
            return finding({
                provider: 'holehe', category: 'account', title: name, status: 'found', confidence: 85, risk: 'low',
                summary: 'This email appears to be registered on the service (registration / recovery signal). Confirm in the app — not proof the account is active.',
                sourceUrl: domain ? `https://${domain}` : undefined,
                exposedFields: ['Account registration signal', 'Service', 'Matched email'],
                exposedData,
                remediation: ['Open the service directly and review or remove the account if it belongs to you.'],
            });
        });
    },
};

const emailRep: FootprintProvider = {
    id: 'emailrep', label: 'EmailRep', category: 'reputation', supports: ['email'],
    configured: () => Boolean(process.env.EMAILREP_API_KEY),
    async check({ email, signal }) {
        if (!process.env.EMAILREP_API_KEY || !email) return [];
        const response = await fetch(`https://emailrep.io/${encodeURIComponent(email)}`, { signal, cache: 'no-store', headers: { Key: process.env.EMAILREP_API_KEY, 'User-Agent': 'NecrotixLab' } });
        if (!response.ok) throw new Error(`EmailRep ${response.status}`);
        const row = await response.json() as Record<string, unknown>;
        const details = row.details && typeof row.details === 'object' ? row.details as Record<string, unknown> : {};
        const suspicious = row.suspicious === true;
        return [finding({
            provider: 'emailrep', category: 'reputation', title: 'Email reputation', status: 'found', confidence: 90, risk: suspicious ? 'high' : 'low',
            summary: `Reputation: ${String(row.reputation || 'unknown')}. Suspicious: ${suspicious ? 'yes' : 'no'}.`,
            exposedFields: Object.entries(details).filter(([, value]) => value === true).map(([key]) => key.replaceAll('_', ' ')).slice(0, 12),
            remediation: suspicious ? ['Review account activity and rotate reused passwords.'] : ['Continue using unique passwords and multi-factor authentication.'],
        })];
    },
};

// Rest of providers: restore from main before merge if this stub is incomplete.
// Temporary: re-export main module surface for typecheck until full file is restored.
export const footprintProviders: FootprintProvider[] = [hibp, emailRep, holehe, ...extraProviders];

export async function runAllProviders(input: Parameters<FootprintProvider['check']>[0]) {
    const out: FootprintFinding[] = [];
    for (const p of footprintProviders) {
        if (!p.configured()) continue;
        try { out.push(...await p.check(input)); } catch { /* ignore */ }
    }
    return out;
}
