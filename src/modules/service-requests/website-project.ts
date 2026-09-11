export type WebsiteProjectType = 'landing' | 'business' | 'portfolio' | 'blog' | 'ecommerce' | 'webapp';
export type WebsiteDesignLevel = 'starter' | 'custom' | 'premium';
export type WebsiteCms = 'none' | 'wordpress' | 'headless' | 'custom';
export type WebsiteContentSupport = 'ready' | 'assistance' | 'full';
export type WebsiteSeoLevel = 'basic' | 'advanced';
export type WebsiteHosting = 'existing' | 'setup' | 'managed';
export type WebsiteDeadline = 'flexible' | 'standard' | 'priority';
export type WebsiteMaintenance = 'none' | 'monthly';
export type WebsiteIntegration = 'analytics' | 'newsletter' | 'booking' | 'payments' | 'crm' | 'search' | 'accounts' | 'roles' | 'custom_api';

export type WebsiteProjectScope = {
    projectType: WebsiteProjectType;
    pages: number;
    design: WebsiteDesignLevel;
    cms: WebsiteCms;
    languages: number;
    content: WebsiteContentSupport;
    seo: WebsiteSeoLevel;
    hosting: WebsiteHosting;
    deadline: WebsiteDeadline;
    maintenance: WebsiteMaintenance;
    integrations: WebsiteIntegration[];
};

export type WebsiteProjectScopeLine = {
    id: string;
    label: string;
    status: 'scope';
    summary: string;
};

const projectTypes: WebsiteProjectType[] = ['landing', 'business', 'portfolio', 'blog', 'ecommerce', 'webapp'];
const designs: WebsiteDesignLevel[] = ['starter', 'custom', 'premium'];
const cmsOptions: WebsiteCms[] = ['none', 'wordpress', 'headless', 'custom'];
const contentOptions: WebsiteContentSupport[] = ['ready', 'assistance', 'full'];
const seoOptions: WebsiteSeoLevel[] = ['basic', 'advanced'];
const hostingOptions: WebsiteHosting[] = ['existing', 'setup', 'managed'];
const deadlineOptions: WebsiteDeadline[] = ['flexible', 'standard', 'priority'];
const maintenanceOptions: WebsiteMaintenance[] = ['none', 'monthly'];
const integrationOptions: WebsiteIntegration[] = ['analytics', 'newsletter', 'booking', 'payments', 'crm', 'search', 'accounts', 'roles', 'custom_api'];

export const WEBSITE_PROJECT_RATE_CARD = {
    currency: 'EUR',
    market: 'Bulgaria',
    reviewedAt: '2026-09-11',
    base: {
        landing: { min: 250, max: 420, includedPages: 1, weeks: [1, 2] },
        business: { min: 450, max: 780, includedPages: 5, weeks: [2, 4] },
        portfolio: { min: 350, max: 620, includedPages: 5, weeks: [2, 3] },
        blog: { min: 550, max: 920, includedPages: 6, weeks: [3, 5] },
        ecommerce: { min: 900, max: 1550, includedPages: 8, weeks: [4, 7] },
        webapp: { min: 1400, max: 2500, includedPages: 5, weeks: [5, 10] },
    },
} as const;

export const websiteProjectLabels = {
    projectType: {
        landing: 'Landing page', business: 'Business website', portfolio: 'Portfolio', blog: 'Blog / content site', ecommerce: 'Online store', webapp: 'Custom web application',
    } satisfies Record<WebsiteProjectType, string>,
    design: { starter: 'Starter / adapted design system', custom: 'Custom visual design', premium: 'Premium bespoke design' } satisfies Record<WebsiteDesignLevel, string>,
    cms: { none: 'No CMS required', wordpress: 'WordPress', headless: 'Headless CMS', custom: 'Custom administration' } satisfies Record<WebsiteCms, string>,
    content: { ready: 'Content is ready', assistance: 'Content needs assistance', full: 'Content preparation required' } satisfies Record<WebsiteContentSupport, string>,
    seo: { basic: 'Technical SEO basics', advanced: 'Advanced SEO setup' } satisfies Record<WebsiteSeoLevel, string>,
    hosting: { existing: 'Existing hosting', setup: 'Hosting setup required', managed: 'Managed hosting requested' } satisfies Record<WebsiteHosting, string>,
    deadline: { flexible: 'Flexible timeline', standard: 'Standard timeline', priority: 'Priority delivery' } satisfies Record<WebsiteDeadline, string>,
    maintenance: { none: 'No ongoing maintenance yet', monthly: 'Monthly maintenance requested' } satisfies Record<WebsiteMaintenance, string>,
    integration: {
        analytics: 'Analytics', newsletter: 'Newsletter', booking: 'Booking / appointments', payments: 'Online payments', crm: 'CRM integration', search: 'Advanced search', accounts: 'Customer accounts', roles: 'User roles / permissions', custom_api: 'Custom API integration',
    } satisfies Record<WebsiteIntegration, string>,
};

const designCost: Record<WebsiteDesignLevel, [number, number]> = { starter: [0, 0], custom: [180, 320], premium: [420, 700] };
const cmsCost: Record<WebsiteCms, [number, number]> = { none: [0, 0], wordpress: [90, 180], headless: [220, 420], custom: [420, 850] };
const integrationCost: Record<WebsiteIntegration, [number, number]> = {
    analytics: [25, 60], newsletter: [60, 120], booking: [120, 240], payments: [180, 340], crm: [160, 320], search: [90, 190], accounts: [220, 430], roles: [160, 320], custom_api: [300, 650],
};

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T { return typeof value === 'string' && options.includes(value as T); }
function boundedInteger(value: unknown, min: number, max: number) { const parsed = Number(value); if (!Number.isFinite(parsed)) return null; const rounded = Math.round(parsed); return rounded >= min && rounded <= max ? rounded : null; }
function roundTen(value: number) { return Math.max(0, Math.round(value / 10) * 10); }

