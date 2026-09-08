/**
 * Client-safe dork recipe generator (no network).
 * Builds reviewed public-search queries similar to Floe Intel's dorking module.
 */

export type DorkRecipe = {
    id: string;
    label: string;
    category: 'identity' | 'documents' | 'breach' | 'social' | 'domain';
    engines: Array<{
        name: 'Google' | 'DuckDuckGo' | 'Yandex' | 'Bing';
        url: string;
        query: string;
    }>;
};

function encode(q: string) {
    return encodeURIComponent(q);
}

function enginesFor(query: string): DorkRecipe['engines'] {
    return [
        { name: 'Google', url: `https://www.google.com/search?q=${encode(query)}`, query },
        { name: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${encode(query)}`, query },
        { name: 'Yandex', url: `https://yandex.com/search/?text=${encode(query)}`, query },
        { name: 'Bing', url: `https://www.bing.com/search?q=${encode(query)}`, query },
    ];
}

export function buildDorkRecipes(input: {
    queryType: 'email' | 'phone' | 'username';
    query: string;
}): DorkRecipe[] {
    const q = input.query.trim();
    if (!q) return [];

    if (input.queryType === 'email') {
        const local = q.split('@')[0] || q;
        const domain = q.split('@')[1] || '';
        return [
            {
                id: 'email-exact',
                label: 'Exact email mentions',
                category: 'identity',
                engines: enginesFor(`"${q}"`),
            },
            {
                id: 'email-paste',
                label: 'Paste / dump style pages',
                category: 'breach',
                engines: enginesFor(`"${q}" (pastebin OR ghostbin OR rentry OR justpaste OR leak OR breach OR dump)`),
            },
            {
                id: 'email-docs',
                label: 'Documents mentioning the email',
                category: 'documents',
                engines: enginesFor(`"${q}" (filetype:pdf OR filetype:xlsx OR filetype:csv OR filetype:doc OR filetype:txt)`),
            },
            {
                id: 'email-social',
                label: 'Social / profile pages',
                category: 'social',
                engines: enginesFor(`"${q}" (site:linkedin.com OR site:facebook.com OR site:x.com OR site:twitter.com OR site:instagram.com)`),
            },
            ...(domain
                ? [{
                    id: 'domain-org',
                    label: `Organisation / domain context (${domain})`,
                    category: 'domain' as const,
                    engines: enginesFor(`"${domain}" (about OR team OR contact OR staff OR "privacy policy")`),
                }]
                : []),
            {
                id: 'local-handle',
                label: `Handle-style search (${local})`,
                category: 'identity',
                engines: enginesFor(`"${local}" (profile OR username OR "display name")`),
            },
        ];
    }

    if (input.queryType === 'phone') {
        const digits = q.replace(/\D/g, '');
        return [
            {
                id: 'phone-exact',
                label: 'Exact phone mentions',
                category: 'identity',
                engines: enginesFor(`"${q}"`),
            },
            {
                id: 'phone-digits',
                label: 'Digit-only form',
                category: 'identity',
                engines: enginesFor(`"${digits}"`),
            },
            {
                id: 'phone-docs',
                label: 'Documents / listings',
                category: 'documents',
                engines: enginesFor(`"${q}" OR "${digits}" (filetype:pdf OR contact OR directory OR "phone book")`),
            },
        ];
    }

    return [
        {
            id: 'user-exact',
            label: 'Exact username',
            category: 'identity',
            engines: enginesFor(`"${q}"`),
        },
        {
            id: 'user-social',
            label: 'Social profile pages',
            category: 'social',
            engines: enginesFor(`"${q}" (site:github.com OR site:gitlab.com OR site:reddit.com OR site:x.com OR site:instagram.com OR site:tiktok.com OR site:linkedin.com)`),
        },
        {
            id: 'user-bio',
            label: 'Bios / about pages',
            category: 'identity',
            engines: enginesFor(`"${q}" (bio OR "about me" OR profile OR "display name")`),
        },
        {
            id: 'user-paste',
            label: 'Public paste / leak mentions',
            category: 'breach',
            engines: enginesFor(`"${q}" (pastebin OR leak OR breach OR stealer OR combo)`),
        },
    ];
}
