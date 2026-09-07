import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';

export type CommentSourceType = 'BLOG' | 'GALLERY' | 'PRODUCT';

export const SPAM_RETENTION_DAYS = 7;
const SPAM_RETENTION_MS = SPAM_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type ResolvedCommentSource = {
    type: CommentSourceType;
    key: string;
    title: string;
    path: string;
    postId: string | null;
};

function normalizeKey(value: unknown) {
    return String(value ?? '').trim().slice(0, 180);
}

export function isCommentSourceType(value: unknown): value is CommentSourceType {
    return value === 'BLOG' || value === 'GALLERY' || value === 'PRODUCT';
}

export function containsPublicLink(value: string) {
    const withoutEmails = value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/gi, ' ');
    if (/(?:https?:\/\/|www\.)/i.test(withoutEmails)) return true;
    if (/\[[^\]]+\]\([^)]*(?:https?:\/\/|www\.)[^)]*\)/i.test(withoutEmails)) return true;
    if (/<a\b[^>]*\bhref\s*=\s*["'][^"']+["']/i.test(withoutEmails)) return true;
    return /(?:^|[\s([<{])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?=$|[\s)\]}>/:?#])/i.test(withoutEmails);
}

export async function cleanupExpiredSpamComments() {
    const cutoff = new Date(Date.now() - SPAM_RETENTION_MS);
    return prisma.blogComment.deleteMany({
        where: {
            status: 'SPAM',
            spamAt: { lte: cutoff },
        },
    });
}

export function spamExpiresAt(spamAt: Date | null) {
    if (!spamAt) return null;
    return new Date(spamAt.getTime() + SPAM_RETENTION_MS);
}

export async function resolveCommentSource(type: CommentSourceType, rawKey: unknown): Promise<ResolvedCommentSource | null> {
    const key = normalizeKey(rawKey);
    if (!key) return null;
    const now = new Date();

    if (type === 'BLOG') {
        const post = await prisma.post.findUnique({
            where: { slug: key },
            select: { id: true, slug: true, title: true, status: true, publishedAt: true },
        });
        if (!post || post.status !== 'PUBLISHED' || (post.publishedAt && post.publishedAt > now)) return null;
        return { type, key: post.slug, title: post.title, path: `/blog/${post.slug}`, postId: post.id };
    }

    if (type === 'PRODUCT') {
        const product = await prisma.storeProduct.findUnique({
            where: { slug: key },
            select: { slug: true, title: true, status: true, publishedAt: true },
        });
        if (!product || product.status !== 'PUBLISHED' || (product.publishedAt && product.publishedAt > now)) return null;
        return { type, key: product.slug, title: product.title, path: `/store/${product.slug}`, postId: null };
    }

    const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { galleryContent: true },
    }).catch(() => null);
    const gallery = normalizeGallerySettings(settings?.galleryContent);
    const item = gallery.items.find((candidate) => candidate.slug === key && candidate.isVisible && candidate.mediaUrl);
    if (!item) return null;
    return { type, key: item.slug, title: item.title, path: `/gallery/${item.slug}`, postId: null };
}
