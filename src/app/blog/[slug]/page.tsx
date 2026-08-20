import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PostBody } from '@/components/blog/PostBody';

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
    const cmsPost = await prisma.post.findUnique({
        where: { slug },
        include: {
            postType: { select: { name: true } },
            categoryRef: { select: { name: true } },
        },
    });

    if (!cmsPost || !isPublicPost(cmsPost)) notFound();

    const content = (cmsPost.content ?? {}) as PostContent;
    const typeLabel = cmsPost.postType?.name ?? cmsPost.type.replaceAll('_', ' ');
    const categoryLabel = cmsPost.categoryRef?.name ?? cmsPost.category ?? 'Publication';

    return (
        <main className="min-h-screen bg-background text-foreground pb-24 pt-32">
            <article className="mx-auto w-full max-w-5xl px-6 md:px-12">
                <Link href="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back to archive</Link>
                <header className="mt-10 border-b border-foreground/10 pb-10">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{typeLabel} - {categoryLabel}</div>
                    <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl">{cmsPost.title}</h1>
                    {cmsPost.excerpt && <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{cmsPost.excerpt}</p>}
                    <div className="mt-8 flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        <span>{cmsPost.authorName}</span>
                        <time dateTime={(cmsPost.publishedAt ?? cmsPost.createdAt).toISOString()}>{(cmsPost.publishedAt ?? cmsPost.createdAt).toLocaleDateString()}</time>
                    </div>
                </header>
                {content.featuredImage && (
                    <div className="mt-10 overflow-hidden rounded-2xl border border-foreground/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={content.featuredImage} alt={cmsPost.title} className="max-h-[38rem] w-full object-cover" />
                    </div>
                )}
                <div className="pt-12"><PostBody type={cmsPost.type} content={content} /></div>
            </article>
        </main>
    );
}
