import type { Post as PrismaPost, PostType } from '@prisma/client';

export type CmsPostContent = {
    html?: string;
    text?: string;
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

export function cmsPostToPublicPost(post: PrismaPost): PublicPost {
    const content = (post.content ?? {}) as CmsPostContent;
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
        content,
    };
}

export function csvToList(value: FormDataEntryValue | null) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function parsePostContent(type: PostType, value: FormDataEntryValue | null): CmsPostContent {
    const raw = String(value ?? '');
    return type === 'POETRY' ? { text: raw } : { html: raw };
}
