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

const gravatar: FootprintProvider = {
    id: 'gravatar', label: 'Gravatar', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const digest = createHash('sha256').update(email).digest('hex');
        const response = await fetch(`https://api.gravatar.com/v3/profiles/${digest}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Gravatar ${response.status}`);
        const row = await response.json() as Record<string, unknown>;
        const profileUrl = typeof row.profile_url === 'string' ? row.profile_url : undefined;
        const exposedData = pickExposed(row, [['display_name', 'Display name'], ['description', 'Bio'], ['location', 'Location'], ['job_title', 'Job title'], ['company', 'Company'], ['profile_url', 'Profile URL']]);
        if (typeof row.avatar_url === 'string') exposedData['Avatar'] = row.avatar_url;
        return [finding({ provider: 'gravatar', category: 'account', title: 'Public Gravatar profile', status: 'found', confidence: 100, risk: 'low', summary: 'A public Gravatar profile is associated with the verified email hash.', sourceUrl: profileUrl, exposedFields: Object.keys(exposedData).length ? Object.keys(exposedData) : ['Profile image', 'Display name', 'Profile metadata'], exposedData: Object.keys(exposedData).length ? exposedData : undefined, remediation: ['Review the public fields in your Gravatar profile.'] })];
    },
};

const github: FootprintProvider = {
    id: 'github', label: 'GitHub', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'NecrotixLab-Digital-Footprint' };
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(`${email} in:email`)}`, { signal, cache: 'no-store', headers });
        if (!response.ok) throw new Error(`GitHub ${response.status}`);
        const payload = await response.json() as { items?: Array<{ login?: string; html_url?: string }> };
        return (payload.items || []).slice(0, 5).map((row) => finding({ provider: 'github', category: 'account', title: `GitHub @${row.login || 'profile'}`, status: 'found', confidence: 95, risk: 'low', summary: 'This GitHub account publicly exposes the verified email in searchable profile data.', sourceUrl: row.html_url, exposedFields: ['Email', 'Username', 'Public repositories'], exposedData: { Username: row.login || null, 'Profile URL': row.html_url || null, Email: email }, remediation: ['Remove the public email from GitHub profile settings if you do not want it searchable.'] }));
    },
};

const gitlab: FootprintProvider = {
    id: 'gitlab', label: 'GitLab', category: 'account', supports: ['email'], configured: () => true,
    async check({ email, signal }) {
        if (!email) return [];
        const response = await fetch(`https://gitlab.com/api/v4/users?search=${encodeURIComponent(email)}&per_page=20`, {
            signal, cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' },
        });
        if (!response.ok) throw new Error(`GitLab ${response.status}`);
        const rows = await response.json() as Array<Record<string, unknown>>;
        return rows.filter((row) => String(row.public_email || '').toLowerCase() === email).map((row) => finding({
            provider: 'gitlab', category: 'account', title: `GitLab @${String(row.username || 'profile')}`, status: 'found', confidence: 100, risk: 'low',
            summary: 'A GitLab profile publicly exposes the searched email address.', sourceUrl: safeSourceUrl(row.web_url),
            exposedFields: ['Email', 'Username', 'Public projects'],
            exposedData: pickExposed(row, [['username', 'Username'], ['name', 'Display name'], ['public_email', 'Public email'], ['web_url', 'Profile URL'], ['bio', 'Bio']]),
            remediation: ['Review the public email and profile visibility in GitLab settings.'],
        }));
    },
};

const domain: FootprintProvider = {
    id: 'domain', label: 'Mail domain posture', category: 'domain', supports: ['email'], configured: () => true,
    async check({ email }) {
        if (!email) return [];
        const domainName = email.split('@')[1];
        if (!domainName) return [];
        const [mx, txt] = await Promise.all([resolveMx(domainName).catch(() => []), resolveTxt(domainName).catch(() => [])]);
        const records = txt.map((parts) => parts.join(''));
        const spf = records.some((value) => value.startsWith('v=spf1'));
        const dmarc = await resolveTxt(`_dmarc.${domainName}`).then((rows) => rows.flat().join('').startsWith('v=DMARC1')).catch(() => false);
        return [finding({ provider: 'dns', category: 'domain', title: domainName, status: 'found', confidence: 100, risk: mx.length === 0 || !spf || !dmarc ? 'medium' : 'low', summary: `MX: ${mx.length ? 'present' : 'missing'} · SPF: ${spf ? 'present' : 'missing'} · DMARC: ${dmarc ? 'present' : 'missing'}`, exposedFields: ['Mail provider configuration', 'SPF policy', 'DMARC policy'], remediation: !spf || !dmarc ? ['Ask the domain administrator to configure SPF and DMARC.'] : ['Mail authentication records are present.'] })];
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
            sourceUrl: 'https://leakcheck.io/', exposedFields: fields, occurredAt: String(source.date || ''),
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
                sourceUrl: safeSourceUrl(row.domain), exposedFields: fields, occurredAt: String(row.xposed_date || ''),
                remediation: passwordExposed ? ['Change reused passwords and enable multi-factor authentication.'] : ['Review the affected account and its privacy settings.'],
            });
        });
    },
};

