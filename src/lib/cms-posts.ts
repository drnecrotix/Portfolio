import type { Post as PrismaPost, PostType } from '@prisma/client';

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

export function parsePostContent(type: PostType, value: FormDataEntryValue | null, featuredImage?: FormDataEntryValue | null): CmsPostContent {
    const raw = String(value ?? '');
    const image = String(featuredImage ?? '').trim();
    const content: CmsPostContent = type === 'POETRY' ? { text: raw } : { html: raw };
    if (image) content.featuredImage = image;
    return content;
}
