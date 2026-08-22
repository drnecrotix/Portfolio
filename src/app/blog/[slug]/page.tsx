import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PostBody } from '@/components/blog/PostBody';
import { BlogComments, type PublicBlogComment } from '@/components/blog/BlogComments';
import { BlogArticleFrame, type RelatedBlogPost } from '@/components/blog/BlogArticleFrame';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { normalizeSeoDefaults } from '@/lib/seo-settings';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const likeCookieName = 'necrotix_blog_like_id';

type PostContent = { html?: string; text?: string; featuredImage?: string };

function isPublicPost(post: { status: string; publishedAt: Date | null }) {
    return post.status === 'PUBLISHED' && (!post.publishedAt || post.publishedAt <= new Date());
}

function absoluteImageUrl(value?: string) {
    if (!value) return undefined;
    try {
        return new URL(value, `${siteUrl}/`).toString();
    } catch {
        return undefined;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const canonical = `${siteUrl}/blog/${slug}`;
    const [cmsPost, settings] = await Promise.all([
        prisma.post.findUnique({ where: { slug } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    ]);

    if (!cmsPost || !isPublicPost(cmsPost)) return { robots: { index: false, follow: false } };

    const content = (cmsPost.content ?? {}) as PostContent;
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const seo = normalizeSeoDefaults(settings?.seoDefaults);
    const defaultSocialImage = homepage.socialImage || seo.ogImage || undefined;
    const image = absoluteImageUrl(content.featuredImage || defaultSocialImage);
    const title = cmsPost.seoTitle?.trim() || cmsPost.title;
    const description = cmsPost.seoDescription?.trim() || cmsPost.excerpt || undefined;
    const publishedTime = (cmsPost.publishedAt ?? cmsPost.createdAt).toISOString();

    return {
        title,
        description,
        alternates: { canonical },
        authors: [{ name: cmsPost.authorName }],
        robots: { index: true, follow: true },
        openGraph: {
            type: 'article',
            url: canonical,
            title,
            description,
            publishedTime,
            authors: [cmsPost.authorName],
            images: image ? [{ url: image, alt: cmsPost.title }] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const now = new Date();
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(likeCookieName)?.value || '__none__';
    const [cmsPost, related] = await prisma.$transaction([
        prisma.post.findUnique({
            where: { slug },
            include: {
                postType: { select: { name: true } },
                categoryRef: { select: { name: true } },
                comments: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, parentId: true, authorName: true, content: true, createdAt: true },
                },
                likes: { where: { visitorId }, select: { id: true }, take: 1 },
                _count: { select: { likes: true } },
            },
        }),
        prisma.post.findMany({
            where: { slug: { not: slug }, status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
            include: { categoryRef: { select: { name: true } } },
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
    const comments: PublicBlogComment[] = cmsPost.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() }));

    return (
        <BlogArticleFrame
            postId={cmsPost.id}
            initialLikeCount={cmsPost._count.likes}
            initiallyLiked={cmsPost.likes.length > 0}
            title={cmsPost.title}
            excerpt={cmsPost.excerpt}
            featuredImage={content.featuredImage || null}
            typeLabel={typeLabel}
            categoryLabel={categoryLabel}
            author={cmsPost.authorName}
            publishedAt={publishedAt}
            tags={cmsPost.tags}
            relatedPosts={relatedPosts}
            comments={<BlogComments postId={cmsPost.id} initialComments={comments} />}
        >
            <PostBody type={cmsPost.type} content={content} />
        </BlogArticleFrame>
    );
}
