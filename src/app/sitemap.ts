import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const staticEntries: MetadataRoute.Sitemap = [
        { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
        { url: `${baseUrl}/projects`, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.9 },
    ];

    try {
        const [projects, posts, pages] = await Promise.all([
            prisma.project.findMany({
                where: { status: { in: ['ONGOING', 'COMPLETED'] } },
                select: { slug: true, updatedAt: true },
            }),
            prisma.post.findMany({
                where: { status: 'PUBLISHED' },
                select: { slug: true, updatedAt: true },
            }),
            prisma.page.findMany({
                where: { status: 'PUBLISHED' },
                select: { slug: true, updatedAt: true },
            }),
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
                priority: 0.7,
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
