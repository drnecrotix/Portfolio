import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BlogComments, type PublicBlogComment } from '@/components/blog/BlogComments';
import { BlogArticleFrame, type RelatedBlogPost } from '@/components/blog/BlogArticleFrame';
import { getAvailablePostLocales, getLocalizedPostFields } from '@/lib/cms-posts';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { normalizeSeoDefaults } from '@/lib/seo-settings';
import { absoluteSocialMediaUrl, getPublicSiteUrl, socialImageDescriptor } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';

const siteUrl = getPublicSiteUrl();
const likeCookieName = 'necrotix_blog_like_id';

type PostContent = { html?: string; text?: string; featuredImage?: string };

function isPublicPost(post: { status: string; publishedAt: Date | null }) {
    return post.status === 'PUBLISHED' && (!post.publishedAt || post.publishedAt <= new Date());
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const canonical = `${siteUrl}/blog/${slug}`;
    const [cmsPost, settings, locale] = await Promise.all([
        prisma.post.findUnique({ where: { slug } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        getLocale(),
    ]);

    if (!cmsPost || !isPublicPost(cmsPost)) return { robots: { index: false, follow: false } };

    const localized = getLocalizedPostFields(cmsPost, locale);
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const seo = normalizeSeoDefaults(settings?.seoDefaults);
    const ogImage = absoluteSocialMediaUrl(localized.content.featuredImage || seo.ogImage || homepage.socialImage);
    const twitterImage = absoluteSocialMediaUrl(localized.content.featuredImage || seo.twitterImage || seo.ogImage || homepage.socialImage);
    const title = localized.seoTitle?.trim() || localized.title;
    const description = localized.seoDescription?.trim() || localized.excerpt || undefined;
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
            images: ogImage ? [socialImageDescriptor(ogImage, localized.title)!] : undefined,
        },
        twitter: {
            card: twitterImage ? 'summary_large_image' : 'summary',
            title,
            description,
            images: twitterImage ? [socialImageDescriptor(twitterImage, localized.title)!] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const now = new Date();
    const [cookieStore, locale] = await Promise.all([cookies(), getLocale()]);
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

    const localized = getLocalizedPostFields(cmsPost, locale);
    const content = localized.content as PostContent;
    const typeLabel = cmsPost.postType?.name ?? cmsPost.type.replaceAll('_', ' ');
    const categoryLabel = cmsPost.categoryRef?.name ?? cmsPost.category ?? 'Publication';
    const publishedAt = (cmsPost.publishedAt ?? cmsPost.createdAt).toISOString();
    const relatedPosts: RelatedBlogPost[] = related.map((post) => {
        const relatedLocalized = getLocalizedPostFields(post, locale);
        return {
            slug: post.slug,
            title: relatedLocalized.title,
            excerpt: relatedLocalized.excerpt,
            image: relatedLocalized.content.featuredImage || null,
            category: post.categoryRef?.name ?? post.category ?? 'Publication',
            author: post.authorName,
            date: (post.publishedAt ?? post.createdAt).toISOString(),
        };
    });
    const comments: PublicBlogComment[] = cmsPost.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() }));
    const availableLocales = getAvailablePostLocales(cmsPost);
    const currentLocale = locale === 'bg' ? 'bg' : 'en';

    return (
        <BlogArticleFrame
            postId={cmsPost.id}
            slug={cmsPost.slug}
            postType={cmsPost.type}
            initialLikeCount={cmsPost._count.likes}
            initialViewCount={cmsPost.viewCount}
            initiallyLiked={cmsPost.likes.length > 0}
            title={localized.title}
            excerpt={localized.excerpt}
            initialContent={content}
            featuredImage={content.featuredImage || null}
            typeLabel={typeLabel}
            categoryLabel={categoryLabel}
            author={cmsPost.authorName}
            publishedAt={publishedAt}
            tags={cmsPost.tags}
            relatedPosts={relatedPosts}
            currentLocale={currentLocale}
            availableLocales={availableLocales}
            comments={<BlogComments postId={cmsPost.id} initialComments={comments} />}
        />
    );
}
