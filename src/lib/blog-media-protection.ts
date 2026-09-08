import 'server-only';

import { prisma } from '@/lib/prisma';

type ProtectedContent = { html?: string; text?: string; featuredImage?: string };

function protectedUrl(id: string) {
    return `/api/blog-media/${encodeURIComponent(id)}`;
}

export async function protectBlogMedia(content: ProtectedContent): Promise<ProtectedContent> {
    const urls = new Set<string>();
    if (content.featuredImage) urls.add(content.featuredImage);
    for (const match of content.html?.matchAll(/<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')[^>]*>/gi) ?? []) {
        const url = match[1] || match[2];
        if (url) urls.add(url);
    }
    if (!urls.size) return content;

    const assets = await prisma.mediaAsset.findMany({
        where: {
            url: { in: [...urls] },
            mimeType: { startsWith: 'image/' },
            OR: [{ key: { startsWith: 'uploads/' } }, { key: { startsWith: 'media/' } }],
        },
        select: { id: true, url: true },
    });
    const replacements = new Map(assets.map((asset) => [asset.url, protectedUrl(asset.id)]));
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

export function contentReferencesMedia(content: unknown, url: string): boolean {
    if (!content || typeof content !== 'object') return false;
    const source = content as { featuredImage?: unknown; html?: unknown; translations?: unknown };
    if (source.featuredImage === url || (typeof source.html === 'string' && source.html.includes(url))) return true;
    if (!source.translations || typeof source.translations !== 'object') return false;
    return Object.values(source.translations).some((translation) => contentReferencesMedia(translation, url));
}
