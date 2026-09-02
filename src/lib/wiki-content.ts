export const PERSONAL_WIKI_CONFIG_SLUG = '__personal-wiki-config';

export type WikiInfoboxRow = {
    id: string;
    label: string;
    value: string;
    href: string;
    enabled: boolean;
};

export type WikiSection = {
    id: string;
    title: string;
    body: string;
    enabled: boolean;
};

export type WikiTimelineEntry = {
    id: string;
    period: string;
    title: string;
    body: string;
    href: string;
    enabled: boolean;
};

export type WikiRelatedLink = {
    id: string;
    label: string;
    href: string;
    note: string;
    enabled: boolean;
};

export type PersonalWikiContent = {
    enabled: boolean;
    showInNavigation: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    lead: string;
    portrait: string;
    portraitCaption: string;
    aliases: string[];
    showContents: boolean;
    showInfobox: boolean;
    infoboxTitle: string;
    infoboxRows: WikiInfoboxRow[];
    sections: WikiSection[];
    showTimeline: boolean;
    timelineTitle: string;
    timeline: WikiTimelineEntry[];
    showRelatedLinks: boolean;
    relatedTitle: string;
    relatedLinks: WikiRelatedLink[];
    footerNote: string;
};

export const defaultPersonalWikiContent: PersonalWikiContent = {
    enabled: true,
    showInNavigation: true,
    eyebrow: 'Personal knowledge base',
    title: 'Dr Necrotix',
    subtitle: 'Developer · Designer · Digital creator',
    lead: 'A living index of my public identity, work, experiments and ideas. This page connects the portfolio into one maintained reference instead of reducing it to a conventional About page.',
    portrait: '',
    portraitCaption: 'Public profile',
    aliases: ['Dr Necrotix', 'drnecrotix'],
    showContents: true,
    showInfobox: true,
    infoboxTitle: 'Profile',
    infoboxRows: [
        { id: 'identity', label: 'Known as', value: 'Dr Necrotix', href: '', enabled: true },
        { id: 'focus', label: 'Focus', value: 'Development · Design · Creative technology', href: '/lab', enabled: true },
        { id: 'base', label: 'Base', value: 'Necrotix Lab', href: '/', enabled: true },
    ],
    sections: [
        {
            id: 'overview',
            title: 'Overview',
            body: 'I build and maintain digital systems across software, infrastructure, automation, design and community projects. The portfolio is treated as an evolving laboratory rather than a static résumé.\n\nThis wiki is the compact reference layer: a place for context, identity, recurring themes and links to the deeper parts of the site.',
            enabled: true,
        },
        {
            id: 'work',
            title: 'Work and practice',
            body: 'My work combines practical engineering with visual and product thinking. The exact stack changes between projects, while the underlying goal remains the same: build useful systems, understand how they behave, and keep them maintainable.',
            enabled: true,
        },
        {
            id: 'projects',
            title: 'Projects and experiments',
            body: 'Projects range from web applications and automation to infrastructure, creative technology and community systems. Public work is documented in the Projects archive and the Lab, where tools are connected to real repositories instead of arbitrary proficiency percentages.',
            enabled: true,
        },
    ],
    showTimeline: true,
    timelineTitle: 'Selected chronology',
    timeline: [
        { id: 'journey', period: 'Journey', title: 'Experience and education', body: 'A chronological view of professional experience, education and milestones.', href: '/journey', enabled: true },
        { id: 'lab', period: 'Lab', title: 'Current capabilities', body: 'Technologies, systems and tools connected to the work they are used in.', href: '/lab', enabled: true },
    ],
    showRelatedLinks: true,
    relatedTitle: 'Related pages',
    relatedLinks: [
        { id: 'projects', label: 'Projects', href: '/projects', note: 'Selected products, systems and experiments.', enabled: true },
        { id: 'journal', label: 'Journal', href: '/blog', note: 'Writing, notes, poetry and longer-form thoughts.', enabled: true },
        { id: 'journey', label: 'Journey', href: '/journey', note: 'Education, experience and chronology.', enabled: true },
        { id: 'lab', label: 'The Lab', href: '/lab', note: 'Capabilities, toolchain and GitHub-backed proof.', enabled: true },
    ],
    footerNote: 'This is a living document. Details are updated as the work, identity and archive evolve.',
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, max: number) {
    const normalized = String(value ?? '').trim();
    return (normalized || fallback).slice(0, max);
}

