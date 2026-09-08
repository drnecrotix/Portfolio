import 'server-only';

import { randomUUID } from 'node:crypto';
import type { FootprintExposedData, FootprintFinding, FootprintProvider } from './types';

function finding(input: Omit<FootprintFinding, 'id'>): FootprintFinding {
    return { id: randomUUID(), ...input };
}

function extractOgTitle(html: string): string | undefined {
    const match =
        html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match?.[1]) return undefined;
    const title = match[1].replace(/\s+/g, ' ').trim();
    if (!title || /not found|doesn't exist|page not found|404/i.test(title)) return undefined;
    return title.slice(0, 120);
}

type HtmlService = {
    name: string;
    profile: (u: string) => string;
    notFoundPatterns: RegExp[];
};

const services: HtmlService[] = [
    { name: 'X (Twitter)', profile: (u) => `https://x.com/${encodeURIComponent(u)}`, notFoundPatterns: [/this account doesn.?t exist/i, /account suspended/i] },
    { name: 'Instagram', profile: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`, notFoundPatterns: [/sorry, this page isn.?t available/i] },
    { name: 'Facebook', profile: (u) => `https://www.facebook.com/${encodeURIComponent(u)}`, notFoundPatterns: [/content isn.?t available/i, /page isn.?t available/i] },
    { name: 'Threads', profile: (u) => `https://www.threads.net/@${encodeURIComponent(u)}`, notFoundPatterns: [/page isn.?t available/i, /content isn.?t available/i] },
    { name: 'LinkedIn', profile: (u) => `https://www.linkedin.com/in/${encodeURIComponent(u)}/`, notFoundPatterns: [/page not found/i, /this page doesn.?t exist/i] },
    { name: 'TikTok', profile: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}`, notFoundPatterns: [/couldn.?t find this account/i] },
    { name: 'Twitch', profile: (u) => `https://www.twitch.tv/${encodeURIComponent(u)}`, notFoundPatterns: [/sorry\. unless you.?ve got a time machine/i] },
    { name: 'Pinterest', profile: (u) => `https://www.pinterest.com/${encodeURIComponent(u)}/`, notFoundPatterns: [/sorry! we couldn.?t find/i] },
    { name: 'Medium', profile: (u) => `https://medium.com/@${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|out of nothing/i] },
    { name: 'Telegram', profile: (u) => `https://t.me/${encodeURIComponent(u)}`, notFoundPatterns: [/if you have telegram/i] },
    { name: 'Linktree', profile: (u) => `https://linktr.ee/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|doesn.?t exist/i] },
    { name: 'Steam', profile: (u) => `https://steamcommunity.com/id/${encodeURIComponent(u)}`, notFoundPatterns: [/the specified profile could not be found/i] },
    { name: 'Spotify', profile: (u) => `https://open.spotify.com/user/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|couldn.?t find/i] },
    { name: 'SoundCloud', profile: (u) => `https://soundcloud.com/${encodeURIComponent(u)}`, notFoundPatterns: [/we can.?t find that user/i] },
    { name: 'Badoo', profile: (u) => `https://badoo.com/profile/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|user not found/i] },
    { name: 'Snapchat', profile: (u) => `https://www.snapchat.com/add/${encodeURIComponent(u)}`, notFoundPatterns: [/page could not be found|user not found/i] },
    { name: 'About.me', profile: (u) => `https://about.me/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found/i] },
    { name: 'Behance', profile: (u) => `https://www.behance.net/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|we couldn.?t find/i] },
    { name: 'Duolingo', profile: (u) => `https://www.duolingo.com/profile/${encodeURIComponent(u)}`, notFoundPatterns: [/page not found|user not found/i] },
];

const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (compatible; NecrotixLab-Digital-Footprint/1.2.51; +https://github.com/drnecrotix/Portfolio)',
};

/** Soft public URL probes. Social CDNs often block bots — matches are soft signals. */
export const socialProfiles: FootprintProvider = {
    id: 'social-profiles',
    label: 'Social profiles',
    category: 'account',
    supports: ['username', 'email'],
    configured: () => true,
    async check({ usernames, email, signal }) {
        const candidates = [...usernames];
        if (email) {
            const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') || '';
            if (local.length >= 2 && local.length <= 40) candidates.push(local.toLowerCase());
        }
        const unique = [...new Set(candidates.map((v) => v.toLowerCase()).filter((v) => v.length >= 2 && v.length <= 40))];
        if (!unique.length) return [];

        const checks = unique.flatMap((username) =>
            services.map(async (service) => {
                try {
                    const url = service.profile(username);
                    const response = await fetch(url, { signal, cache: 'no-store', redirect: 'follow', headers }).catch(() => null);
                    if (!response || response.status === 404 || response.status === 410) return null;
                    if (!response.ok) return null;
                    const html = await response.text().catch(() => '');
                    if (!html || html.length < 80) return null;
                    if (service.notFoundPatterns.some((p) => p.test(html))) return null;
                    const finalUrl = response.url || url;
                    if (/\/login|\/signup/i.test(finalUrl) && !finalUrl.toLowerCase().includes(username.toLowerCase())) return null;

                    const displayName = extractOgTitle(html);
                    const exposedData: FootprintExposedData = {
                        Username: username,
                        'Profile URL': url,
                        ...(displayName ? { 'Display name': displayName } : {}),
                        Signal: 'Public profile URL responded',
                    };
                    return finding({
                        provider: 'social-profiles',
                        category: 'account',
                        title: displayName ? `${service.name}: ${displayName}` : `${service.name} @${username}`,
                        status: 'found',
                        confidence: displayName ? 70 : 55,
                        risk: 'info',
                        summary: displayName
                            ? `Public ${service.name} page for @${username} responded as "${displayName}". Confirm ownership — soft signals can false-positive.`
                            : `Public ${service.name} page for @${username} responded. Confirm ownership — soft signals can false-positive.`,
                        sourceUrl: url,
                        exposedFields: Object.keys(exposedData),
                        exposedData,
                        remediation: [
                            'Open the profile and review privacy settings.',
                            'If this is not your account, treat the match as a username collision.',
                        ],
                    });
                } catch {
                    return null;
                }
            }),
        );

        return (await Promise.all(checks)).filter((v): v is FootprintFinding => v !== null);
    },
};
