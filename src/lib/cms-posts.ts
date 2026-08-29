import type { Post as PrismaPost, PostType } from '@prisma/client';
import { safeCmsMediaUrl, sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

export type BlogLocale = 'en' | 'bg';

export type CmsPostTranslation = {
    title?: string;
    excerpt?: string;
    html?: string;
    text?: string;
    seoTitle?: string;
    seoDescription?: string;
};

export type CmsPostContent = {
    html?: string;
    text?: string;
    featuredImage?: string;
    primaryLocale?: BlogLocale;
    translations?: Partial<Record<BlogLocale, CmsPostTranslation>>;
};

export type PublicPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    categorySlug: string;
    tags: string[];
    type: PostType;
    typeLabel: string;
    typeSlug: string;
    authorName: string;
    date: string;
    content: CmsPostContent;
};

type CmsPostRecord = PrismaPost & {
    postType?: { name: string; slug: string } | null;
    categoryRef?: { name: string; slug: string } | null;
};

function contentRecord(value: unknown): CmsPostContent {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as CmsPostContent : {};
}

function cleanTranslation(type: PostType, value: unknown): CmsPostTranslation | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const source = value as CmsPostTranslation;
    const translation: CmsPostTranslation = {};
    if (source.title?.trim()) translation.title = source.title.trim();
    if (source.excerpt?.trim()) translation.excerpt = source.excerpt.trim();
    if (source.seoTitle?.trim()) translation.seoTitle = source.seoTitle.trim();
    if (source.seoDescription?.trim()) translation.seoDescription = source.seoDescription.trim();
    if (type === 'POETRY') {
        if (source.text?.trim()) translation.text = source.text;
    } else if (source.html?.trim()) {
        translation.html = sanitizeCmsHtml(source.html);
    }
    return Object.keys(translation).length ? translation : undefined;
}

export function getAvailablePostLocales(post: Pick<PrismaPost, 'content' | 'type'>): BlogLocale[] {
    const source = contentRecord(post.content);
    const primaryLocale: BlogLocale = source.primaryLocale === 'bg' ? 'bg' : 'en';
    const secondaryLocale: BlogLocale = primaryLocale === 'bg' ? 'en' : 'bg';
    const locales: BlogLocale[] = [primaryLocale];

    if (cleanTranslation(post.type, source.translations?.[secondaryLocale])) {
        locales.push(secondaryLocale);
    }

    return locales;
}

function safePublicContent(type: PostType, value: unknown, locale?: string): CmsPostContent {
    const source = contentRecord(value);
    const primaryLocale: BlogLocale = source.primaryLocale === 'bg' ? 'bg' : 'en';
    const requestedLocale: BlogLocale = locale === 'bg' ? 'bg' : 'en';
    const localized = requestedLocale !== primaryLocale ? cleanTranslation(type, source.translations?.[requestedLocale]) : undefined;
    const content: CmsPostContent = type === 'POETRY'
        ? { text: localized?.text ?? String(source.text ?? '') }
        : { html: localized?.html ?? sanitizeCmsHtml(source.html ?? '') };
    const featuredImage = safeCmsMediaUrl(source.featuredImage);
    if (featuredImage) content.featuredImage = featuredImage;
    content.primaryLocale = primaryLocale;
    return content;
}

export function getLocalizedPostFields(post: Pick<PrismaPost, 'title' | 'excerpt' | 'seoTitle' | 'seoDescription' | 'content' | 'type'>, locale?: string) {
    const source = contentRecord(post.content);
    const primaryLocale: BlogLocale = source.primaryLocale === 'bg' ? 'bg' : 'en';
    const requestedLocale: BlogLocale = locale === 'bg' ? 'bg' : 'en';
    const translation = requestedLocale !== primaryLocale ? cleanTranslation(post.type, source.translations?.[requestedLocale]) : undefined;
    return {
        locale: requestedLocale,
        primaryLocale,
        title: translation?.title || post.title,
        excerpt: translation?.excerpt ?? post.excerpt,
        seoTitle: translation?.seoTitle ?? post.seoTitle,
        seoDescription: translation?.seoDescription ?? post.seoDescription,
        content: safePublicContent(post.type, post.content, requestedLocale),
        translated: Boolean(translation),
    };
}

export function cmsPostToPublicPost(post: CmsPostRecord, locale?: string): PublicPost {
    const fallbackType = post.type.toLowerCase().replaceAll('_', '-');
    const categoryName = post.categoryRef?.name ?? post.category ?? 'Publication';
    const localized = getLocalizedPostFields(post, locale);
    return {
        id: post.id,
        slug: post.slug,
        title: localized.title,
        excerpt: localized.excerpt ?? '',
        category: categoryName,
        categorySlug: post.categoryRef?.slug ?? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        tags: post.tags,
        type: post.type,
        typeLabel: post.postType?.name ?? post.type.replaceAll('_', ' '),
        typeSlug: post.postType?.slug ?? fallbackType,
        authorName: post.authorName,
        date: (post.publishedAt ?? post.createdAt).toISOString(),
        content: localized.content,
    };
}

export function csvToList(value: FormDataEntryValue | null) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function parsePostContent(type: PostType, value: FormDataEntryValue | null, featuredImage?: FormDataEntryValue | null): CmsPostContent {
    const raw = String(value ?? '');
    const image = safeCmsMediaUrl(featuredImage);
    const content: CmsPostContent = type === 'POETRY' ? { text: raw } : { html: sanitizeCmsHtml(raw) };
    if (image) content.featuredImage = image;
    return content;
}