const publicProfiles: FootprintProvider = {
    id: 'public-profiles', label: 'Public profiles', category: 'account', supports: ['username', 'email'], configured: () => true,
    async check({ usernames, email, signal }) {
        const candidates = [...usernames];
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') || '';
            if (local.length >= 2 && local.length <= 40) candidates.push(local.toLowerCase());
        }
        const resolved = [...new Set(candidates.map((v) => v.toLowerCase()).filter((v) => v.length >= 2))];
        if (!resolved.length) return [];
        const services = [
            { name: 'GitHub', check: (u: string) => `https://api.github.com/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://github.com/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { login?: unknown })?.login), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['login', 'Username'], ['name', 'Display name'], ['bio', 'Bio'], ['company', 'Company'], ['location', 'Location'], ['blog', 'Website'], ['email', 'Public email'], ['twitter_username', 'Twitter/X'], ['public_repos', 'Public repos'], ['followers', 'Followers'], ['following', 'Following'], ['created_at', 'Created at']]) },
            { name: 'GitLab', check: (u: string) => `https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`, profile: (u: string) => `https://gitlab.com/${encodeURIComponent(u)}`, exists: (data: unknown) => Array.isArray(data) && data.length > 0, extract: (data: unknown) => pickExposed((Array.isArray(data) ? data[0] : {}) as Record<string, unknown>, [['username', 'Username'], ['name', 'Display name'], ['bio', 'Bio'], ['location', 'Location'], ['public_email', 'Public email'], ['web_url', 'Profile URL']]) },
            { name: 'Codeberg', check: (u: string) => `https://codeberg.org/api/v1/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://codeberg.org/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { login?: unknown })?.login), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['login', 'Username'], ['full_name', 'Display name'], ['description', 'Bio'], ['location', 'Location'], ['website', 'Website'], ['email', 'Public email']]) },
            { name: 'Reddit', check: (u: string) => `https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`, profile: (u: string) => `https://www.reddit.com/user/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { data?: { name?: unknown } })?.data?.name), extract: (data: unknown) => pickExposed((((data as { data?: Record<string, unknown> })?.data) || {}) as Record<string, unknown>, [['name', 'Username'], ['total_karma', 'Karma'], ['created_utc', 'Created (unix)']]) },
            { name: 'DEV Community', check: (u: string) => `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`, profile: (u: string) => `https://dev.to/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { id?: unknown })?.id), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['name', 'Display name'], ['summary', 'Bio'], ['location', 'Location'], ['github_username', 'GitHub'], ['twitter_username', 'Twitter/X'], ['website_url', 'Website'], ['joined_at', 'Joined']]) },
            { name: 'Keybase', check: (u: string) => `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(u)}`, profile: (u: string) => `https://keybase.io/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { them?: unknown[] })?.them?.[0]), extract: (data: unknown) => { const them = ((data as { them?: Array<Record<string, unknown>> }).them || [])[0] || {}; const basics = (them.basics as Record<string, unknown>) || {}; return pickExposed({ ...basics, ...(them.profile as Record<string, unknown> || {}) }, [['username', 'Username'], ['full_name', 'Display name'], ['location', 'Location'], ['bio', 'Bio']]); } },
            { name: 'Hacker News', check: (u: string) => `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`, profile: (u: string) => `https://news.ycombinator.com/user?id=${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean(data && (data as { id?: unknown }).id), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['id', 'Username'], ['created', 'Created'], ['karma', 'Karma'], ['about', 'About']]) },
            { name: 'npm', check: (u: string) => `https://registry.npmjs.org/-/user/org.couchdb.user:${encodeURIComponent(u)}`, profile: (u: string) => `https://www.npmjs.com/~${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { name?: unknown })?.name), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['name', 'Username'], ['email', 'Public email']]) },
            { name: 'Docker Hub', check: (u: string) => `https://hub.docker.com/v2/users/${encodeURIComponent(u)}/`, profile: (u: string) => `https://hub.docker.com/u/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { username?: unknown; id?: unknown })?.username || (data as { id?: unknown })?.id), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['full_name', 'Display name'], ['location', 'Location'], ['company', 'Company']]) },
            { name: 'Bitbucket', check: (u: string) => `https://api.bitbucket.org/2.0/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://bitbucket.org/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { username?: unknown; display_name?: unknown })?.username || (data as { display_name?: unknown })?.display_name), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['display_name', 'Display name'], ['location', 'Location'], ['created_on', 'Created at']]) },
        ];
        const checks = resolved.flatMap((username) => services.map(async (service) => {
            try {
                const response = await fetch(service.check(username), { signal, cache: 'no-store', redirect: 'follow', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' } }).catch(() => null);
                if (!response?.ok) return null;
                const data = await response.json().catch(() => null);
                if (!service.exists(data)) return null;
                const exposedData = service.extract ? service.extract(data) : { Username: username };
                if (!exposedData.Username) exposedData.Username = username;
                const fieldLabels = Object.keys(exposedData || {});
                const display = typeof exposedData['Display name'] === 'string' ? exposedData['Display name'] : undefined;
                return finding({ provider: 'public-profiles', category: 'account', title: display ? `${service.name}: ${display} (@${username})` : `${service.name} @${username}`, status: 'found', confidence: 85, risk: 'info', summary: 'The platform API returned a public profile for this username. Review the exposed fields below.', sourceUrl: service.profile(username), exposedFields: fieldLabels.length ? fieldLabels : ['Username', 'Public profile'], exposedData: Object.keys(exposedData || {}).length ? exposedData : { Username: username }, remediation: ['Review the profile privacy settings and remove details you no longer want public.'] });
            } catch { return null; }
        }));
        return (await Promise.all(checks)).filter((value): value is FootprintFinding => value !== null);
    },
};

export const footprintProviders: FootprintProvider[] = [hibp, leakCheckPublic, xposedOrNot, holehe, emailRep, gravatar, github, gitlab, domain, publicProfiles, ...extraProviders];

export async function runFootprintProviders(context: { queryType: 'email' | 'phone' | 'username'; email?: string; phone?: string; usernames: string[] }) {
    const results = await Promise.all(footprintProviders.map(async (provider) => {
        if (!provider.supports.includes(context.queryType) && !((provider.id === 'public-profiles' || provider.id === 'social-profiles') && context.queryType === 'email')) {
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

    const findings = results.flatMap((result) => result.findings);
    return {
        findings: deduplicateFindings(findings),
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
        if (item.category !== 'account' && item.provider !== 'public-profiles' && item.provider !== 'social-profiles') continue;
        const titleMatch = item.title.match(/@([\w.-]+)/);
        const username =
            (typeof item.exposedData?.Username === 'string' && item.exposedData.Username) ||
            titleMatch?.[1] ||
            context.usernames[0] ||
            context.email?.split('@')[0] ||
            'unknown';
        const displayName =
            (typeof item.exposedData?.['Display name'] === 'string' && item.exposedData['Display name']) ||
            (typeof item.exposedData?.Name === 'string' && item.exposedData.Name) ||
            undefined;
        let platform = item.provider;
        if (item.provider === 'public-profiles' || item.provider === 'social-profiles') {
            platform = item.title.split(':')[0]?.replace(/\s*@.+$/, '').trim() || item.title.replace(/\s*@.+$/, '');
        } else if (item.provider === 'github') platform = 'GitHub';
        else if (item.provider === 'gitlab') platform = 'GitLab';
        else if (item.provider === 'gravatar') platform = 'Gravatar';
        else if (item.provider === 'holehe') platform = String(item.title);
        const key = `${platform.toLowerCase()}:${String(username).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        accounts.push({
            platform,
            username: String(username),
            displayName: displayName ? String(displayName) : undefined,
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
        return {
            ...primary,
            relatedProviders: [...new Set(items.map((item) => item.provider))],
            duplicateCount: items.length,
            exposedFields: [...new Set(items.flatMap((item) => item.exposedFields || []))],
            remediation: [...new Set(items.flatMap((item) => item.remediation))],
        };
    });
}

export function calculateRiskScore(findings: FootprintFinding[]) {
    const weights = { info: 1, low: 5, medium: 15, high: 28, critical: 45 } as const;
    return Math.min(100, findings.filter((item) => item.status === 'found').reduce((total, item) => total + weights[item.risk], 0));
}
