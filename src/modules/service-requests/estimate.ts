export type ServiceRequestSource = 'WEBSITE_INSPECTOR' | 'EMAIL_DOMAIN_SECURITY' | 'SITE_CRAWL' | 'ACCESSIBILITY_CHECK' | 'WEBSITE_BUILD';

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

export const REMEDIATION_RATE_CARD = {
    currency: 'EUR',
    market: 'Bulgaria',
    reviewedAt: '2026-09-10',
    baseBySource: {
        WEBSITE_INSPECTOR: 35,
        EMAIL_DOMAIN_SECURITY: 45,
        SITE_CRAWL: 45,
        ACCESSIBILITY_CHECK: 55,
        WEBSITE_BUILD: 95,
    },
    costByComplexity: {
        simple: { min: 10, max: 22 },
        moderate: { min: 22, max: 48 },
        complex: { min: 42, max: 90 },
        specialist: { min: 70, max: 140 },
    },
    severity: {
        warning: 1,
        fail: 1.25,
    },
    affectedItems: {
        cap: 12,
        minEach: 4,
        maxEach: 8,
    },
    bundleModifiers: {
        threePlus: 0.9,
        sixPlus: 0.82,
    },
    cmsModifiers: {
        wordpress: 1,
        woocommerce: 1.12,
        'next.js': 1.08,
        shopify: 1.12,
        custom: 1.22,
        other: 1.12,
        unknown: 1.06,
    },
    accessModifiers: {
        'both available': 0.9,
        'hosting access available': 1,
        'cms admin access available': 1,
        'no access yet': 1.18,
        'need guidance': 1.06,
    },
    caps: {
        min: 590,
        max: 790,
    },
} as const;

export const WEBSITE_BUILD_RATE_CARD = {
    baseByType: {
        'site-landing': { min: 199, max: 299 },
        'site-portfolio': { min: 299, max: 449 },
        'site-business': { min: 399, max: 599 },
        'site-blog': { min: 449, max: 699 },
        'site-store': { min: 749, max: 1190 },
        'site-custom': { min: 990, max: 1690 },
    },
    additions: {
        'pages-4-7': { min: 80, max: 140 },
        'pages-8-15': { min: 190, max: 340 },
        'pages-16-plus': { min: 390, max: 690 },
        'design-custom': { min: 140, max: 260 },
        'design-premium': { min: 340, max: 620 },
        'feature-contact': { min: 25, max: 45 },
        'feature-blog': { min: 90, max: 160 },
        'feature-bilingual': { min: 140, max: 260 },
        'feature-booking': { min: 190, max: 390 },
        'feature-commerce': { min: 290, max: 590 },
        'feature-payments': { min: 140, max: 280 },
        'feature-accounts': { min: 240, max: 490 },
        'feature-integrations': { min: 160, max: 390 },
        'feature-seo': { min: 70, max: 140 },
        'feature-content-entry': { min: 90, max: 260 },
        'feature-copywriting': { min: 140, max: 390 },
        'feature-domain': { min: 20, max: 40 },
        'feature-hosting': { min: 35, max: 70 },
        'deadline-priority': { min: 180, max: 490 },
    },
} as const;

function estimateWebsiteBuild(issues: ServiceRequestIssue[]) {
    const ids = new Set(issues.map((issue) => issue.id));
    const typeId = Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType).find((id) => ids.has(id)) as keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType | undefined;
    const base = WEBSITE_BUILD_RATE_CARD.baseByType[typeId ?? 'site-business'];
    let min = base.min;
    let max = base.max;
    for (const [id, addition] of Object.entries(WEBSITE_BUILD_RATE_CARD.additions)) {
        if (!ids.has(id)) continue;
        min += addition.min;
        max += addition.max;
    }
    return {
        min: roundFive(min),
        max: roundFive(max),
        currency: REMEDIATION_RATE_CARD.currency,
        breakdown: { complexity: { simple: 0, moderate: 0, complex: 0, specialist: 0 }, additionalAffectedItems: 0, cmsModifier: 1, accessModifier: 1, bundleModifier: 1 },
    };
}

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
    WEBSITE_BUILD: {
        'site-landing': 'moderate',
        'site-portfolio': 'complex',
        'site-business': 'complex',
        'site-blog': 'complex',
        'site-store': 'specialist',
        'site-custom': 'specialist',
        'pages-4-7': 'moderate',
        'pages-8-15': 'complex',
        'pages-16-plus': 'specialist',
        'design-custom': 'complex',
        'design-premium': 'specialist',
        'feature-contact': 'simple',
        'feature-blog': 'moderate',
        'feature-bilingual': 'complex',
        'feature-booking': 'complex',
        'feature-commerce': 'specialist',
        'feature-payments': 'specialist',
        'feature-accounts': 'specialist',
        'feature-integrations': 'complex',
        'feature-seo': 'moderate',
        'feature-content-entry': 'moderate',
        'feature-copywriting': 'complex',
        'feature-domain': 'simple',
        'feature-hosting': 'moderate',
        'deadline-priority': 'complex',
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
    if (source === 'WEBSITE_BUILD') return estimateWebsiteBuild(issues);
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
