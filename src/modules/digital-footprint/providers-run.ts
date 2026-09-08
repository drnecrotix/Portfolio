import 'server-only';

import type { FootprintExposedData, FootprintFinding, FootprintProvider, FootprintRelatedAccount } from './types';
import { publicProfiles } from './public-profiles';
import { socialProfiles } from './social-profiles';
import {
    hibp, holehe, emailRep, gravatar, github, gitlab, domain,
    leakCheckPublic, xposedOrNot, hudsonRock, finding,
} from './providers-core';

export const footprintProviders: FootprintProvider[] = [hibp, leakCheckPublic, xposedOrNot, hudsonRock, holehe, emailRep, gravatar, github, gitlab, domain, publicProfiles, socialProfiles];

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
                .filter((item) => (item.provider === 'public-profiles' || item.provider === 'social-profiles') && item.status === 'found')
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
                const extraSocial = await socialProfiles.check({ email: undefined, phone: undefined, usernames: extraUsernames, signal: controller.signal });
                for (const item of extraSocial) {
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
        if (item.category !== 'account' && item.provider !== 'public-profiles' && item.provider !== 'social-profiles') continue;
        const titleMatch = item.title.match(/@([\w.-]+)/);
        const username =
            (typeof item.exposedData?.Username === 'string' && item.exposedData.Username)
            || titleMatch?.[1]
            || (typeof item.exposedData?.Service === 'string' ? String(item.exposedData.Service) : undefined)
            || context.usernames[0]
            || context.email?.split('@')[0]
            || 'unknown';
        const displayName =
            (typeof item.exposedData?.['Display name'] === 'string' && item.exposedData['Display name'])
            || (typeof item.exposedData?.Name === 'string' && item.exposedData.Name)
            || undefined;
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
