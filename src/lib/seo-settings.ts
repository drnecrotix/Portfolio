export type SeoDefaults = {
    titleDefault: string;
    titleTemplate: string;
    description: string;
    keywords: string[];
    authorName: string;
    creatorName: string;
    locale: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    twitterCreator: string;
    indexSite: boolean;
    followLinks: boolean;
    googleVerification: string;
};

export const defaultSeoDefaults: SeoDefaults = {
    titleDefault: 'Dr Necrotix | Digital Portfolio',
    titleTemplate: '%s | Dr Necrotix',
    description: 'Personal portfolio of Dr Necrotix - projects, development, design, creative work and digital experiments.',
    keywords: ['Dr Necrotix', 'Nikola Stoyanov', 'portfolio', 'developer', 'design', 'open source', 'digital creator'],
    authorName: 'Nikola Stoyanov',
    creatorName: 'Dr Necrotix',
    locale: 'en_US',
    ogTitle: 'Dr Necrotix | Digital Portfolio',
    ogDescription: 'Projects, development, design, creative work and digital experiments.',
    ogImage: '',
    twitterTitle: 'Dr Necrotix | Digital Portfolio',
    twitterDescription: 'Projects, development, design, creative work and digital experiments.',
    twitterImage: '',
    twitterCreator: '',
    indexSite: true,
    followLinks: true,
    googleVerification: '',
};

export function normalizeSeoDefaults(value: unknown): SeoDefaults {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<SeoDefaults> : {};
    return {
        ...defaultSeoDefaults,
        ...source,
        keywords: Array.isArray(source.keywords)
            ? source.keywords.map((item) => String(item).trim()).filter(Boolean)
            : defaultSeoDefaults.keywords,
        indexSite: typeof source.indexSite === 'boolean' ? source.indexSite : defaultSeoDefaults.indexSite,
        followLinks: typeof source.followLinks === 'boolean' ? source.followLinks : defaultSeoDefaults.followLinks,
    };
}

export function keywordsFromForm(value: FormDataEntryValue | null) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
