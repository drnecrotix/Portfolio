import 'server-only';

import { randomUUID } from 'node:crypto';
import type { FootprintExposedData, FootprintFinding, FootprintProvider } from './types';

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

export const publicProfiles: FootprintProvider = {
    id: 'public-profiles', label: 'Public profiles', category: 'account', supports: ['username', 'email'], configured: () => true,
    async check({ usernames, email, signal }) {
        const candidates = [...usernames];
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') || '';
            if (local.length >= 2 && local.length <= 40) candidates.push(local.toLowerCase());
        }
        const unique = [...new Set(candidates.map((value) => value.toLowerCase()).filter((value) => value.length >= 2))];
        if (!unique.length) return [];
        const services = [
            { name: 'GitHub', check: (u: string) => `https://api.github.com/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://github.com/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { login?: unknown })?.login), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['login', 'Username'], ['name', 'Display name'], ['bio', 'Bio'], ['company', 'Company'], ['location', 'Location'], ['blog', 'Website'], ['email', 'Public email'], ['twitter_username', 'Twitter/X'], ['public_repos', 'Public repos'], ['followers', 'Followers'], ['following', 'Following'], ['created_at', 'Created at']]) },
            { name: 'GitLab', check: (u: string) => `https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`, profile: (u: string) => `https://gitlab.com/${encodeURIComponent(u)}`, exists: (data: unknown) => Array.isArray(data) && data.length > 0, extract: (data: unknown) => pickExposed((Array.isArray(data) ? data[0] : {}) as Record<string, unknown>, [['username', 'Username'], ['name', 'Display name'], ['bio', 'Bio'], ['location', 'Location'], ['public_email', 'Public email'], ['web_url', 'Profile URL']]) },
            { name: 'Codeberg', check: (u: string) => `https://codeberg.org/api/v1/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://codeberg.org/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { login?: unknown; username?: unknown })?.login || (data as { username?: unknown })?.username), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['login', 'Username'], ['username', 'Username'], ['full_name', 'Display name'], ['description', 'Bio'], ['location', 'Location'], ['website', 'Website']]) },
            { name: 'Reddit', check: (u: string) => `https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`, profile: (u: string) => `https://www.reddit.com/user/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { data?: { name?: unknown } })?.data?.name), extract: (data: unknown) => pickExposed(((data as { data?: Record<string, unknown> }).data || {}) as Record<string, unknown>, [['name', 'Username'], ['total_karma', 'Karma'], ['created_utc', 'Created at'], ['subreddit', 'Profile subreddit']]) },
            { name: 'DEV', check: (u: string) => `https://dev.to/api/users/by_username?url=${encodeURIComponent(u)}`, profile: (u: string) => `https://dev.to/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { username?: unknown })?.username), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['name', 'Display name'], ['summary', 'Bio'], ['location', 'Location'], ['joined_at', 'Joined at'], ['github_username', 'GitHub'], ['twitter_username', 'Twitter/X'], ['website_url', 'Website']]) },
            { name: 'Keybase', check: (u: string) => `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(u)}`, profile: (u: string) => `https://keybase.io/${encodeURIComponent(u)}`, exists: (data: unknown) => Array.isArray((data as { them?: unknown[] })?.them) && Boolean((data as { them?: unknown[] }).them?.length), extract: (data: unknown) => {
                const them = Array.isArray((data as { them?: Array<Record<string, unknown>> }).them) ? (data as { them: Array<Record<string, unknown>> }).them[0] : {};
                const basics = them.basics && typeof them.basics === 'object' ? them.basics as Record<string, unknown> : {};
                const profile = them.profile && typeof them.profile === 'object' ? them.profile as Record<string, unknown> : {};
                return pickExposed({ ...basics, ...profile }, [['username', 'Username'], ['full_name', 'Display name'], ['location', 'Location'], ['bio', 'Bio']]);
            } },
            { name: 'Hacker News', check: (u: string) => `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`, profile: (u: string) => `https://news.ycombinator.com/user?id=${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean(data && (data as { id?: unknown }).id), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['id', 'Username'], ['created', 'Created at'], ['karma', 'Karma'], ['about', 'About']]) },
            { name: 'npm', check: (u: string) => `https://registry.npmjs.org/-/user/org.couchdb.user:${encodeURIComponent(u)}`, profile: (u: string) => `https://www.npmjs.com/~${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { name?: unknown })?.name), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['name', 'Username'], ['email', 'Public email'], ['fullname', 'Display name']]) },
            { name: 'Docker Hub', check: (u: string) => `https://hub.docker.com/v2/users/${encodeURIComponent(u)}/`, profile: (u: string) => `https://hub.docker.com/u/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { username?: unknown; id?: unknown })?.username || (data as { id?: unknown })?.id), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['full_name', 'Display name'], ['location', 'Location'], ['company', 'Company']]) },
            { name: 'Bitbucket', check: (u: string) => `https://api.bitbucket.org/2.0/users/${encodeURIComponent(u)}`, profile: (u: string) => `https://bitbucket.org/${encodeURIComponent(u)}`, exists: (data: unknown) => Boolean((data as { username?: unknown; display_name?: unknown })?.username || (data as { display_name?: unknown })?.display_name), extract: (data: unknown) => pickExposed(data as Record<string, unknown>, [['username', 'Username'], ['display_name', 'Display name'], ['location', 'Location'], ['created_on', 'Created at']]) },
        ];
        const checks = unique.flatMap((username) => services.map(async (service) => {
            try {
                const response = await fetch(service.check(username), { signal, cache: 'no-store', redirect: 'follow', headers: { Accept: 'application/json', 'User-Agent': 'NecrotixLab-Digital-Footprint' } }).catch(() => null);
                if (!response?.ok) return null;
                const data = await response.json().catch(() => null);
                if (!service.exists(data)) return null;
                const exposedData = { ...(service.extract ? service.extract(data) : {}), Username: username };
                const fieldLabels = Object.keys(exposedData);
                return finding({
                    provider: 'public-profiles', category: 'account', title: `${service.name} @${username}`, status: 'found', confidence: 85, risk: 'info',
                    summary: 'The platform API returned a public profile for this username. Review the exposed fields below.',
                    sourceUrl: service.profile(username),
                    exposedFields: fieldLabels.length ? fieldLabels : ['Username', 'Public profile'],
                    exposedData: asExposed(exposedData) || { Username: username },
                    remediation: ['Review the profile privacy settings and remove details you no longer want public.'],
                });
            } catch {
                return null;
            }
        }));
        return (await Promise.all(checks)).filter((value): value is FootprintFinding => value !== null);
    },
};
