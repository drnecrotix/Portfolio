'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Heart, Languages } from 'lucide-react';
import type { CmsPostContent } from '@/lib/cms-posts';

export type RelatedBlogPost = {
    slug: string;
    title: string;
    excerpt: string | null;
    image: string | null;
    category: string;
    author: string;
    date: string;
};

type LocalizedPayload = {
    ok: boolean;
    locale: 'en' | 'bg';
    title: string;
    excerpt: string | null;
    content: CmsPostContent;
    availableLocales: Array<'en' | 'bg'>;
    error?: string;
};

export function BlogArticleFrame({
    postId,
    slug,
    postType,
    initialLikeCount,
    initiallyLiked,
    title,
    excerpt,
    initialContent,
    featuredImage,
    typeLabel,
    categoryLabel,
    author,
    publishedAt,
    tags,
    relatedPosts,
    currentLocale,
    availableLocales,
    comments,
}: {
    postId: string;
    slug: string;
    postType: string;
    initialLikeCount: number;
    initiallyLiked: boolean;
    title: string;
    excerpt: string | null;
    initialContent: CmsPostContent;
    featuredImage: string | null;
    typeLabel: string;
    categoryLabel: string;
    author: string;
    publishedAt: string;
    tags: string[];
    relatedPosts: RelatedBlogPost[];
    currentLocale: 'en' | 'bg';
    availableLocales: Array<'en' | 'bg'>;
    comments?: ReactNode;
}) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [liked, setLiked] = useState(initiallyLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [liking, setLiking] = useState(false);
    const [switchingLocale, setSwitchingLocale] = useState(false);
    const [activeLocale, setActiveLocale] = useState(currentLocale);
    const [displayTitle, setDisplayTitle] = useState(title);
    const [displayExcerpt, setDisplayExcerpt] = useState(excerpt);
    const [displayContent, setDisplayContent] = useState<CmsPostContent>(initialContent);
    const [languageError, setLanguageError] = useState<string | null>(null);

    const copyLink = async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const switchLanguage = async (locale: 'en' | 'bg') => {
        if (locale === activeLocale || switchingLocale || !availableLocales.includes(locale)) return;
        setSwitchingLocale(true);
        setLanguageError(null);

        try {
            const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/locale`, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locale }),
            });
            const data = await response.json() as LocalizedPayload;
            if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to switch publication language.');

            setDisplayTitle(data.title);
            setDisplayExcerpt(data.excerpt);
            setDisplayContent(data.content);
            setActiveLocale(data.locale);
        } catch (error) {
            setLanguageError(error instanceof Error ? error.message : 'Unable to switch publication language.');
        } finally {
            window.setTimeout(() => setSwitchingLocale(false), 220);
        }
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

    const dateLabel = new Date(publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const showLanguageSwitch = availableLocales.length > 1;

    return (
        <main className="min-h-screen bg-background pb-24 pt-28 text-foreground sm:pt-32">
            <header className="container mx-auto max-w-5xl px-6">
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: 'easeOut' }} className="mx-auto max-w-3xl">
                    <button onClick={goBack} className="group mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back to journal</span>
                    </button>

                    <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                        <span className="text-fuchsia-400 dark:text-fuchsia-300">Journal</span>
                        <span className="h-px w-5 bg-foreground/20" />
                        <span>{categoryLabel}</span>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={activeLocale}
                            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <h1 className="text-4xl font-black leading-[1.04] tracking-[-0.035em] sm:text-5xl lg:text-6xl">{displayTitle}</h1>
                            {displayExcerpt && <p className="mt-7 max-w-2xl text-lg font-light leading-8 text-muted-foreground sm:text-xl">{displayExcerpt}</p>}
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{author}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={publishedAt}>{dateLabel}</time>
                        <span aria-hidden="true">·</span>
                        <span>{typeLabel}</span>
                    </div>
                </motion.div>
            </header>

            {featuredImage && (
                <div className="container mx-auto mt-12 max-w-5xl px-6">
                    <motion.figure initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.025]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={featuredImage} alt={displayTitle} className="max-h-[38rem] w-full object-cover" />
                    </motion.figure>
                </div>
            )}

            <div className="container mx-auto mt-10 max-w-5xl px-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="mx-auto flex max-w-3xl items-center justify-between gap-5 border-y border-foreground/10 py-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">A note from the journal</span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <motion.button type="button" onClick={() => void toggleLike()} disabled={liking} aria-pressed={liked} aria-label={liked ? 'Unlike this publication' : 'Like this publication'} whileTap={{ scale: 0.9 }} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition ${liked ? 'border-rose-500/25 bg-rose-500/10 text-rose-500' : 'border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:text-foreground'}`}>
                            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                            <span>{likeCount}</span>
                        </motion.button>
                        <button onClick={copyLink} className="inline-flex h-9 items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 text-xs text-muted-foreground transition hover:text-foreground">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span>{copied ? 'Copied' : 'Share'}</span>
                        </button>
                        {showLanguageSwitch && (
                            <motion.div layout className="inline-flex h-9 items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] p-1" aria-label="Publication language">
                                <Languages className={`ml-2 h-4 w-4 ${switchingLocale ? 'animate-spin text-fuchsia-500' : 'text-muted-foreground'}`} />
                                {(['en', 'bg'] as const).filter((locale) => availableLocales.includes(locale)).map((locale) => (
                                    <motion.button
                                        layout
                                        key={locale}
                                        type="button"
                                        onClick={() => void switchLanguage(locale)}
                                        disabled={switchingLocale || locale === activeLocale}
                                        aria-pressed={locale === activeLocale}
                                        whileTap={{ scale: 0.92 }}
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${locale === activeLocale ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {locale}
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
                {languageError && <p className="mx-auto mt-3 max-w-3xl text-right text-xs text-rose-500">{languageError}</p>}
            </div>

            <div className="container mx-auto mt-14 max-w-5xl px-6">
                <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay: 0.2 }} className="mx-auto min-w-0 max-w-3xl">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`body-${activeLocale}`}
                            initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                        >
                            {postType === 'POETRY' ? (
                                <div className="mx-auto max-w-2xl whitespace-pre-wrap font-serif text-lg leading-9 text-foreground md:text-xl md:leading-10">{displayContent.text ?? ''}</div>
                            ) : (
                                <div
                                    className="prose prose-lg max-w-none prose-headings:scroll-mt-32 prose-headings:font-black prose-headings:tracking-tight prose-h2:mb-5 prose-h2:mt-14 prose-h2:text-3xl prose-h3:mt-10 prose-p:my-6 prose-p:leading-8 prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-fuchsia-600 prose-a:decoration-fuchsia-500/30 prose-a:underline-offset-4 prose-hr:my-14 prose-hr:border-foreground/10 prose-blockquote:my-12 prose-blockquote:rounded-r-2xl prose-blockquote:border-l-4 prose-blockquote:border-fuchsia-500/70 prose-blockquote:bg-foreground/[0.025] prose-blockquote:px-7 prose-blockquote:py-5 prose-blockquote:text-xl prose-blockquote:font-medium prose-blockquote:italic prose-blockquote:leading-9 prose-blockquote:text-foreground prose-blockquote:[quotes:none] prose-blockquote:before:content-none prose-blockquote:after:content-none prose-img:my-12 prose-img:rounded-2xl prose-img:border prose-img:border-foreground/10 prose-li:text-muted-foreground dark:prose-invert dark:prose-a:text-fuchsia-300 [&>p:first-of-type]:text-[1.08rem] [&>p:first-of-type]:leading-8 [&>p:first-of-type]:text-foreground/85"
                                    dangerouslySetInnerHTML={{ __html: displayContent.html ?? '' }}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {tags.length > 0 && (
                        <section className="mt-16 flex flex-wrap gap-x-4 gap-y-2 border-t border-foreground/10 pt-7">
                            {tags.map((tag) => <Link key={tag} href={`/blog?q=${encodeURIComponent(tag)}`} className="font-mono text-xs text-muted-foreground transition hover:text-foreground">#{tag.replace(/^#/, '')}</Link>)}
                        </section>
                    )}
                </motion.article>
            </div>

            {comments && <div className="container mx-auto mt-16 max-w-5xl px-6"><div className="mx-auto max-w-3xl">{comments}</div></div>}

            {relatedPosts.length > 0 && (
                <section className="container mx-auto mt-20 max-w-5xl border-t border-foreground/10 px-6 pt-12">
                    <div className="mx-auto max-w-3xl">
                        <div className="mb-8 flex items-center justify-between gap-5">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Keep reading</p>
                                <h3 className="mt-2 text-xl font-bold">More from the journal</h3>
                            </div>
                            <Link href="/blog" className="text-sm text-muted-foreground transition hover:text-foreground">View all</Link>
                        </div>
                        <div className="divide-y divide-foreground/10 border-y border-foreground/10">
                            {relatedPosts.map((post, index) => (
                                <motion.article key={post.slug} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: index * 0.06 }}>
                                    <Link href={`/blog/${post.slug}`} className="group grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                                        <div>
                                            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{post.category} · {new Date(post.date).toLocaleDateString()}</div>
                                            <h4 className="text-xl font-bold transition group-hover:text-fuchsia-500 dark:group-hover:text-fuchsia-300">{post.title}</h4>
                                            {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>}
                                        </div>
                                        <span className="hidden text-lg text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground sm:block">↗</span>
                                    </Link>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
