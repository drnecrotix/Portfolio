import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { resolveMx, resolveTxt } from 'node:dns/promises';
import type { FootprintExposedData, FootprintFinding, FootprintProvider, FootprintRelatedAccount } from './types';
import { publicProfiles } from './public-profiles';

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

const holehe: FootprintProvider = {
    id: 'holehe', label: 'Holehe', category: 'account', supports: ['email'],
    configured: () => Boolean(process.env.HOLEHE_API_URL && process.env.HOLEHE_API_TOKEN),
    async check({ email, signal }) {
        if (!process.env.HOLEHE_API_URL || !process.env.HOLEHE_API_TOKEN || !email) return [];
        const response = await fetch(new URL('/scan', process.env.HOLEHE_API_URL), {
            method: 'POST', signal, cache: 'no-store',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HOLEHE_API_TOKEN}` },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) throw new Error(`Holehe ${response.status}`);
        const payload = await response.json() as { results?: Array<Record<string, unknown>> };
        return (payload.results || []).filter((row) => row.exists === true).map((row) => {
            const name = String(row.name || 'Registered service');
            const domain = typeof row.domain === 'string' ? row.domain : undefined;
            const exposedData = asExposed({
                Service: name,
                Domain: domain,
                'Matched email': email,
                'Registration signal': true,
                Username: typeof row.username === 'string' ? row.username : email.split('@')[0],
            });
            return finding({
                provider: 'holehe', category: 'account', title: name, status: 'found', confidence: 85, risk: 'low',
                summary: 'The verified email appears to be recognized by this service. This is a lead, not proof that the account is active.',
                sourceUrl: domain ? `https://${domain}` : undefined,
                exposedFields: ['Account registration signal', 'Service', 'Matched email'],
                exposedData,
                remediation: ['Open the service directly and review or remove the account if it is unused.'],
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
        const trueFlags = Object.entries(details).filter(([, value]) => value === true).map(([key]) => key.replaceAll('_', ' '));
        const exposedData: FootprintExposedData = {
            Email: email,
            Reputation: String(row.reputation || 'unknown'),
            Suspicious: suspicious,
            ...pickExposed(details, [
                ['credentials_leaked', 'Credentials leaked'],
                ['data_breach', 'Seen in data breach'],
                ['malicious_activity', 'Malicious activity'],
                ['first_seen', 'First seen'],
                ['last_seen', 'Last seen'],
                ['days_since_domain_creation', 'Domain age (days)'],
                ['free_provider', 'Free provider'],
                ['disposable', 'Disposable'],
                ['deliverable', 'Deliverable'],
                ['spoofable', 'Spoofable'],
                ['spam', 'Spam'],
                ['profiles', 'Linked profiles'],
            ]),
        };
        if (trueFlags.length) exposedData['Positive signals'] = trueFlags.join(', ');
        return [finding({
            provider: 'emailrep', category: 'reputation', title: 'Email reputation', status: 'found', confidence: 90, risk: suspicious ? 'high' : 'low',
            summary: `Reputation: ${String(row.reputation || 'unknown')}. Suspicious: ${suspicious ? 'yes' : 'no'}.`,
            exposedFields: trueFlags.slice(0, 12),
            exposedData: asExposed(exposedData),
            remediation: suspicious ? ['Treat unsolicited mail carefully and rotate credentials used with this address.'] : ['No strong negative reputation signal was returned.'],
        })];
    },
};

const gravatar: FootprintProvider = {
    id: 'gravatar', label: 'Gravatar', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
        const response = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`, { signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' } });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Gravatar ${response.status}`);
        const row = await response.json() as Record<string, unknown>;
        const profileUrl = typeof row.profile_url === 'string' ? row.profile_url : `https://gravatar.com/${hash}`;
        const exposedData = pickExposed(row, [['display_name', 'Display name'], ['description', 'Bio'], ['location', 'Location'], ['job_title', 'Job title'], ['company', 'Company'], ['profile_url', 'Profile URL'], ['username', 'Username']]);
        if (typeof row.avatar_url === 'string') exposedData['Avatar'] = row.avatar_url;
        exposedData['Matched email'] = email;
        if (!exposedData.Username && typeof row.display_name === 'string') exposedData.Username = String(row.display_name).replace(/\s+/g, '').slice(0, 40);
        return [finding({
            provider: 'gravatar', category: 'account', title: 'Public Gravatar profile', status: 'found', confidence: 100, risk: 'low',
            summary: 'A public Gravatar profile is associated with the verified email hash.',
            sourceUrl: profileUrl,
            exposedFields: Object.keys(exposedData),
            exposedData: asExposed(exposedData),
            remediation: ['Review the public fields in your Gravatar profile.'],
        })];
    },
};

