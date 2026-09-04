import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { galleryItemHref, galleryItemImages, normalizeGallerySettings } from '@/lib/gallery-settings';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';
import { defaultPersonalWikiContent, normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX } from '@/lib/wiki-articles';
import { defaultWikiFaqContent, normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';

export const revalidate = 3600;

function absoluteMediaUrl(baseUrl: string, value: string) {
    if (!value) return '';
    if (value.startsWith('/')) return `${baseUrl}${value}`;
    return value;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    let seo = defaultSeoDefaults;
    let gallery = normalizeGallerySettings(null);
    let galleryUpdatedAt: Date | undefined;
    let wikiEnabled = defaultPersonalWikiContent.enabled;
    let faqEnabled = defaultWikiFaqContent.enabled;
    let faqIndexable = defaultWikiFaqContent.indexable;

    try {
        const [settings, wikiPage, faqPage] = await Promise.all([
            prisma.siteSettings.findUnique({ where: { id: 'default' } }),
            prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
            prisma.page.findUnique({ where: { slug: WIKI_FAQ_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        ]);
        seo = normalizeSeoDefaults(settings?.seoDefaults);
        gallery = normalizeGallerySettings(settings?.galleryContent);
        galleryUpdatedAt = settings?.updatedAt;
        wikiEnabled = normalizePersonalWikiContent(wikiPage?.content).enabled;
        const faq = normalizeWikiFaqContent(faqPage?.content);
        faqEnabled = faq.enabled;
        faqIndexable = faq.indexable;
    } catch {
        // Keep sitemap available with safe defaults if settings cannot be loaded.
    }

    if (!seo.sitemapEnabled) return [];

    const galleryImages = gallery.items
        .filter((item) => item.isVisible && item.isIndexable && !item.isNsfw)
        .flatMap(galleryItemImages)
        .map((image) => absoluteMediaUrl(baseUrl, image))
        .filter(Boolean);

    const staticEntries: MetadataRoute.Sitemap = [
        { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
        ...(seo.sitemapIncludeBlog ? [{ url: `${baseUrl}/blog`, changeFrequency: 'daily' as const, priority: 0.9 }] : []),
        ...(seo.sitemapIncludeProjects ? [{ url: `${baseUrl}/projects`, changeFrequency: 'weekly' as const, priority: 0.9 }] : []),
        { url: `${baseUrl}/gallery`, lastModified: galleryUpdatedAt, changeFrequency: 'weekly', priority: 0.8, images: galleryImages.length ? galleryImages : undefined },
        { url: `${baseUrl}/journey`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/lab`, changeFrequency: 'monthly', priority: 0.7 },
        ...(wikiEnabled ? [
            { url: `${baseUrl}/wiki`, changeFrequency: 'monthly' as const, priority: 0.8 },
            { url: `${baseUrl}/wiki/articles`, changeFrequency: 'weekly' as const, priority: 0.7 },
            ...(faqEnabled && faqIndexable ? [{ url: `${baseUrl}/wiki/faq`, changeFrequency: 'monthly' as const, priority: 0.75 }] : []),
        ] : []),
        { url: `${baseUrl}/achievements`, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/resume`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/legal`, changeFrequency: 'yearly', priority: 0.35 },
        { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.35 },
        { url: `${baseUrl}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    ];

    if (!seo.sitemapAutoUpdate) return staticEntries;

    try {
        const now = new Date();
        const [projects, posts, pages, wikiArticles] = await Promise.all([
            seo.sitemapIncludeProjects
                ? prisma.project.findMany({ where: { status: { in: ['ONGOING', 'COMPLETED'] } }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
            seo.sitemapIncludeBlog
                ? prisma.post.findMany({ where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
            seo.sitemapIncludePages
                ? prisma.page.findMany({ where: { status: 'PUBLISHED', NOT: { slug: { startsWith: '__' } } }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
            wikiEnabled
                ? prisma.page.findMany({ where: { status: 'PUBLISHED', slug: { startsWith: WIKI_ARTICLE_PREFIX } }, select: { content: true, updatedAt: true } })
                : Promise.resolve([]),
        ]);

        const wikiEntries: MetadataRoute.Sitemap = wikiArticles.map((article) => {
            const content = normalizeWikiArticleContent(article.content);
            if (!content.slug || !content.indexable) return null;
            return { url: `${baseUrl}/wiki/${content.slug}`, lastModified: article.updatedAt, changeFrequency: 'monthly' as const, priority: 0.7 };
        }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

        const galleryEntries: MetadataRoute.Sitemap = gallery.items
            .filter((item) => item.isVisible && item.isIndexable && item.slug)
            .map((item) => {
                const images = item.isNsfw ? [] : galleryItemImages(item).map((image) => absoluteMediaUrl(baseUrl, image)).filter(Boolean);
                return {
                    url: `${baseUrl}${galleryItemHref(item.slug)}`,
                    lastModified: galleryUpdatedAt,
                    changeFrequency: 'monthly' as const,
                    priority: 0.75,
                    images: images.length ? images : undefined,
                };
            });

        return [
            ...staticEntries,
            ...galleryEntries,
            ...wikiEntries,
            ...projects.map((project) => ({ url: `${baseUrl}/projects/${project.slug}`, lastModified: project.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
            ...posts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: post.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
            ...pages.map((page) => ({ url: `${baseUrl}/pages/${page.slug}`, lastModified: page.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
        ];
    } catch {
        return staticEntries;
    }
}
