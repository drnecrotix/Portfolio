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
    tags: string[];
    type: PostType;
    authorName: string;
    date: string;
    content: CmsPostContent;
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

export function cmsPostToPublicPost(post: PrismaPost): PublicPost {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? '',
        category: post.category ?? post.type.toLowerCase().replaceAll('_', '-'),
        tags: post.tags,
        type: post.type,
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
