import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { portfolioData } from '@/data/portfolio';
import { PostBody } from '@/components/blog/PostBody';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

type PostContent = { html?: string; text?: string; featuredImage?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const canonical = `${siteUrl}/blog/${slug}`;
    const cmsPost = await prisma.post.findUnique({ where: { slug } });

    if (cmsPost && cmsPost.status === 'PUBLISHED') {
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
                type: 'article',
                url: canonical,
                title: cmsPost.title,
                description,
                publishedTime,
                authors: [cmsPost.authorName],
                images: content.featuredImage ? [{ url: content.featuredImage, alt: cmsPost.title }] : undefined,
            },
            twitter: {
                card: content.featuredImage ? 'summary_large_image' : 'summary',
                title: cmsPost.title,
                description,
                images: content.featuredImage ? [content.featuredImage] : undefined,
            },
        };
    }

    const legacy = portfolioData.blogs.find((post) => post.slug === slug);
    if (!legacy) return { robots: { index: false, follow: false } };

    return {
        title: legacy.title,
        description: legacy.excerpt,
        alternates: { canonical },
        authors: [{ name: legacy.author.name }],
        robots: { index: true, follow: true },
        openGraph: {
            type: 'article',
            url: canonical,
            title: legacy.title,
            description: legacy.excerpt,
            authors: [legacy.author.name],
        },
        twitter: {
            card: 'summary',
            title: legacy.title,
            description: legacy.excerpt,
        },
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const cmsPost = await prisma.post.findUnique({ where: { slug } });

    if (cmsPost && cmsPost.status === 'PUBLISHED') {
        const content = (cmsPost.content ?? {}) as PostContent;
        return (
            <main className="min-h-screen bg-background text-foreground pb-24 pt-32">
                <article className="mx-auto w-full max-w-5xl px-6 md:px-12">
                    <Link href="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back to archive</Link>
                    <header className="mt-10 border-b border-foreground/10 pb-10">
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{cmsPost.type.replaceAll('_', ' ')} - {cmsPost.category ?? 'Publication'}</div>
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

    const legacy = portfolioData.blogs.find((post) => post.slug === slug);
    if (!legacy) notFound();

    return (
        <main className="min-h-screen bg-background text-foreground pb-24 pt-32">
            <article className="mx-auto w-full max-w-5xl px-6 md:px-12">
                <Link href="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back to archive</Link>
                <header className="mt-10 border-b border-foreground/10 pb-10">
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{legacy.category.replaceAll('-', ' ')}</div>
                    <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl">{legacy.title}</h1>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{legacy.excerpt}</p>
                    <div className="mt-8 flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"><span>{legacy.author.name}</span><time>{legacy.date}</time></div>
                </header>
                <div className="pt-12 text-lg leading-8 text-muted-foreground"><p>This legacy publication is retained as archive content. New and migrated publications are managed through the Portfolio CMS.</p></div>
            </article>
        </main>
    );
}
