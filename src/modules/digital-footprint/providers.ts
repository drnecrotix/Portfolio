import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { resolveMx, resolveTxt } from 'node:dns/promises';
import type { FootprintFinding, FootprintProvider } from './types';

function finding(input: Omit<FootprintFinding, 'id'>): FootprintFinding {
    return { id: randomUUID(), ...input };
}

const hibp: FootprintProvider = {
    id: 'hibp', label: 'Have I Been Pwned', category: 'breach',
    configured: () => Boolean(process.env.HIBP_API_KEY),
    async check({ email, signal }) {
        if (!process.env.HIBP_API_KEY) return [];
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
    id: 'holehe', label: 'Holehe', category: 'account',
    configured: () => Boolean(process.env.HOLEHE_API_URL && process.env.HOLEHE_API_TOKEN),
    async check({ email, signal }) {
        if (!process.env.HOLEHE_API_URL || !process.env.HOLEHE_API_TOKEN) return [];
        const response = await fetch(new URL('/scan', process.env.HOLEHE_API_URL), {
            method: 'POST', signal, cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOLEHE_API_TOKEN}` },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error(`Holehe ${response.status}`);
        const payload = await response.json() as { results?: Array<Record<string, unknown>> };
        return (payload.results || []).filter((row) => row.exists === true).map((row) => finding({
            provider: 'holehe', category: 'account', title: String(row.name || 'Registered service'), status: 'found', confidence: 85, risk: 'low',
            summary: 'The verified email appears to be recognized by this service. This is a lead, not proof that the account is active.',
            sourceUrl: typeof row.domain === 'string' ? `https://${row.domain}` : undefined,
            exposedFields: ['Account registration signal'],
            remediation: ['Open the service directly and review or remove the account if it belongs to you.'],
        }));
    },
};

