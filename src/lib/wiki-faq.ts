import { sanitizeCmsHtml } from '@/lib/sanitize-cms-html';
import { wikiHtmlToText } from '@/lib/wiki-articles';

export const WIKI_FAQ_CONFIG_SLUG = '__wiki-faq-config';

export type WikiFaqEntry = {
    id: string;
    question: string;
    answer: string;
    category: string;
    keywords: string[];
    enabled: boolean;
    featured: boolean;
};

export type WikiFaqContent = {
    enabled: boolean;
    indexable: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    introHtml: string;
    showSearch: boolean;
    showCategories: boolean;
    featuredFirst: boolean;
    defaultExpanded: boolean;
    items: WikiFaqEntry[];
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max: number) {
    return String(value ?? '').trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function safeId(value: unknown, fallback: string) {
    const normalized = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return (normalized || fallback).slice(0, 80);
}

function normalizeKeywords(value: unknown) {
    const source = Array.isArray(value) ? value : String(value ?? '').split(',');
    return [...new Set(source.map((item) => text(item, 60).toLowerCase()).filter(Boolean))].slice(0, 12);
}

function normalizeItems(value: unknown): WikiFaqEntry[] {
    if (!Array.isArray(value)) return [];
    const ids = new Set<string>();
    return value.slice(0, 120).map((item, index) => {
        const input = record(item);
        let id = safeId(input.id, `faq-${index + 1}`);
        let suffix = 2;
        while (ids.has(id)) id = `${safeId(input.id, 'faq')}-${suffix++}`;
        ids.add(id);
        return {
            id,
            question: text(input.question, 260),
            answer: sanitizeCmsHtml(input.answer).slice(0, 16_000),
            category: text(input.category, 80) || 'General',
            keywords: normalizeKeywords(input.keywords),
            enabled: bool(input.enabled, true),
            featured: bool(input.featured, false),
        };
    }).filter((item) => item.question && wikiHtmlToText(item.answer));
}

const starterQuestions: WikiFaqEntry[] = [
    {
        id: 'who-is-nikola-stoyanov',
        question: 'Who is Nikola Stoyanov?',
        answer: '<p><strong>Nikola Stoyanov</strong> is a Bulgarian technology-focused creator and developer who also uses the creative identity <strong>Dr Necrotix</strong>. His work combines web development, design, community projects, technical experimentation and open-source development.</p>',
        category: 'About',
        keywords: ['nikola stoyanov', 'dr necrotix', 'biography', 'about'],
        enabled: true,
        featured: true,
    },
    {
        id: 'what-is-dr-necrotix',
        question: 'What is Dr Necrotix?',
        answer: '<p><strong>Dr Necrotix</strong> is Nikola Stoyanov’s creative and online identity. It is used across personal technology, design and creative work, and connects projects documented through Necrotix Wiki and Necrotix Lab.</p>',
        category: 'About',
        keywords: ['dr necrotix', 'identity', 'alias', 'creative'],
        enabled: true,
        featured: false,
    },
    {
        id: 'what-is-necrotix-lab',
        question: 'What is Necrotix Lab?',
        answer: '<p><strong>Necrotix Lab</strong> is the personal development and experimentation space behind the portfolio. It presents technologies, systems, design work and practical projects as evidence of real work rather than as arbitrary proficiency percentages.</p>',
        category: 'Projects',
        keywords: ['necrotix lab', 'portfolio', 'development', 'technology'],
        enabled: true,
        featured: true,
    },
    {
        id: 'what-is-bg-gamer',
        question: 'What is BG-GAMER?',
        answer: '<p><strong>BG-GAMER</strong> is a Bulgarian gaming and technology community project maintained by Nikola Stoyanov. It brings together gaming discussions, technical help, community activities and related online services.</p>',
        category: 'Projects',
        keywords: ['bg-gamer', 'gaming', 'community', 'discord'],
        enabled: true,
        featured: true,
    },
    {
        id: 'what-is-kreatrics',
        question: 'What is Kreatrics Technology?',
        answer: '<p><strong>Kreatrics Technology</strong> is a technology-focused umbrella for infrastructure, hosting and connected digital projects. BG-GAMER is maintained as one of the projects associated with the wider Kreatrics ecosystem.</p>',
        category: 'Projects',
        keywords: ['kreatrics', 'hosting', 'technology', 'infrastructure'],
        enabled: true,
        featured: false,
    },
    {
        id: 'is-the-portfolio-open-source',
        question: 'Is the Necrotix Lab portfolio open source?',
        answer: '<p>Yes. The portfolio is developed publicly on GitHub and is designed so improvements can be reviewed through pull requests. The site itself also exposes selected live project and development information through its integrations.</p>',
        category: 'Development',
        keywords: ['github', 'open source', 'portfolio', 'pull request'],
        enabled: true,
        featured: false,
    },
    {
        id: 'what-does-the-wiki-contain',
        question: 'What information is documented in Necrotix Wiki?',
        answer: '<p>Necrotix Wiki is a personal knowledge base containing the main biography, project and community articles, chronology, frequently asked questions and other reference material. The content is maintained from the site’s own CMS and can be expanded over time.</p>',
        category: 'Wiki',
        keywords: ['wiki', 'biography', 'articles', 'faq'],
        enabled: true,
        featured: false,
    },
    {
        id: 'can-wiki-information-change',
        question: 'Can the information in Necrotix Wiki and FAQ be updated?',
        answer: '<p>Yes. The Wiki and FAQ are maintained as living documents. Information can be edited, expanded, hidden or reorganized from the administration panel as projects and biographical details change.</p>',
        category: 'Wiki',
        keywords: ['wiki', 'faq', 'updates', 'cms'],
        enabled: true,
        featured: false,
    },
];

export const defaultWikiFaqContent: WikiFaqContent = {
    enabled: true,
    indexable: true,
    eyebrow: 'Necrotix Wiki · FAQ',
    title: 'Frequently asked questions',
    subtitle: 'Answers to recurring questions about Nikola Stoyanov, Dr Necrotix, projects, communities and the work documented across Necrotix Wiki.',
    introHtml: '<p>This FAQ is maintained as part of Necrotix Wiki. Use search or categories to find a topic quickly.</p>',
    showSearch: true,
    showCategories: true,
    featuredFirst: true,
    defaultExpanded: false,
    items: starterQuestions,
};

export function normalizeWikiFaqContent(value: unknown): WikiFaqContent {
    const input = record(value);
    return {
        enabled: bool(input.enabled, defaultWikiFaqContent.enabled),
        indexable: bool(input.indexable, defaultWikiFaqContent.indexable),
        eyebrow: text(input.eyebrow, 120) || defaultWikiFaqContent.eyebrow,
        title: text(input.title, 180) || defaultWikiFaqContent.title,
        subtitle: text(input.subtitle, 1200) || defaultWikiFaqContent.subtitle,
        introHtml: sanitizeCmsHtml(input.introHtml || defaultWikiFaqContent.introHtml).slice(0, 16_000),
        showSearch: bool(input.showSearch, defaultWikiFaqContent.showSearch),
        showCategories: bool(input.showCategories, defaultWikiFaqContent.showCategories),
        featuredFirst: bool(input.featuredFirst, defaultWikiFaqContent.featuredFirst),
        defaultExpanded: bool(input.defaultExpanded, defaultWikiFaqContent.defaultExpanded),
        items: Object.prototype.hasOwnProperty.call(input, 'items') ? normalizeItems(input.items) : defaultWikiFaqContent.items,
    };
}

export function wikiFaqCategories(content: WikiFaqContent) {
    return [...new Set(content.items.filter((item) => item.enabled).map((item) => item.category))].sort((a, b) => a.localeCompare(b));
}
