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
    items: [],
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
        items: normalizeItems(input.items),
    };
}

export function wikiFaqCategories(content: WikiFaqContent) {
    return [...new Set(content.items.filter((item) => item.enabled).map((item) => item.category))].sort((a, b) => a.localeCompare(b));
}
