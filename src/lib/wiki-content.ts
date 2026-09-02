import { plainTextToWikiHtml } from '@/lib/wiki-articles';

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
    eyebrow: 'Personal knowledge base',
    title: 'Nikola Stoyanov',
    subtitle: 'Also known as Nicholas Stoyanov · Dr Necrotix · Necrotix',
    lead: 'Nikola Stoyanov is a Bulgarian multidisciplinary creator with a background spanning technical and industrial work, digital design, software projects, online communities and dark-themed writing. Under the Dr Necrotix identity, his public work combines engineering structure with visual experimentation, gaming culture and introspective storytelling.',
    portrait: '',
    portraitCaption: 'Public profile',
    aliases: ['Nikola Stoyanov', 'Nicholas Stoyanov', 'Dr Necrotix', 'Necrotix', 'Mr Necrotic'],
    showContents: true,
    showInfobox: true,
    infoboxTitle: 'Profile',
    infoboxRows: [
        { id: 'native-name', label: 'Native name', value: 'Никола Стоянов', href: '', enabled: true },
        { id: 'born', label: 'Born', value: '15 March 1996 · Karnobat, Bulgaria', href: '', enabled: true },
        { id: 'nationality', label: 'Nationality', value: 'Bulgarian', href: '', enabled: true },
        { id: 'residence', label: 'Residence', value: 'Kermen, Bulgaria', href: '', enabled: true },
        { id: 'known-as', label: 'Also known as', value: 'Nicholas Stoyanov · Dr Necrotix · Necrotix', href: '', enabled: true },
        { id: 'occupation', label: 'Occupation', value: 'Technical operator · digital creator · designer · poet', href: '', enabled: true },
        { id: 'education', label: 'Education', value: 'Digital Design · locomotive systems and rail engineering', href: '/journey', enabled: true },
        { id: 'organizations', label: 'Organizations', value: 'Kreatrics · BG-GAMER', href: '', enabled: true },
        { id: 'style', label: 'Creative style', value: 'Dark poetry · digital art · black and mysterious aesthetics', href: '/blog', enabled: true },
        { id: 'height', label: 'Height', value: '187 cm', href: '', enabled: true },
        { id: 'website', label: 'Website', value: 'Necrotix Lab', href: '/', enabled: true },
    ],
    sections: [
        { id: 'early-life', title: 'Early life', body: 'Nikola Stoyanov was born in Karnobat, Bulgaria. During childhood his family spent time in Burgas, where digital culture and local creative subcultures became part of his environment. He later returned to Karnobat and completed his secondary education at Hristo Botev High School.', enabled: true },
        { id: 'education', title: 'Education', body: 'His education combines creative and technical disciplines. He studied Digital Design through SoftUni Creative and later continued professional technical education at Todor Kableshkov University of Transport in Sofia, with a focus on locomotive systems and rail engineering.', enabled: true },
        { id: 'career', title: 'Career', body: 'Stoyanov has worked in industrial and transport roles alongside his digital practice. Public biographical information lists work as a CNC/CPU operator and programmer at KAMT AD from 2016 to 2018, a train operator at BDZ Cargo from 2019 to 2022, and Operator LK32 at Mini Maritsa Iztok AD from 2022 onward.\n\nHis technical background includes CNC hydraulic machinery, CAD and G-code programming, and work with locomotive systems. In parallel, he has continued developing projects in digital media, web technology, design and content creation.', enabled: true },
        { id: 'artistic-work', title: 'Artistic work', body: 'Under the artistic identity Dr Necrotix, Stoyanov works with poetry, digital art and dark visual aesthetics influenced by cyber culture, gaming and introspective storytelling.\n\nTwo recurring literary projects are “До моята Луна” (To My Moon), developed as a dark-poetry digital project, and “Гарванова История” (Raven Story), which expands the same creative universe through themes of decay, rebirth and identity. The broader visual language often treats imperfection, ruin and transformation as sources of meaning rather than defects to be hidden.', enabled: true },
        { id: 'digital-projects', title: 'Digital projects and communities', body: 'His online work extends beyond personal publishing into software, infrastructure and community projects. Kreatrics and BG-GAMER are recurring parts of that ecosystem, while Necrotix Lab serves as the public portfolio and experimental layer connecting development, design, automation and creative work. Current technical work is documented in the Projects archive and The Lab.', enabled: true },
        { id: 'online-presence', title: 'Online presence', body: 'Stoyanov has used several connected online identities, including Nicholas Stoyanov, Dr Necrotix, dr.necrotix and mr.necrotix. His public profiles have been used for poetry, visual work, gaming, technical projects and personal publishing. Necrotix Lab now acts as the maintained reference point for this work rather than relying on a single social platform.', enabled: true },
        { id: 'personal-profile', title: 'Personal profile', body: 'Outside professional and technical work, his recurring interests include gaming, digital design and writing. He has publicly described himself as introverted and drawn to quiet, late-night creative work. A recurring theme across his projects is the contrast between engineering structure and emotional or symbolic expression.', enabled: true },
    ],
    showTimeline: true,
    timelineTitle: 'Selected chronology',
    timeline: [
        { id: 'born-1996', period: '1996', title: 'Born in Karnobat', body: 'Born on 15 March 1996 in Karnobat, Bulgaria.', href: '', enabled: true },
        { id: 'kamt-2016', period: '2016–2018', title: 'KAMT AD', body: 'Worked as a CNC/CPU operator and programmer.', href: '', enabled: true },
        { id: 'bdz-2019', period: '2019–2022', title: 'BDZ Cargo', body: 'Worked as a train operator in rail transport.', href: '', enabled: true },
        { id: 'mmi-2022', period: '2022–present', title: 'Mini Maritsa Iztok AD', body: 'Technical and operational work as Operator LK32.', href: '', enabled: true },
        { id: 'creative-practice', period: 'Ongoing', title: 'Dr Necrotix creative practice', body: 'Poetry, digital art, design, software experiments and online community projects.', href: '/projects', enabled: true },
    ],
    showRelatedLinks: true,
    relatedTitle: 'Related pages and sources',
    relatedLinks: [
        { id: 'projects', label: 'Projects', href: '/projects', note: 'Selected software, systems and experiments.', enabled: true },
        { id: 'journal', label: 'Journal', href: '/blog', note: 'Writing, poetry and longer-form thoughts.', enabled: true },
        { id: 'journey', label: 'Journey', href: '/journey', note: 'Education, experience and professional chronology.', enabled: true },
        { id: 'lab', label: 'The Lab', href: '/lab', note: 'Capabilities, toolchain and GitHub-backed technical proof.', enabled: true },
        { id: 'everybodywiki', label: 'EverybodyWiki biography', href: 'https://en.everybodywiki.com/Nicholas_Stoyanov', note: 'Public biography used as one source for the initial editable Wiki draft.', enabled: true },
    ],
    footerNote: 'This is a living document maintained through the Necrotix Lab CMS. The initial biographical draft was adapted from publicly available information, including the EverybodyWiki biography, and can be corrected, expanded or removed at any time from Admin → Personal Wiki.',
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
            body: plainTextToWikiHtml(section.body).slice(0, 30_000),
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
        eyebrow: text(input.eyebrow, defaultPersonalWikiContent.eyebrow, 80),
        title: text(input.title, defaultPersonalWikiContent.title, 120),
        subtitle: text(input.subtitle, defaultPersonalWikiContent.subtitle, 200),
        lead: plainTextToWikiHtml(input.lead || defaultPersonalWikiContent.lead).slice(0, 20_000),
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
