import { prisma } from '@/lib/prisma';
import { cmsPostToPublicPost, type PublicPost } from '@/lib/cms-posts';
import { portfolioData } from '@/data/portfolio';
import { BlogArchiveClient } from '@/components/blog/BlogArchiveClient';

export const dynamic = 'force-dynamic';

function legacyPosts(): PublicPost[] {
    return portfolioData.blogs.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags,
        type: 'ARTICLE',
        authorName: post.author.name,
        date: post.date,
        content: {},
    }));
}

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

    const posts = cmsPosts.length > 0 ? cmsPosts.map(cmsPostToPublicPost) : legacyPosts();
    return <BlogArchiveClient posts={posts} />;
}
