import { getLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { cmsPostToArchivePost } from '@/lib/cms-posts';
import { BlogArchiveClient } from '@/components/blog/BlogArchiveClient';
import { blogSettingsFromSiteEnvelope } from '@/lib/blog-settings';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
    const [cmsPosts, locale, siteSettings] = await Promise.all([
        prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                OR: [
                    { publishedAt: null },
                    { publishedAt: { lte: new Date() } },
                ],
            },
            include: {
                postType: { select: { name: true, slug: true } },
                categoryRef: { select: { name: true, slug: true } },
            },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        }),
        getLocale(),
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { integrationSettings: true } }),
    ]);

    return (
        <BlogArchiveClient
            posts={cmsPosts.map((post) => cmsPostToArchivePost(post, locale))}
            settings={blogSettingsFromSiteEnvelope(siteSettings?.integrationSettings)}
        />
    );
}