export function parseWebsiteProjectScope(value: unknown): WebsiteProjectScope | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const pages = boundedInteger(raw.pages, 1, 40);
    const languages = boundedInteger(raw.languages, 1, 6);
    if (!pages || !languages) return null;
    if (!isOneOf(raw.projectType, projectTypes) || !isOneOf(raw.design, designs) || !isOneOf(raw.cms, cmsOptions)) return null;
    if (!isOneOf(raw.content, contentOptions) || !isOneOf(raw.seo, seoOptions) || !isOneOf(raw.hosting, hostingOptions)) return null;
    if (!isOneOf(raw.deadline, deadlineOptions) || !isOneOf(raw.maintenance, maintenanceOptions) || !Array.isArray(raw.integrations)) return null;
    const integrations = [...new Set(raw.integrations)].filter((item): item is WebsiteIntegration => isOneOf(item, integrationOptions));
    if (integrations.length !== raw.integrations.length || integrations.length > integrationOptions.length) return null;
    return { projectType: raw.projectType, pages, design: raw.design, cms: raw.cms, languages, content: raw.content, seo: raw.seo, hosting: raw.hosting, deadline: raw.deadline, maintenance: raw.maintenance, integrations };
}

export function estimateWebsiteProject(scope: WebsiteProjectScope) {
    const base = WEBSITE_PROJECT_RATE_CARD.base[scope.projectType];
    let min = base.min;
    let max = base.max;
    const extraPages = Math.max(0, scope.pages - base.includedPages);
    min += extraPages * (scope.projectType === 'webapp' ? 55 : 30);
    max += extraPages * (scope.projectType === 'webapp' ? 95 : 55);
    const [designMin, designMax] = designCost[scope.design]; min += designMin; max += designMax;
    const [cmsMin, cmsMax] = cmsCost[scope.cms]; min += cmsMin; max += cmsMax;
    const extraLanguages = Math.max(0, scope.languages - 1); min += extraLanguages * 110; max += extraLanguages * 190;
    if (scope.content === 'assistance') { min += 90; max += 180; }
    if (scope.content === 'full') { min += 240; max += 480; }
    if (scope.seo === 'advanced') { min += 170; max += 340; }
    if (scope.hosting === 'setup') { min += 50; max += 120; }
    if (scope.hosting === 'managed') { min += 90; max += 180; }
    for (const integration of scope.integrations) { const [a, b] = integrationCost[integration]; min += a; max += b; }
    if (scope.deadline === 'flexible') { min *= 0.95; max *= 0.95; }
    if (scope.deadline === 'priority') { min *= 1.2; max *= 1.28; }
    const featureLoad = scope.integrations.reduce((total, integration) => total + (['custom_api', 'accounts', 'roles', 'payments'].includes(integration) ? 2 : 1), 0);
    const extraWeeks = Math.ceil(extraPages / 6) + Math.ceil(featureLoad / 4) + Math.max(0, scope.languages - 2);
    let weeksMin = base.weeks[0] + Math.floor(extraWeeks / 2);
    let weeksMax = base.weeks[1] + extraWeeks;
    if (scope.deadline === 'priority') { weeksMin = Math.max(1, weeksMin - 1); weeksMax = Math.max(weeksMin, weeksMax - 1); }
    const roundedMin = roundTen(min);
    return { min: roundedMin, max: Math.max(roundedMin + 50, roundTen(max)), currency: WEBSITE_PROJECT_RATE_CARD.currency, weeks: { min: weeksMin, max: weeksMax }, maintenanceQuotedSeparately: scope.maintenance === 'monthly' };
}

export function websiteProjectScopeLines(scope: WebsiteProjectScope): WebsiteProjectScopeLine[] {
    const integrations = scope.integrations.length ? scope.integrations.map((item) => websiteProjectLabels.integration[item]).join(', ') : 'No additional integrations selected';
    return [
        { id: 'project-type', label: 'Website type', status: 'scope', summary: websiteProjectLabels.projectType[scope.projectType] },
        { id: 'page-scope', label: 'Page scope', status: 'scope', summary: `${scope.pages} page${scope.pages === 1 ? '' : 's'} · ${scope.languages} language${scope.languages === 1 ? '' : 's'}` },
        { id: 'design', label: 'Design', status: 'scope', summary: websiteProjectLabels.design[scope.design] },
        { id: 'cms', label: 'CMS / administration', status: 'scope', summary: websiteProjectLabels.cms[scope.cms] },
        { id: 'content-seo', label: 'Content & SEO', status: 'scope', summary: `${websiteProjectLabels.content[scope.content]} · ${websiteProjectLabels.seo[scope.seo]}` },
        { id: 'integrations', label: 'Features & integrations', status: 'scope', summary: integrations },
        { id: 'delivery', label: 'Delivery', status: 'scope', summary: `${websiteProjectLabels.hosting[scope.hosting]} · ${websiteProjectLabels.deadline[scope.deadline]}` },
        { id: 'maintenance', label: 'After launch', status: 'scope', summary: websiteProjectLabels.maintenance[scope.maintenance] },
    ];
}
