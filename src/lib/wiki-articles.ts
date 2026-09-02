import sanitizeHtml from 'sanitize-html';
import { sanitizeCmsHtml, safeCmsMediaUrl } from '@/lib/sanitize-cms-html';

export const WIKI_ARTICLE_PREFIX = '__wiki-article-';
export const WIKI_RESERVED_SLUGS = new Set(['articles']);

export const WIKI_CATEGORIES = [
    'PERSON',
    'PROJECT',
    'COMMUNITY',
    'ORGANIZATION',
    'CREATIVE_WORK',
    'FAQ',
    'TECHNOLOGY',
    'OTHER',
] as const;

export type WikiCategory = (typeof WIKI_CATEGORIES)[number];

export type WikiFact = {
    id: string;
    label: string;
    value: string;
    href: string;
    enabled: boolean;
};

export type WikiFaqItem = {
    id: string;
    question: string;
    answer: string;
    enabled: boolean;
};

export type WikiArticleContent = {
    slug: string;
    category: WikiCategory;
    summary: string;
    bodyHtml: string;
    image: string;
    imageCaption: string;
    infoboxTitle: string;
    infoboxRows: WikiFact[];
    relatedSlugs: string[];
    faqItems: WikiFaqItem[];
    featured: boolean;
    indexable: boolean;
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

export function wikiSlug(value: unknown) {
    const normalized = String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
    return WIKI_RESERVED_SLUGS.has(normalized) ? `${normalized}-page` : normalized;
}

export function internalWikiSlug(publicSlug: string) {
    return `${WIKI_ARTICLE_PREFIX}${wikiSlug(publicSlug)}`;
}

export function publicWikiSlug(internalSlug: string) {
    return internalSlug.startsWith(WIKI_ARTICLE_PREFIX) ? internalSlug.slice(WIKI_ARTICLE_PREFIX.length) : '';
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

function normalizeFacts(value: unknown): WikiFact[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 40).map((item, index) => {
        const fact = record(item);
        return {
            id: safeId(fact.id, `fact-${index + 1}`),
            label: optionalText(fact.label, 80),
            value: optionalText(fact.value, 400),
            href: normalizeHref(fact.href),
            enabled: bool(fact.enabled, true),
        };
    }).filter((item) => item.label && item.value);
}

function normalizeFaq(value: unknown): WikiFaqItem[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 40).map((item, index) => {
        const faq = record(item);
        return {
            id: safeId(faq.id, `faq-${index + 1}`),
            question: optionalText(faq.question, 240),
            answer: sanitizeCmsHtml(faq.answer).slice(0, 12_000),
            enabled: bool(faq.enabled, true),
        };
    }).filter((item) => item.question && item.answer);
}

export function normalizeWikiArticleContent(value: unknown, fallbackSlug = ''): WikiArticleContent {
    const input = record(value);
    const category = WIKI_CATEGORIES.includes(input.category as WikiCategory) ? input.category as WikiCategory : 'OTHER';
    const relatedSlugs = Array.isArray(input.relatedSlugs)
        ? [...new Set(input.relatedSlugs.map(wikiSlug).filter(Boolean))].slice(0, 20)
        : [];

    return {
        slug: wikiSlug(input.slug) || wikiSlug(fallbackSlug),
        category,
        summary: optionalText(input.summary, 1200),
        bodyHtml: sanitizeCmsHtml(input.bodyHtml).slice(0, 80_000),
        image: safeCmsMediaUrl(input.image),
        imageCaption: optionalText(input.imageCaption, 180),
        infoboxTitle: optionalText(input.infoboxTitle, 100) || 'Quick facts',
        infoboxRows: normalizeFacts(input.infoboxRows),
        relatedSlugs,
        faqItems: normalizeFaq(input.faqItems),
        featured: bool(input.featured, false),
        indexable: bool(input.indexable, true),
    };
}

export function wikiCategoryLabel(category: WikiCategory) {
    return ({
        PERSON: 'Person',
        PROJECT: 'Project',
        COMMUNITY: 'Community',
        ORGANIZATION: 'Organization',
        CREATIVE_WORK: 'Creative work',
        FAQ: 'FAQ',
        TECHNOLOGY: 'Technology',
        OTHER: 'Other',
    } as const)[category];
}

export function wikiHtmlToText(value: unknown) {
    return sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, ' ')
        .trim();
}

export function plainTextToWikiHtml(value: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeCmsHtml(raw);
    const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    return raw.split(/\n{2,}/).map((paragraph) => `<p>${escape(paragraph.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

export function prepareWikiArticleHtml(value: unknown) {
    const safe = sanitizeCmsHtml(value);
    const headings: Array<{ id: string; label: string; level: 2 | 3 }> = [];
    const used = new Set<string>();
    const html = safe.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag: string, attrs: string, inner: string) => {
        const label = wikiHtmlToText(inner);
        let id = wikiSlug(label) || `section-${headings.length + 1}`;
        let suffix = 2;
        while (used.has(id)) id = `${wikiSlug(label) || 'section'}-${suffix++}`;
        used.add(id);
        headings.push({ id, label, level: tag.toLowerCase() === 'h3' ? 3 : 2 });
        const cleanAttrs = String(attrs).replace(/\sid=("[^"]*"|'[^']*')/gi, '');
        return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
    });
    return { html, headings };
}
