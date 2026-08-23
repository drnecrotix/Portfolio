export type SeoReferrerPolicy = 'no-referrer' | 'origin' | 'no-referrer-when-downgrade' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
export type SeoImagePreview = 'none' | 'standard' | 'large';

export type SeoDefaults = {
    titleDefault: string;
    titleTemplate: string;
    description: string;
    keywords: string[];
    authorName: string;
    creatorName: string;
    publisherName: string;
    applicationName: string;
    locale: string;
    canonicalUrl: string;
    referrerPolicy: SeoReferrerPolicy;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    twitterCreator: string;
    indexSite: boolean;
    followLinks: boolean;
    noArchive: boolean;
    noSnippet: boolean;
    noImageIndex: boolean;
    noTranslate: boolean;
    maxSnippet: number;
    maxImagePreview: SeoImagePreview;
    maxVideoPreview: number;
    googleVerification: string;
    sitemapEnabled: boolean;
    sitemapAutoUpdate: boolean;
    sitemapIncludeBlog: boolean;
    sitemapIncludeProjects: boolean;
    sitemapIncludePages: boolean;
    rssEnabled: boolean;
    rssAutoUpdate: boolean;
    rssTitle: string;
    rssDescription: string;
    rssItemLimit: number;
    rssIncludeProjects: boolean;
};

export const defaultSeoDefaults: SeoDefaults = {
    titleDefault: 'Dr Necrotix | Digital Portfolio',
    titleTemplate: '%s | Dr Necrotix',
    description: 'Personal portfolio of Dr Necrotix - projects, development, design, creative work and digital experiments.',
    keywords: ['Dr Necrotix', 'Nikola Stoyanov', 'portfolio', 'developer', 'design', 'open source', 'digital creator'],
    authorName: 'Nikola Stoyanov',
    creatorName: 'Dr Necrotix',
    publisherName: 'Necrotix Lab',
    applicationName: 'Necrotix Lab',
    locale: 'en_US',
    canonicalUrl: '',
    referrerPolicy: 'strict-origin-when-cross-origin',
    ogTitle: 'Dr Necrotix | Digital Portfolio',
    ogDescription: 'Projects, development, design, creative work and digital experiments.',
    ogImage: '',
    twitterTitle: 'Dr Necrotix | Digital Portfolio',
    twitterDescription: 'Projects, development, design, creative work and digital experiments.',
    twitterImage: '',
    twitterCreator: '',
    indexSite: true,
    followLinks: true,
    noArchive: false,
    noSnippet: false,
    noImageIndex: false,
    noTranslate: false,
    maxSnippet: -1,
    maxImagePreview: 'large',
    maxVideoPreview: -1,
    googleVerification: '',
    sitemapEnabled: true,
    sitemapAutoUpdate: true,
    sitemapIncludeBlog: true,
    sitemapIncludeProjects: true,
    sitemapIncludePages: true,
    rssEnabled: true,
    rssAutoUpdate: true,
    rssTitle: 'Necrotix Lab',
    rssDescription: 'Latest publications and projects from Necrotix Lab.',
    rssItemLimit: 30,
    rssIncludeProjects: true,
};

export function normalizeSeoDefaults(value: unknown): SeoDefaults {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<SeoDefaults> : {};
    const parsedRssItemLimit = Number(source.rssItemLimit);
    const parsedMaxSnippet = Number(source.maxSnippet);
    const parsedMaxVideoPreview = Number(source.maxVideoPreview);
    const validReferrerPolicies: SeoReferrerPolicy[] = ['no-referrer', 'origin', 'no-referrer-when-downgrade', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'];
    const validImagePreviews: SeoImagePreview[] = ['none', 'standard', 'large'];

    return {
        ...defaultSeoDefaults,
        ...source,
        keywords: Array.isArray(source.keywords)
            ? source.keywords.map((item) => String(item).trim()).filter(Boolean)
            : defaultSeoDefaults.keywords,
        referrerPolicy: validReferrerPolicies.includes(source.referrerPolicy as SeoReferrerPolicy) ? source.referrerPolicy as SeoReferrerPolicy : defaultSeoDefaults.referrerPolicy,
        maxImagePreview: validImagePreviews.includes(source.maxImagePreview as SeoImagePreview) ? source.maxImagePreview as SeoImagePreview : defaultSeoDefaults.maxImagePreview,
        indexSite: typeof source.indexSite === 'boolean' ? source.indexSite : defaultSeoDefaults.indexSite,
        followLinks: typeof source.followLinks === 'boolean' ? source.followLinks : defaultSeoDefaults.followLinks,
        noArchive: typeof source.noArchive === 'boolean' ? source.noArchive : defaultSeoDefaults.noArchive,
        noSnippet: typeof source.noSnippet === 'boolean' ? source.noSnippet : defaultSeoDefaults.noSnippet,
        noImageIndex: typeof source.noImageIndex === 'boolean' ? source.noImageIndex : defaultSeoDefaults.noImageIndex,
        noTranslate: typeof source.noTranslate === 'boolean' ? source.noTranslate : defaultSeoDefaults.noTranslate,
        maxSnippet: Number.isFinite(parsedMaxSnippet) ? Math.max(-1, Math.min(10000, Math.round(parsedMaxSnippet))) : defaultSeoDefaults.maxSnippet,
        maxVideoPreview: Number.isFinite(parsedMaxVideoPreview) ? Math.max(-1, Math.min(10000, Math.round(parsedMaxVideoPreview))) : defaultSeoDefaults.maxVideoPreview,
        sitemapEnabled: typeof source.sitemapEnabled === 'boolean' ? source.sitemapEnabled : defaultSeoDefaults.sitemapEnabled,
        sitemapAutoUpdate: typeof source.sitemapAutoUpdate === 'boolean' ? source.sitemapAutoUpdate : defaultSeoDefaults.sitemapAutoUpdate,
        sitemapIncludeBlog: typeof source.sitemapIncludeBlog === 'boolean' ? source.sitemapIncludeBlog : defaultSeoDefaults.sitemapIncludeBlog,
        sitemapIncludeProjects: typeof source.sitemapIncludeProjects === 'boolean' ? source.sitemapIncludeProjects : defaultSeoDefaults.sitemapIncludeProjects,
        sitemapIncludePages: typeof source.sitemapIncludePages === 'boolean' ? source.sitemapIncludePages : defaultSeoDefaults.sitemapIncludePages,
        rssEnabled: typeof source.rssEnabled === 'boolean' ? source.rssEnabled : defaultSeoDefaults.rssEnabled,
        rssAutoUpdate: typeof source.rssAutoUpdate === 'boolean' ? source.rssAutoUpdate : defaultSeoDefaults.rssAutoUpdate,
        rssIncludeProjects: typeof source.rssIncludeProjects === 'boolean' ? source.rssIncludeProjects : defaultSeoDefaults.rssIncludeProjects,
        rssItemLimit: Number.isFinite(parsedRssItemLimit)
            ? Math.min(100, Math.max(1, Math.round(parsedRssItemLimit)))
            : defaultSeoDefaults.rssItemLimit,
    };
}

export function keywordsFromForm(value: FormDataEntryValue | null) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
