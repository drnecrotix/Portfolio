export type FooterLinkSetting = {
    label: string;
    href: string;
};

export type FooterSettings = {
    compactName: string;
    compactSecondary: string;
    moreLabel: string;
    linksHeading: string;
    socialsHeading: string;
    localTimeHeading: string;
    versionHeading: string;
    editionText: string;
    brandText: string;
    timezone: string;
    locationText: string;
    locationUrl: string;
    email: string;
    githubUrl: string;
    linkedinUrl: string;
    instagramUrl: string;
    workspaceUrl: string;
    marquee: string[];
    quickLinks: FooterLinkSetting[];
    aboutLabel: string;
    aboutLinks: FooterLinkSetting[];
};

const legalOverviewLink: FooterLinkSetting = { label: 'Legal & Privacy', href: '/legal' };

export const defaultFooterSettings: FooterSettings = {
    compactName: 'Dr Necrotix.',
    compactSecondary: 'All rights reserved.',
    moreLabel: 'More info',
    linksHeading: 'Links',
    socialsHeading: 'Social',
    localTimeHeading: 'Local time',
    versionHeading: 'Version',
    editionText: '2026 © Edition',
    brandText: 'DR NECROTIX',
    timezone: 'Europe/Sofia',
    locationText: 'Bulgaria',
    locationUrl: 'https://www.google.com/maps/search/?api=1&query=Bulgaria',
    email: '',
    githubUrl: 'https://github.com/drnecrotix',
    linkedinUrl: '',
    instagramUrl: 'https://instagram.com/dr.necrotix',
    workspaceUrl: '/projects',
    marquee: [
        'Frontend development',
        'Backend architecture',
        'UI / UX design',
        'Creative coding',
        'System optimization',
        'Open for opportunities',
    ],
    quickLinks: [
        { label: 'Home', href: '/' },
        { label: 'Resume', href: '/resume' },
        { label: 'Contact', href: '/contact' },
        legalOverviewLink,
    ],
    aboutLabel: 'About',
    aboutLinks: [
        { label: 'Achievements', href: '/achievements' },
        { label: 'Lab', href: '/lab' },
        { label: 'Journey', href: '/journey' },
        { label: 'Projects', href: '/projects' },
        { label: 'Blog', href: '/blog' },
        { label: 'Gallery', href: '/gallery' },
    ],
};

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, max = 500) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function links(value: unknown, fallback: FooterLinkSetting[], maxItems: number) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value.slice(0, maxItems).map((item, index) => {
        const source = object(item);
        const base = fallback[index] ?? { label: `Link ${index + 1}`, href: '#' };
        return {
            label: text(source.label, base.label, 80),
            href: text(source.href, base.href, 2048),
        };
    }).filter((item) => item.label && item.href);
    return normalized.length ? normalized : fallback;
}

function normalizeInternalLink(item: FooterLinkSetting): FooterLinkSetting {
    if (item.href === '/experience') {
        return { label: /^experience$/i.test(item.label) ? 'Journey' : item.label, href: '/journey' };
    }
    if (item.href === '/skills') {
        return { label: /^skills$/i.test(item.label) ? 'Lab' : item.label, href: '/lab' };
    }
    return item;
}

function ensureLegalOverviewLink(items: FooterLinkSetting[]) {
    return items.some((item) => item.href === legalOverviewLink.href)
        ? items
        : [...items, legalOverviewLink];
}

export function normalizeFooterSettings(value: unknown): FooterSettings {
    const source = object(value);
    const marquee = Array.isArray(source.marquee)
        ? source.marquee.slice(0, 8).map((item, index) => text(item, defaultFooterSettings.marquee[index] ?? 'Creative work', 120))
        : defaultFooterSettings.marquee;

    return {
        compactName: text(source.compactName, defaultFooterSettings.compactName, 120),
        compactSecondary: text(source.compactSecondary, defaultFooterSettings.compactSecondary, 120),
        moreLabel: text(source.moreLabel, defaultFooterSettings.moreLabel, 60),
        linksHeading: text(source.linksHeading, defaultFooterSettings.linksHeading, 60),
        socialsHeading: text(source.socialsHeading, defaultFooterSettings.socialsHeading, 60),
        localTimeHeading: text(source.localTimeHeading, defaultFooterSettings.localTimeHeading, 60),
        versionHeading: text(source.versionHeading, defaultFooterSettings.versionHeading, 60),
        editionText: text(source.editionText, defaultFooterSettings.editionText, 120),
        brandText: text(source.brandText, defaultFooterSettings.brandText, 120),
        timezone: text(source.timezone, defaultFooterSettings.timezone, 100),
        locationText: text(source.locationText, defaultFooterSettings.locationText, 160),
        locationUrl: text(source.locationUrl, defaultFooterSettings.locationUrl, 2048),
        email: typeof source.email === 'string' ? source.email.trim().slice(0, 254) : defaultFooterSettings.email,
        githubUrl: typeof source.githubUrl === 'string' ? source.githubUrl.trim().slice(0, 2048) : defaultFooterSettings.githubUrl,
        linkedinUrl: typeof source.linkedinUrl === 'string' ? source.linkedinUrl.trim().slice(0, 2048) : defaultFooterSettings.linkedinUrl,
        instagramUrl: typeof source.instagramUrl === 'string' ? source.instagramUrl.trim().slice(0, 2048) : defaultFooterSettings.instagramUrl,
        workspaceUrl: text(source.workspaceUrl, defaultFooterSettings.workspaceUrl, 2048),
        marquee: marquee.length ? marquee : defaultFooterSettings.marquee,
        quickLinks: ensureLegalOverviewLink(links(source.quickLinks, defaultFooterSettings.quickLinks, 6).map(normalizeInternalLink)),
        aboutLabel: text(source.aboutLabel, defaultFooterSettings.aboutLabel, 80),
        aboutLinks: links(source.aboutLinks, defaultFooterSettings.aboutLinks, 8).map(normalizeInternalLink),
    };
}