const github: FootprintProvider = {
    id: 'github', label: 'GitHub', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(`${email} in:email`)}&per_page=5`, {
            signal, cache: 'no-store', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 403 || response.status === 429) return [finding({ provider: 'github', category: 'account', title: 'GitHub rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'GitHub limited public email search for this scan.', remediation: ['Try again later.'] })];
        if (!response.ok) throw new Error(`GitHub ${response.status}`);
        const payload = await response.json() as { items?: Array<Record<string, unknown>> };
        return (payload.items || []).slice(0, 5).map((row) => finding({
            provider: 'github', category: 'account', title: `GitHub @${row.login || 'profile'}`, status: 'found', confidence: 95, risk: 'low',
            summary: 'This GitHub account publicly exposes the verified email in searchable profile data.',
            sourceUrl: typeof row.html_url === 'string' ? row.html_url : undefined,
            exposedFields: ['Email', 'Username', 'Public repositories'],
            exposedData: asExposed({ Username: typeof row.login === 'string' ? row.login : undefined, 'Profile URL': typeof row.html_url === 'string' ? row.html_url : undefined, Email: email, 'Public repos': typeof row.public_repos === 'number' ? row.public_repos : undefined, Score: typeof row.score === 'number' ? row.score : undefined }),
            remediation: ['Remove the public email from GitHub profile settings if you do not want it searchable.'],
        }));
    },
};

const gitlab: FootprintProvider = {
    id: 'gitlab', label: 'GitLab', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://gitlab.com/api/v4/users?search=${encodeURIComponent(email)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 429) return [finding({ provider: 'gitlab', category: 'account', title: 'GitLab rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'GitLab limited public search for this scan.', remediation: ['Try again later.'] })];
        if (!response.ok) throw new Error(`GitLab ${response.status}`);
        const rows = await response.json() as Array<Record<string, unknown>>;
        return rows.filter((row) => String(row.public_email || '').toLowerCase() === email.toLowerCase() || String(row.email || '').toLowerCase() === email.toLowerCase()).slice(0, 5).map((row) => finding({
            provider: 'gitlab', category: 'account', title: `GitLab @${row.username || 'profile'}`, status: 'found', confidence: 95, risk: 'low',
            summary: 'A GitLab profile publicly associates this email address.',
            sourceUrl: typeof row.web_url === 'string' ? row.web_url : undefined,
            exposedFields: ['Email', 'Username', 'Public projects'],
            exposedData: asExposed({
                ...pickExposed(row, [['username', 'Username'], ['name', 'Display name'], ['public_email', 'Public email'], ['web_url', 'Profile URL'], ['bio', 'Bio'], ['location', 'Location']]),
                Email: email,
            }),
            remediation: ['Review GitLab profile visibility and remove the public email if needed.'],
        }));
    },
};

const domain: FootprintProvider = {
    id: 'dns', label: 'DNS mail auth', category: 'domain', supports: ['email'], configured: () => true,
    async check({ email }) {
        if (!email || !email.includes('@')) return [];
        const domainName = email.split('@')[1]?.toLowerCase();
        if (!domainName) return [];
        const mx = await resolveMx(domainName).catch(() => []);
        const spf = await resolveTxt(domainName).then((rows) => rows.flat().join(' ').includes('v=spf1')).catch(() => false);
        const dmarc = await resolveTxt(`_dmarc.${domainName}`).then((rows) => rows.flat().join('').startsWith('v=DMARC1')).catch(() => false);
        return [finding({
            provider: 'dns', category: 'domain', title: domainName, status: 'found', confidence: 100,
            risk: mx.length === 0 || !spf || !dmarc ? 'medium' : 'low',
            summary: `MX: ${mx.length ? 'present' : 'missing'} · SPF: ${spf ? 'present' : 'missing'} · DMARC: ${dmarc ? 'present' : 'missing'}`,
            exposedFields: ['Mail provider configuration', 'SPF policy', 'DMARC policy'],
            exposedData: asExposed({
                Domain: domainName,
                MX: mx.length ? mx.map((item) => `${item.exchange} (prio ${item.priority})`).join(', ') : 'missing',
                SPF: spf ? 'present' : 'missing',
                DMARC: dmarc ? 'present' : 'missing',
                'Matched email': email,
            }),
            remediation: !spf || !dmarc ? ['Ask the domain administrator to configure SPF and DMARC.'] : ['Mail authentication records are present.'],
        })];
    },
};

function safeSourceUrl(value: unknown) {
    const raw = String(value || '').trim();
    if (!raw) return undefined;
    try {
        const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
        return url.protocol === 'https:' ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}

const leakCheckPublic: FootprintProvider = {
    id: 'leakcheck-public', label: 'LeakCheck Public', category: 'breach', supports: ['email', 'phone', 'username'], configured: () => true,
    async check({ email, phone, usernames, signal }) {
        const lookup = email || phone || usernames[0];
        if (!lookup) return [];
        const response = await fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(lookup)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'leakcheck-public', category: 'breach', title: 'LeakCheck rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The public provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`LeakCheck ${response.status}`);
        const payload = await response.json() as { found?: unknown; fields?: unknown[]; sources?: Array<{ name?: unknown; date?: unknown }> };
        const fields = Array.isArray(payload.fields) ? payload.fields.map(String) : [];
        const passwordExposed = fields.some((value) => /password/i.test(value));
        return (payload.sources || []).map((source) => finding({
            provider: 'leakcheck-public', category: 'breach', title: String(source.name || 'Leak source'), status: 'found', confidence: 90,
            risk: passwordExposed ? 'critical' : 'high',
            summary: `LeakCheck reports ${Number(payload.found || 0).toLocaleString()} matching records across its public result. Sensitive field values are not returned by this integration.`,
            sourceUrl: 'https://leakcheck.io/',
            exposedFields: fields,
            exposedData: asExposed({
                Source: String(source.name || ''),
                Date: source.date ? String(source.date) : undefined,
                'Matching records': Number(payload.found || 0),
                'Data classes': fields.length ? fields.join(', ') : undefined,
                Identifier: lookup,
            }),
            occurredAt: String(source.date || ''),
            remediation: passwordExposed ? ['Change reused passwords and enable multi-factor authentication.'] : ['Review the affected accounts and remove unnecessary public data.'],
        }));
    },
};

const xposedOrNot: FootprintProvider = {
    id: 'xposedornot', label: 'XposedOrNot', category: 'breach', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (response.status === 404) return [];
        if (response.status === 429) return [finding({ provider: 'xposedornot', category: 'breach', title: 'XposedOrNot rate limit', status: 'rate-limited', confidence: 100, risk: 'info', summary: 'The public provider asked the scanner to retry later.', remediation: ['Run the check again later.'] })];
        if (!response.ok) throw new Error(`XposedOrNot ${response.status}`);
        const payload = await response.json() as { ExposedBreaches?: { breaches_details?: Array<Record<string, unknown>> } };
        return (payload.ExposedBreaches?.breaches_details || []).map((row) => {
            const fields = String(row.xposed_data || '').split(';').map((value) => value.trim()).filter(Boolean);
            const passwordExposed = fields.some((value) => /password/i.test(value));
            const details = String(row.details || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return finding({
                provider: 'xposedornot', category: 'breach', title: String(row.breach || 'Data exposure'), status: 'found', confidence: row.verified === true ? 95 : 80,
                risk: passwordExposed ? 'critical' : 'high',
                summary: [details, row.industry ? `Industry: ${String(row.industry)}.` : '', row.xposed_records ? `Reported records: ${Number(row.xposed_records).toLocaleString()}.` : ''].filter(Boolean).join(' '),
                sourceUrl: safeSourceUrl(row.domain),
                exposedFields: fields,
                exposedData: asExposed({
                    Breach: String(row.breach || ''),
                    Domain: row.domain ? String(row.domain) : undefined,
                    Industry: row.industry ? String(row.industry) : undefined,
                    Date: row.xposed_date ? String(row.xposed_date) : undefined,
                    'Records reported': typeof row.xposed_records === 'number' ? row.xposed_records : (row.xposed_records ? Number(row.xposed_records) : undefined),
                    Verified: row.verified === true,
                    'Data classes': fields.length ? fields.join(', ') : undefined,
                    Details: details || undefined,
                    'Matched email': email,
                }),
                occurredAt: String(row.xposed_date || ''),
                remediation: passwordExposed ? ['Change reused passwords and enable multi-factor authentication.'] : ['Review the affected account and its privacy settings.'],
            });
        });
    },
};

export const footprintProviders: FootprintProvider[] = [hibp, leakCheckPublic, xposedOrNot, holehe, emailRep, gravatar, github, gitlab, domain, publicProfiles];

export async function runFootprintProviders(context: { queryType: 'email' | 'phone' | 'username'; email?: string; phone?: string; usernames: string[] }) {
    const results = await Promise.all(footprintProviders.map(async (provider) => {
        if (!provider.supports.includes(context.queryType) && !(provider.id === 'public-profiles' && context.queryType === 'email')) {
            return { provider, findings: [] as FootprintFinding[], status: 'unsupported' as const };
        }
        if (!provider.configured()) return { provider, findings: [] as FootprintFinding[], status: 'not-configured' as const };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);
        try {
            return { provider, findings: await provider.check({ ...context, signal: controller.signal }), status: 'available' as const };
        } catch {
            return { provider, findings: [finding({ provider: provider.id, category: provider.category, title: `${provider.label} unavailable`, status: 'unavailable', confidence: 0, risk: 'info', summary: 'This provider did not return a usable result during the scan.', remediation: ['Try this provider again later.'] })], status: 'unavailable' as const };
        } finally {
            clearTimeout(timeout);
        }
    }));

    let findings = results.flatMap((result) => result.findings);

    if (context.queryType === 'email' || context.queryType === 'phone') {
        const discovered = new Set<string>();
        for (const item of findings) {
            if (item.status !== 'found') continue;
            const fromData = item.exposedData?.Username;
            if (typeof fromData === 'string' && fromData.length >= 2) discovered.add(fromData.toLowerCase());
            const match = item.title.match(/@([\w.-]+)/);
            if (match?.[1]) discovered.add(match[1].toLowerCase());
        }
        for (const username of context.usernames) discovered.add(username.toLowerCase());
        if (context.email) {
            const local = context.email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') || '';
            if (local.length >= 2) discovered.add(local.toLowerCase());
        }
        const known = new Set(
            findings
                .filter((item) => item.provider === 'public-profiles' && item.status === 'found')
                .map((item) => item.title.toLowerCase()),
        );
        const extraUsernames = [...discovered].filter((username) => username.length >= 2 && username.length <= 40);
        if (extraUsernames.length) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12_000);
            try {
                const extra = await publicProfiles.check({ email: undefined, phone: undefined, usernames: extraUsernames, signal: controller.signal });
                for (const item of extra) {
                    if (item.status === 'found' && known.has(item.title.toLowerCase())) continue;
                    findings.push(item);
                }
            } catch {
                // ignore enrichment failures
            } finally {
                clearTimeout(timeout);
            }
        }
    }

    findings = deduplicateFindings(findings);
    return {
        findings,
        relatedAccounts: collectRelatedAccounts(findings, context),
        providersChecked: results.length,
        providersAvailable: results.filter((result) => result.status === 'available').length,
        providerStatuses: results.map((result) => ({ id: result.provider.id, label: result.provider.label, status: result.status })),
    };
}

function collectRelatedAccounts(findings: FootprintFinding[], context: { queryType: 'email' | 'phone' | 'username'; email?: string; phone?: string; usernames: string[] }): FootprintRelatedAccount[] {
    const linkedVia: FootprintRelatedAccount['linkedVia'] = context.queryType === 'email' ? 'email' : context.queryType === 'phone' ? 'phone' : 'username';
    const accounts: FootprintRelatedAccount[] = [];
    const seen = new Set<string>();
    for (const item of findings) {
        if (item.status !== 'found') continue;
        if (item.category !== 'account' && item.provider !== 'public-profiles') continue;
        const titleMatch = item.title.match(/@([\w.-]+)/);
        const username =
            (typeof item.exposedData?.Username === 'string' && item.exposedData.Username)
            || titleMatch?.[1]
            || (typeof item.exposedData?.Service === 'string' ? String(item.exposedData.Service) : undefined)
            || context.usernames[0]
            || context.email?.split('@')[0]
            || 'unknown';
        let platform = item.provider;
        if (item.provider === 'public-profiles') platform = item.title.replace(/\s*@.+$/, '');
        else if (item.provider === 'github') platform = 'GitHub';
        else if (item.provider === 'gitlab') platform = 'GitLab';
        else if (item.provider === 'gravatar') platform = 'Gravatar';
        else if (item.provider === 'holehe') platform = String(item.title);
        const key = `${platform.toLowerCase()}:${String(username).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        accounts.push({
            platform,
            username: String(username),
            url: item.sourceUrl,
            linkedVia,
            confidence: item.confidence,
            summary: item.summary,
            exposedData: item.exposedData,
        });
    }
    return accounts.sort((a, b) => b.confidence - a.confidence || a.platform.localeCompare(b.platform));
}

