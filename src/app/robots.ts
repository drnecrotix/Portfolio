import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    let seo = defaultSeoDefaults;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        seo = normalizeSeoDefaults(settings?.seoDefaults);
    } catch {
        // Use safe defaults if the database cannot be reached.
    }

    return {
        rules: {
            userAgent: '*',
            allow: seo.indexSite ? '/' : undefined,
            disallow: seo.indexSite ? ['/admin/', '/api/'] : '/',
        },
        sitemap: seo.sitemapEnabled ? `${baseUrl}/sitemap.xml` : undefined,
    };
}
