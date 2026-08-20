import { prisma } from '@/lib/prisma';
import { cmsPostToPublicPost } from '@/lib/cms-posts';
import { BlogArchiveClient } from '@/components/blog/BlogArchiveClient';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
    const cmsPosts = await prisma.post.findMany({
        where: {
            status: 'PUBLISHED',
            OR: [
                { publishedAt: null },
                { publishedAt: { lte: new Date() } },
            ],
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return <BlogArchiveClient posts={cmsPosts.map(cmsPostToPublicPost)} />;
}
