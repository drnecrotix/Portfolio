import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    let seo = defaultSeoDefaults;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        seo = normalizeSeoDefaults(settings?.seoDefaults);
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
        { url: `${baseUrl}/achievements`, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/resume`, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    ];

    if (!seo.sitemapAutoUpdate) return staticEntries;

    try {
        const now = new Date();
        const [projects, posts, pages] = await Promise.all([
            seo.sitemapIncludeProjects
                ? prisma.project.findMany({ where: { status: { in: ['ONGOING', 'COMPLETED'] } }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
            seo.sitemapIncludeBlog
                ? prisma.post.findMany({ where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
            seo.sitemapIncludePages
                ? prisma.page.findMany({ where: { status: 'PUBLISHED', slug: { not: '__experience-config' } }, select: { slug: true, updatedAt: true } })
                : Promise.resolve([]),
        ]);

        return [
            ...staticEntries,
            ...projects.map((project) => ({
                url: `${baseUrl}/projects/${project.slug}`,
                lastModified: project.updatedAt,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            })),
            ...posts.map((post) => ({
                url: `${baseUrl}/blog/${post.slug}`,
                lastModified: post.updatedAt,
                changeFrequency: 'monthly' as const,
                priority: 0.8,
            })),
            ...pages.map((page) => ({
                url: `${baseUrl}/pages/${page.slug}`,
                lastModified: page.updatedAt,
                changeFrequency: 'monthly' as const,
                priority: 0.6,
            })),
        ];
    } catch {
        return staticEntries;
    }
}
