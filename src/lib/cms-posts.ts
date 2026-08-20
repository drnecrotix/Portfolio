import type { Post as PrismaPost, PostType } from '@prisma/client';
import { safeCmsMediaUrl, sanitizeCmsHtml } from '@/lib/sanitize-cms-html';

export type CmsPostContent = {
    html?: string;
    text?: string;
    featuredImage?: string;
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

function safePublicContent(type: PostType, value: unknown): CmsPostContent {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as CmsPostContent : {};
    const content: CmsPostContent = type === 'POETRY'
        ? { text: String(source.text ?? '') }
        : { html: sanitizeCmsHtml(source.html ?? '') };
    const featuredImage = safeCmsMediaUrl(source.featuredImage);
    if (featuredImage) content.featuredImage = featuredImage;
    return content;
}

export function cmsPostToPublicPost(post: CmsPostRecord): PublicPost {
    const fallbackType = post.type.toLowerCase().replaceAll('_', '-');
    const categoryName = post.categoryRef?.name ?? post.category ?? 'Publication';
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? '',
        category: categoryName,
        categorySlug: post.categoryRef?.slug ?? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        tags: post.tags,
        type: post.type,
        typeLabel: post.postType?.name ?? post.type.replaceAll('_', ' '),
        typeSlug: post.postType?.slug ?? fallbackType,
        authorName: post.authorName,
        date: (post.publishedAt ?? post.createdAt).toISOString(),
        content: safePublicContent(post.type, post.content),
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
