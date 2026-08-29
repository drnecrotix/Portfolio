import { getLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { cmsPostToPublicPost } from '@/lib/cms-posts';
import { BlogArchiveClient } from '@/components/blog/BlogArchiveClient';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
    const [cmsPosts, locale] = await Promise.all([
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
    ]);

    return <BlogArchiveClient posts={cmsPosts.map((post) => cmsPostToPublicPost(post, locale))} />;
}
