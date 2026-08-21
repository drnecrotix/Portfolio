import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PostBody } from '@/components/blog/PostBody';
import { BlogArticleFrame, type RelatedBlogPost } from '@/components/blog/BlogArticleFrame';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

type PostContent = { html?: string; text?: string; featuredImage?: string };

function isPublicPost(post: { status: string; publishedAt: Date | null }) {
    return post.status === 'PUBLISHED' && (!post.publishedAt || post.publishedAt <= new Date());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const canonical = `${siteUrl}/blog/${slug}`;
    const cmsPost = await prisma.post.findUnique({ where: { slug } });

    if (!cmsPost || !isPublicPost(cmsPost)) return { robots: { index: false, follow: false } };

    const content = (cmsPost.content ?? {}) as PostContent;
    const description = cmsPost.excerpt || undefined;
    const publishedTime = (cmsPost.publishedAt ?? cmsPost.createdAt).toISOString();

    return {
        title: cmsPost.title,
        description,
        alternates: { canonical },
        authors: [{ name: cmsPost.authorName }],
        robots: { index: true, follow: true },
        openGraph: {
            type: 'article', url: canonical, title: cmsPost.title, description, publishedTime,
            authors: [cmsPost.authorName],
            images: content.featuredImage ? [{ url: content.featuredImage, alt: cmsPost.title }] : undefined,
        },
        twitter: {
            card: content.featuredImage ? 'summary_large_image' : 'summary', title: cmsPost.title, description,
            images: content.featuredImage ? [content.featuredImage] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const now = new Date();
    const [cmsPost, related] = await prisma.$transaction([
        prisma.post.findUnique({
            where: { slug },
            include: {
                postType: { select: { name: true } },
                categoryRef: { select: { name: true } },
            },
        }),
        prisma.post.findMany({
            where: {
                slug: { not: slug },
                status: 'PUBLISHED',
                OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
            },
            include: {
                categoryRef: { select: { name: true } },
            },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: 2,
        }),
    ]);

    if (!cmsPost || !isPublicPost(cmsPost)) notFound();

    const content = (cmsPost.content ?? {}) as PostContent;
    const typeLabel = cmsPost.postType?.name ?? cmsPost.type.replaceAll('_', ' ');
    const categoryLabel = cmsPost.categoryRef?.name ?? cmsPost.category ?? 'Publication';
    const publishedAt = (cmsPost.publishedAt ?? cmsPost.createdAt).toISOString();
    const relatedPosts: RelatedBlogPost[] = related.map((post) => {
        const relatedContent = (post.content ?? {}) as PostContent;
        return {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            image: relatedContent.featuredImage || null,
            category: post.categoryRef?.name ?? post.category ?? 'Publication',
            author: post.authorName,
            date: (post.publishedAt ?? post.createdAt).toISOString(),
        };
    });

    return (
        <BlogArticleFrame
            title={cmsPost.title}
            excerpt={cmsPost.excerpt}
            featuredImage={content.featuredImage || null}
            typeLabel={typeLabel}
            categoryLabel={categoryLabel}
            author={cmsPost.authorName}
            publishedAt={publishedAt}
            tags={cmsPost.tags}
            relatedPosts={relatedPosts}
        >
            <PostBody type={cmsPost.type} content={content} />
        </BlogArticleFrame>
    );
}
