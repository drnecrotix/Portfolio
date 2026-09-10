import { REMEDIATION_RATE_CARD } from './pricing';

export type ServiceRequestSource = 'WEBSITE_INSPECTOR' | 'EMAIL_DOMAIN_SECURITY' | 'SITE_CRAWL' | 'ACCESSIBILITY_CHECK';

export type ServiceRequestIssue = {
    id: string;
    label: string;
    status: 'warning' | 'fail';
    summary: string;
    recommendation?: string;
};

export type ServiceEstimateContext = {
    cms?: string;
    accessStatus?: string;
};

type Complexity = 'simple' | 'moderate' | 'complex' | 'specialist';

const complexityBySource: Record<ServiceRequestSource, Record<string, Complexity>> = {
    WEBSITE_INSPECTOR: {
        'http-status': 'complex',
        'content-type': 'moderate',
        'redirect-chain': 'moderate',
        https: 'specialist',
        'tls-session': 'specialist',
        'tls-certificate': 'moderate',
        csp: 'complex',
        hsts: 'moderate',
        nosniff: 'simple',
        'frame-protection': 'moderate',
        title: 'simple',
        description: 'simple',
        viewport: 'simple',
        canonical: 'moderate',
        h1: 'simple',
        'robots-noindex': 'moderate',
        'open-graph': 'moderate',
        'robots-txt': 'moderate',
        sitemap: 'moderate',
        'referrer-policy': 'simple',
        'permissions-policy': 'moderate',
        'cookie-flags': 'complex',
        'response-time': 'complex',
        'document-size': 'moderate',
        'cache-policy': 'complex',
        'wordpress-version': 'simple',
    },
    EMAIL_DOMAIN_SECURITY: {
        mx: 'specialist',
        spf: 'complex',
        dmarc: 'complex',
        dkim: 'complex',
        'mta-sts': 'specialist',
        'tls-rpt': 'moderate',
        caa: 'moderate',
        bimi: 'moderate',
    },
    SITE_CRAWL: {
        'reachable-pages': 'complex',
        'broken-links': 'moderate',
        redirects: 'moderate',
        'page-titles': 'simple',
        'duplicate-titles': 'simple',
    },
    ACCESSIBILITY_CHECK: {
        lang: 'simple',
        title: 'simple',
        viewport: 'simple',
        'image-alt': 'moderate',
        'form-labels': 'complex',
        'button-names': 'moderate',
        'link-names': 'moderate',
        headings: 'moderate',
        'duplicate-ids': 'complex',
        'main-landmark': 'moderate',
        'skip-link': 'simple',
    },
};

function complexityFor(source: ServiceRequestSource, issue: ServiceRequestIssue): Complexity {
    return complexityBySource[source][issue.id] ?? 'moderate';
}

function affectedCount(issue: ServiceRequestIssue) {
    const summary = issue.summary;
    let match: RegExpMatchArray | null = null;

    if (['broken-links', 'page-titles', 'duplicate-titles', 'duplicate-ids'].includes(issue.id)) {
        match = summary.match(/^(\d+)\s/i);
    } else if (['image-alt', 'form-labels', 'button-names', 'link-names'].includes(issue.id)) {
        match = summary.match(/;\s*(\d+)\s+(?:missing|lack)\b/i);
    }

    const count = Number(match?.[1] ?? 1);
    return Number.isFinite(count) && count > 0 ? Math.min(20, Math.round(count)) : 1;
}

function cmsModifier(source: ServiceRequestSource, cms?: string) {
    if (source === 'EMAIL_DOMAIN_SECURITY') return 1;
    const value = String(cms ?? 'unknown').trim().toLowerCase();
    return REMEDIATION_RATE_CARD.cmsModifiers[value as keyof typeof REMEDIATION_RATE_CARD.cmsModifiers]
        ?? REMEDIATION_RATE_CARD.cmsModifiers.unknown;
}

function accessModifier(source: ServiceRequestSource, accessStatus?: string) {
    if (source === 'EMAIL_DOMAIN_SECURITY') return 1;
    const value = String(accessStatus ?? 'Need guidance').trim().toLowerCase();
    return REMEDIATION_RATE_CARD.accessModifiers[value as keyof typeof REMEDIATION_RATE_CARD.accessModifiers]
        ?? REMEDIATION_RATE_CARD.accessModifiers['need guidance'];
}

function roundFive(value: number) {
    return Math.max(5, Math.round(value / 5) * 5);
}

export function estimateServiceRange(
    source: ServiceRequestSource,
    issues: ServiceRequestIssue[],
    context: ServiceEstimateContext = {},
) {
    const counts: Record<Complexity, number> = { simple: 0, moderate: 0, complex: 0, specialist: 0 };
    let laborMin = 0;
    let laborMax = 0;
    let additionalAffectedItems = 0;

    for (const issue of issues) {
        const complexity = complexityFor(source, issue);
        const cost = REMEDIATION_RATE_CARD.costByComplexity[complexity];
        const severity = REMEDIATION_RATE_CARD.severity[issue.status];
        const affected = affectedCount(issue);
        const extraItems = Math.max(0, affected - 1);
        const billableExtraItems = Math.min(REMEDIATION_RATE_CARD.affectedItems.cap, extraItems);

        counts[complexity] += 1;
        additionalAffectedItems += extraItems;
        laborMin += cost.min * severity + billableExtraItems * REMEDIATION_RATE_CARD.affectedItems.minEach;
        laborMax += cost.max * severity + billableExtraItems * REMEDIATION_RATE_CARD.affectedItems.maxEach;
    }

    const bundleModifier = issues.length >= 6
        ? REMEDIATION_RATE_CARD.bundleModifiers.sixPlus
        : issues.length >= 3
            ? REMEDIATION_RATE_CARD.bundleModifiers.threePlus
            : 1;
    const cms = cmsModifier(source, context.cms);
    const access = accessModifier(source, context.accessStatus);
    const modifier = bundleModifier * cms * access;
    const base = REMEDIATION_RATE_CARD.baseBySource[source];

    const rawMin = (base + laborMin) * modifier;
    const rawMax = (base + laborMax) * modifier;
    const min = Math.min(REMEDIATION_RATE_CARD.caps.min, roundFive(rawMin));
    const max = Math.min(REMEDIATION_RATE_CARD.caps.max, Math.max(min + 20, roundFive(rawMax)));

    return {
        min,
        max,
        currency: REMEDIATION_RATE_CARD.currency,
        breakdown: {
            complexity: counts,
            additionalAffectedItems,
            cmsModifier: cms,
            accessModifier: access,
            bundleModifier,
        },
    };
}