function deduplicateFindings(findings: FootprintFinding[]) {
    const groups = new Map<string, FootprintFinding[]>();
    for (const item of findings) {
        if (item.status !== 'found' || item.category !== 'breach') {
            groups.set(item.id, [item]);
            continue;
        }
        const key = `${item.category}:${item.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        groups.set(key, [...(groups.get(key) || []), item]);
    }
    return [...groups.values()].map((items) => {
        const primary = items.sort((a, b) => b.confidence - a.confidence)[0];
        if (items.length === 1) return primary;
        const exposedData = items.reduce<FootprintExposedData>((acc, item) => ({ ...acc, ...(item.exposedData || {}) }), {});
        return {
            ...primary,
            relatedProviders: [...new Set(items.map((item) => item.provider))],
            duplicateCount: items.length,
            exposedFields: [...new Set(items.flatMap((item) => item.exposedFields || []))],
            exposedData: Object.keys(exposedData).length ? exposedData : primary.exposedData,
            remediation: [...new Set(items.flatMap((item) => item.remediation))],
        };
    });
}

export function calculateRiskScore(findings: FootprintFinding[]) {
    const weights = { info: 1, low: 5, medium: 15, high: 28, critical: 45 } as const;
    return Math.min(100, findings.filter((item) => item.status === 'found').reduce((total, item) => total + weights[item.risk], 0));
}