const emailRep: FootprintProvider = {
    id: 'emailrep', label: 'EmailRep', category: 'reputation',
    configured: () => Boolean(process.env.EMAILREP_API_KEY),
    async check({ email, signal }) {
        if (!process.env.EMAILREP_API_KEY) return [];
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

const gravatar: FootprintProvider = {
    id: 'gravatar', label: 'Gravatar', category: 'account', configured: () => true,
    async check({ email, signal }) {
        const digest = createHash('sha256').update(email).digest('hex');
        const response = await fetch(`https://api.gravatar.com/v3/profiles/${digest}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Gravatar ${response.status}`);
        const row = await response.json() as Record<string, unknown>;
        const profileUrl = typeof row.profile_url === 'string' ? row.profile_url : undefined;
        return [finding({ provider: 'gravatar', category: 'account', title: 'Public Gravatar profile', status: 'found', confidence: 100, risk: 'low', summary: 'A public Gravatar profile is associated with the verified email hash.', sourceUrl: profileUrl, exposedFields: ['Profile image', 'Display name', 'Profile metadata'], remediation: ['Review the public fields in your Gravatar profile.'] })];
    },
};

const github: FootprintProvider = {
    id: 'github', label: 'GitHub', category: 'account', configured: () => true,
    async check({ email, signal }) {
        const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Digital-Footprint' };
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(`${email} in:email`)}`, { signal, cache: 'no-store', headers });
        if (!response.ok) throw new Error(`GitHub ${response.status}`);
        const payload = await response.json() as { items?: Array<{ login?: string; html_url?: string }> };
        return (payload.items || []).slice(0, 5).map((row) => finding({ provider: 'github', category: 'account', title: `GitHub @${row.login || 'profile'}`, status: 'found', confidence: 95, risk: 'low', summary: 'This GitHub account publicly exposes the verified email in searchable profile data.', sourceUrl: row.html_url, exposedFields: ['Email', 'Username', 'Public repositories'], remediation: ['Remove the public email from GitHub profile settings if you do not want it searchable.'] }));
    },
};

const domain: FootprintProvider = {
    id: 'domain', label: 'Mail domain posture', category: 'domain', configured: () => true,
    async check({ email }) {
        const domainName = email.split('@')[1];
        if (!domainName) return [];
        const [mx, txt] = await Promise.all([resolveMx(domainName).catch(() => []), resolveTxt(domainName).catch(() => [])]);
        const records = txt.map((parts) => parts.join(''));
        const spf = records.some((value) => value.startsWith('v=spf1'));
        const dmarc = await resolveTxt(`_dmarc.${domainName}`).then((rows) => rows.flat().join('').startsWith('v=DMARC1')).catch(() => false);
        return [finding({ provider: 'dns', category: 'domain', title: domainName, status: 'found', confidence: 100, risk: mx.length === 0 || !spf || !dmarc ? 'medium' : 'low', summary: `MX: ${mx.length ? 'present' : 'missing'} · SPF: ${spf ? 'present' : 'missing'} · DMARC: ${dmarc ? 'present' : 'missing'}`, exposedFields: ['Mail provider configuration', 'SPF policy', 'DMARC policy'], remediation: !spf || !dmarc ? ['Ask the domain administrator to configure SPF and DMARC.'] : ['Mail authentication records are present.'] })];
    },
};

const publicProfiles: FootprintProvider = {
    id: 'public-profiles', label: 'Public profiles', category: 'account', configured: () => true,
    async check({ usernames, signal }) {
        const services = [
            { name: 'GitHub', url: (username: string) => `https://github.com/${encodeURIComponent(username)}` },
            { name: 'Reddit', url: (username: string) => `https://www.reddit.com/user/${encodeURIComponent(username)}/about.json` },
            { name: 'DEV Community', url: (username: string) => `https://dev.to/${encodeURIComponent(username)}` },
            { name: 'Keybase', url: (username: string) => `https://keybase.io/${encodeURIComponent(username)}` },
        ];
        const checks = usernames.flatMap((username) => services.map(async (service) => {
            const url = service.url(username);
            const response = await fetch(url, { signal, cache: 'no-store', redirect: 'follow', headers: { 'User-Agent': 'NecrotixLab-Digital-Footprint' } }).catch(() => null);
            if (!response?.ok) return null;
            return finding({ provider: 'public-profiles', category: 'account', title: `${service.name} @${username}`, status: 'found', confidence: 75, risk: 'info', summary: 'A public URL responded for this self-declared username. Review the profile to confirm it is yours.', sourceUrl: service.name === 'Reddit' ? `https://www.reddit.com/user/${encodeURIComponent(username)}` : url, exposedFields: ['Username', 'Public profile'], remediation: ['Review the profile privacy settings and remove details you no longer want public.'] });
        }));
        return (await Promise.all(checks)).filter((value): value is FootprintFinding => value !== null);
    },
};

export const footprintProviders: FootprintProvider[] = [hibp, holehe, emailRep, gravatar, github, domain, publicProfiles];

export async function runFootprintProviders(email: string, usernames: string[]) {
    const results = await Promise.all(footprintProviders.map(async (provider) => {
        if (!provider.configured()) return { provider, findings: [] as FootprintFinding[], available: false };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);
        try {
            return { provider, findings: await provider.check({ email, usernames, signal: controller.signal }), available: true };
        } catch {
            return { provider, findings: [finding({ provider: provider.id, category: provider.category, title: `${provider.label} unavailable`, status: 'unavailable', confidence: 0, risk: 'info', summary: 'This provider did not return a usable result during the scan.', remediation: ['Try this provider again later.'] })], available: true };
        } finally {
            clearTimeout(timeout);
        }
    }));
    return {
        findings: results.flatMap((result) => result.findings),
        providersChecked: results.length,
        providersAvailable: results.filter((result) => result.available).length,
    };
}

export function calculateRiskScore(findings: FootprintFinding[]) {
    const weights = { info: 1, low: 5, medium: 15, high: 28, critical: 45 } as const;
    return Math.min(100, findings.filter((item) => item.status === 'found').reduce((total, item) => total + weights[item.risk], 0));
}