function optionalText(value: unknown, max: number) {
    return String(value ?? '').trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function safeId(value: unknown, fallback: string) {
    const normalized = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return (normalized || fallback).slice(0, 80);
}

function normalizeHref(value: unknown) {
    const href = String(value ?? '').trim().slice(0, 2048);
    if (!href) return '';
    if (href.startsWith('/') && !href.startsWith('//')) return href;
    try {
        const url = new URL(href);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : '';
    } catch {
        return '';
    }
}

function normalizeAliases(value: unknown) {
    if (!Array.isArray(value)) return defaultPersonalWikiContent.aliases;
    return value.map((item) => optionalText(item, 80)).filter(Boolean).slice(0, 12);
}

function normalizeInfoboxRows(value: unknown): WikiInfoboxRow[] {
    if (!Array.isArray(value)) return defaultPersonalWikiContent.infoboxRows;
    return value.slice(0, 30).map((item, index) => {
        const row = record(item);
        return {
            id: safeId(row.id, `fact-${index + 1}`),
            label: optionalText(row.label, 80),
            value: optionalText(row.value, 300),
            href: normalizeHref(row.href),
            enabled: bool(row.enabled, true),
        };
    }).filter((item) => item.label && item.value);
}

function normalizeSections(value: unknown): WikiSection[] {
    if (!Array.isArray(value)) return defaultPersonalWikiContent.sections;
    return value.slice(0, 30).map((item, index) => {
        const section = record(item);
        return {
            id: safeId(section.id, `section-${index + 1}`),
            title: optionalText(section.title, 120),
            body: optionalText(section.body, 12_000),
            enabled: bool(section.enabled, true),
        };
    }).filter((item) => item.title && item.body);
}

function normalizeTimeline(value: unknown): WikiTimelineEntry[] {
    if (!Array.isArray(value)) return defaultPersonalWikiContent.timeline;
    return value.slice(0, 40).map((item, index) => {
        const entry = record(item);
        return {
            id: safeId(entry.id, `timeline-${index + 1}`),
            period: optionalText(entry.period, 80),
            title: optionalText(entry.title, 160),
            body: optionalText(entry.body, 1000),
            href: normalizeHref(entry.href),
            enabled: bool(entry.enabled, true),
        };
    }).filter((item) => item.period && item.title);
}

function normalizeRelatedLinks(value: unknown): WikiRelatedLink[] {
    if (!Array.isArray(value)) return defaultPersonalWikiContent.relatedLinks;
    return value.slice(0, 30).map((item, index) => {
        const link = record(item);
        return {
            id: safeId(link.id, `link-${index + 1}`),
            label: optionalText(link.label, 100),
            href: normalizeHref(link.href),
            note: optionalText(link.note, 300),
            enabled: bool(link.enabled, true),
        };
    }).filter((item) => item.label && item.href);
}

export function normalizePersonalWikiContent(value: unknown): PersonalWikiContent {
    const input = record(value);
    return {
        enabled: bool(input.enabled, defaultPersonalWikiContent.enabled),
        showInNavigation: bool(input.showInNavigation, defaultPersonalWikiContent.showInNavigation),
        eyebrow: text(input.eyebrow, defaultPersonalWikiContent.eyebrow, 80),
        title: text(input.title, defaultPersonalWikiContent.title, 120),
        subtitle: text(input.subtitle, defaultPersonalWikiContent.subtitle, 200),
        lead: text(input.lead, defaultPersonalWikiContent.lead, 1800),
        portrait: optionalText(input.portrait, 2048),
        portraitCaption: text(input.portraitCaption, defaultPersonalWikiContent.portraitCaption, 160),
        aliases: normalizeAliases(input.aliases),
        showContents: bool(input.showContents, defaultPersonalWikiContent.showContents),
        showInfobox: bool(input.showInfobox, defaultPersonalWikiContent.showInfobox),
        infoboxTitle: text(input.infoboxTitle, defaultPersonalWikiContent.infoboxTitle, 100),
        infoboxRows: normalizeInfoboxRows(input.infoboxRows),
        sections: normalizeSections(input.sections),
        showTimeline: bool(input.showTimeline, defaultPersonalWikiContent.showTimeline),
        timelineTitle: text(input.timelineTitle, defaultPersonalWikiContent.timelineTitle, 120),
        timeline: normalizeTimeline(input.timeline),
        showRelatedLinks: bool(input.showRelatedLinks, defaultPersonalWikiContent.showRelatedLinks),
        relatedTitle: text(input.relatedTitle, defaultPersonalWikiContent.relatedTitle, 120),
        relatedLinks: normalizeRelatedLinks(input.relatedLinks),
        footerNote: text(input.footerNote, defaultPersonalWikiContent.footerNote, 500),
    };
}
