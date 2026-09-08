import 'server-only';

import { prisma } from '@/lib/prisma';
import type { GallerySettings } from '@/lib/gallery-settings';

type ProtectedContent = { html?: string; text?: string; featuredImage?: string };

function protectedUrl(id: string) {
    return `/api/protected-media/${encodeURIComponent(id)}`;
}

export async function protectManagedMediaUrls(urls: Iterable<string>) {
    const unique = [...new Set([...urls].filter(Boolean))];
    if (!unique.length) return new Map<string, string>();
    const assets = await prisma.mediaAsset.findMany({
        where: {
            url: { in: unique },
            mimeType: { startsWith: 'image/' },
            OR: [{ key: { startsWith: 'uploads/' } }, { key: { startsWith: 'media/' } }],
        },
        select: { id: true, url: true },
    });
    return new Map(assets.map((asset) => [asset.url, protectedUrl(asset.id)]));
}

export async function protectBlogMedia(content: ProtectedContent): Promise<ProtectedContent> {
    const urls = new Set<string>();
    if (content.featuredImage) urls.add(content.featuredImage);
    for (const match of content.html?.matchAll(/<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')[^>]*>/gi) ?? []) {
        const url = match[1] || match[2];
        if (url) urls.add(url);
    }
    if (!urls.size) return content;

    const replacements = await protectManagedMediaUrls(urls);
    const replace = (url: string | undefined) => url ? replacements.get(url) ?? url : url;

    return {
        ...content,
        featuredImage: replace(content.featuredImage),
        html: content.html?.replace(/(<img\b[^>]*\bsrc=)(["'])([^"']+)(\2)/gi, (full, prefix, quote, url, closing) => {
            const next = replacements.get(url);
            return next ? `${prefix}${quote}${next}${closing}` : full;
        }),
    };
}

export async function protectGalleryMedia(content: GallerySettings): Promise<GallerySettings> {
    const urls = content.items.flatMap((item) => item.type === 'image'
        ? [item.mediaUrl, item.thumbnailUrl, item.socialImageUrl, ...item.additionalImages]
        : [item.thumbnailUrl, item.socialImageUrl]);
    const replacements = await protectManagedMediaUrls(urls);
    const replace = (url: string) => replacements.get(url) ?? url;
    return {
        ...content,
        items: content.items.map((item) => ({
            ...item,
            mediaUrl: item.type === 'image' ? replace(item.mediaUrl) : item.mediaUrl,
            thumbnailUrl: replace(item.thumbnailUrl),
            socialImageUrl: replace(item.socialImageUrl),
            additionalImages: item.additionalImages.map(replace),
        })),
    };
}

export function contentReferencesMedia(content: unknown, url: string): boolean {
    if (typeof content === 'string') return content === url || content.includes(`src="${url}"`) || content.includes(`src='${url}'`);
    if (Array.isArray(content)) return content.some((value) => contentReferencesMedia(value, url));
    if (!content || typeof content !== 'object') return false;
    return Object.values(content as Record<string, unknown>).some((value) => contentReferencesMedia(value, url));
}
