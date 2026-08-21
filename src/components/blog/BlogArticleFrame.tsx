'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Heart } from 'lucide-react';

export type RelatedBlogPost = {
    slug: string;
    title: string;
    excerpt: string | null;
    image: string | null;
    category: string;
    author: string;
    date: string;
};

export function BlogArticleFrame({
    postId,
    initialLikeCount,
    initiallyLiked,
    title,
    excerpt,
    featuredImage,
    typeLabel,
    categoryLabel,
    author,
    publishedAt,
    tags,
    relatedPosts,
    children,
}: {
    postId: string;
    initialLikeCount: number;
    initiallyLiked: boolean;
    title: string;
    excerpt: string | null;
    featuredImage: string | null;
    typeLabel: string;
    categoryLabel: string;
    author: string;
    publishedAt: string;
    tags: string[];
    relatedPosts: RelatedBlogPost[];
    children: ReactNode;
}) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [liked, setLiked] = useState(initiallyLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [liking, setLiking] = useState(false);

    const copyLink = async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const toggleLike = async () => {
        if (liking) return;
        setLiking(true);
        try {
            const response = await fetch('/api/blog/likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to update like.');
            setLiked(Boolean(data.liked));
            setLikeCount(Number(data.count) || 0);
        } finally {
            setLiking(false);
        }
    };

    const goBack = () => {
        if (window.history.length > 2) router.back();
        else router.push('/blog');
    };

    return (
        <main className="min-h-screen bg-background pb-24 pt-32 text-foreground">
            <div className="container mx-auto mb-12 max-w-7xl px-6">
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
                    <button
                        onClick={goBack}
                        className="group mb-7 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.035] px-3.5 py-2 text-sm font-medium text-foreground/70 shadow-sm transition-all hover:border-foreground/20 hover:bg-foreground/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back</span>
                    </button>
                    <div className="max-w-5xl">
                        <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                            {typeLabel} · {categoryLabel}
                        </div>
                        <h1 className="mb-6 text-4xl font-black leading-[1.06] tracking-tight md:text-5xl lg:text-7xl">{title}</h1>
                        {excerpt && <p className="max-w-3xl text-lg font-light leading-relaxed text-muted-foreground md:text-xl">{excerpt}</p>}
                    </div>
                </motion.div>
            </div>

            {featuredImage && (
                <div className="container mx-auto mb-12 max-w-7xl px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7, delay: 0.16, ease: 'easeOut' }}
                        className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.03] shadow-2xl md:aspect-[2/1]"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={featuredImage} alt={title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </motion.div>
                </div>
            )}

            <div className="container mx-auto mb-16 max-w-7xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.22 }}
                    className="flex flex-col items-start justify-between gap-6 border-y border-foreground/10 py-6 md:flex-row md:items-center"
                >
                    <div className="flex w-full items-center justify-between gap-10 md:w-auto md:justify-start">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Written by</span>
                            <span className="font-bold">{author}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Published on</span>
                            <time className="font-bold" dateTime={publishedAt}>{new Date(publishedAt).toLocaleDateString()}</time>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2">
                            <motion.button
                                type="button"
                                onClick={() => void toggleLike()}
                                disabled={liking}
                                aria-pressed={liked}
                                aria-label={liked ? 'Unlike this publication' : 'Like this publication'}
                                whileTap={{ scale: 0.88 }}
                                animate={liked ? { scale: [1, 1.22, 0.96, 1] } : { scale: 1 }}
                                transition={{ duration: 0.42, ease: 'easeOut' }}
                                className={`group flex size-10 items-center justify-center rounded-full border transition disabled:opacity-60 ${liked ? 'border-rose-500/25 bg-rose-500/12 text-rose-500' : 'border-foreground/10 bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.09] hover:text-foreground'}`}
                            >
                                <Heart className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${liked ? 'fill-current' : ''}`} strokeWidth={1.8} />
                            </motion.button>
                            <motion.span
                                key={likeCount}
                                initial={{ scale: 0.8, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-flex min-w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.045] px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground"
                                aria-label={`${likeCount} likes`}
                            >
                                {likeCount}
                            </motion.span>
                        </div>
                        <button
                            onClick={copyLink}
                            className="flex items-center gap-2 rounded-lg bg-foreground/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-foreground/[0.1] hover:text-foreground"
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span>{copied ? 'Copied!' : 'Copy link'}</span>
                        </button>
                    </div>
                </motion.div>
            </div>

            <div className="container mx-auto max-w-7xl px-6">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.28 }}
                        className="min-w-0 lg:col-span-8"
                    >
                        {children}
                    </motion.article>

                    <motion.aside
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.34 }}
                        className="lg:col-span-4"
                    >
                        <div className="space-y-10 lg:sticky lg:top-28">
                            <section>
                                <h3 className="mb-5 border-b border-foreground/10 pb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Article</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-muted-foreground">Type / Category</span>
                                        <span className="max-w-[60%] text-right font-medium">{typeLabel} · {categoryLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Author</span><span className="font-medium">{author}</span></div>
                                </div>
                            </section>

                            {tags.length > 0 && (
                                <section>
                                    <h3 className="mb-5 border-b border-foreground/10 pb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">Topics</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <Link key={tag} href={`/blog?q=${encodeURIComponent(tag)}`} className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/10 hover:text-primary">
                                                {tag}
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </motion.aside>
                </div>
            </div>

            {relatedPosts.length > 0 && (
                <section className="container mx-auto mt-20 max-w-7xl border-t border-foreground/10 px-6 pt-16">
                    <div className="mb-10 flex items-center justify-between gap-6">
                        <h3 className="text-2xl font-black tracking-tight">From the blog</h3>
                        <Link href="/blog" className="rounded-lg border border-foreground/10 bg-foreground/[0.04] px-5 py-2 text-sm font-bold transition-colors hover:bg-foreground/[0.08]">View all posts</Link>
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {relatedPosts.map((post, index) => (
                            <motion.article key={post.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: index * 0.08 }} className="group">
                                <Link href={`/blog/${post.slug}`}>
                                    {post.image && (
                                        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">{post.category}</div>
                                        </div>
                                    )}
                                    <h4 className="mb-3 text-2xl font-bold transition-colors group-hover:text-primary">{post.title}</h4>
                                    {post.excerpt && <p className="mb-4 line-clamp-2 text-muted-foreground">{post.excerpt}</p>}
                                    <div className="text-sm font-medium text-foreground">{post.author} · {new Date(post.date).toLocaleDateString()}</div>
                                </Link>
                            </motion.article>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
