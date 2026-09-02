import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';
import { defaultPersonalWikiContent, normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX } from '@/lib/wiki-articles';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    let seo = defaultSeoDefaults;
    let wikiEnabled = defaultPersonalWikiContent.enabled;

    try {
        const [settings, wikiPage] = await Promise.all([
            prisma.siteSettings.findUnique({ where: { id: 'default' } }),
            prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        ]);
        seo = normalizeSeoDefaults(settings?.seoDefaults);
        wikiEnabled = normalizePersonalWikiContent(wikiPage?.content).enabled;
    } catch {
        // Keep sitemap available with safe defaults if settings cannot be loaded.
    }

    if (!seo.sitemapEnabled) return [];

    const staticEntries: MetadataRoute.Sitemap = [
        { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
        ...(seo.sitemapIncludeBlog ? [{ url: `${baseUrl}/blog`, changeFrequency: 'daily' as const, priority: 0.9 }] : []),
        ...(seo.sitemapIncludeProjects ? [{ url: `${baseUrl}/projects`, changeFrequency: 'weekly' as const, priority: 0.9 }] : []),
        { url: `${baseUrl}/gallery`, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/journey`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/lab`, changeFrequency: 'monthly', priority: 0.7 },
        ...(wikiEnabled ? [
            { url: `${baseUrl}/wiki`, changeFrequency: 'monthly' as const, priority: 0.8 },
            { url: `${baseUrl}/wiki/articles`, changeFrequency: 'weekly' as const, priority: 0.7 },
        ] : []),
        { url: `${baseUrl}/achievements`, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/resume`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
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

        return [
            ...staticEntries,
            ...wikiEntries,
            ...projects.map((project) => ({ url: `${baseUrl}/projects/${project.slug}`, lastModified: project.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
            ...posts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: post.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
            ...pages.map((page) => ({ url: `${baseUrl}/pages/${page.slug}`, lastModified: page.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
        ];
    } catch {
        return staticEntries;
    }
}
