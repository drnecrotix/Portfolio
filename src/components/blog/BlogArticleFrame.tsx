'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Check, Clock3, Copy, Eye, Heart, Languages, Share2, X } from 'lucide-react';
import { EditorialArticleContent } from '@/components/blog/EditorialArticleContent';
import type { CmsPostContent } from '@/lib/cms-posts';
import { estimateReadingMinutes } from '@/lib/reading-time';
import { cn } from '@/lib/utils';

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

function formatCompactCount(value: number) {
    const count = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    if (count < 1_000) return String(count);
    const units = [
        { divisor: 1_000_000_000, suffix: 'B' },
        { divisor: 1_000_000, suffix: 'M' },
        { divisor: 1_000, suffix: 'K' },
    ];
    for (const unit of units) {
        if (count < unit.divisor) continue;
        const scaled = count / unit.divisor;
        const decimals = scaled < 100 ? 1 : 0;
        return `${scaled.toFixed(decimals).replace(/\.0$/, '').replace('.', ',')}${unit.suffix}`;
    }
    return String(count);
}

export function BlogArticleFrame({
    postId,
    slug,
    postType,
    initialLikeCount,
    initialViewCount,
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
    initialViewCount: number;
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
    const viewRecordedRef = useRef(false);
    const [copied, setCopied] = useState(false);
    const [liked, setLiked] = useState(initiallyLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [viewCount, setViewCount] = useState(initialViewCount);
    const [liking, setLiking] = useState(false);
    const [switchingLocale, setSwitchingLocale] = useState(false);
    const [activeLocale, setActiveLocale] = useState(currentLocale);
    const [displayTitle, setDisplayTitle] = useState(title);
    const [displayExcerpt, setDisplayExcerpt] = useState(excerpt);
    const [displayContent, setDisplayContent] = useState<CmsPostContent>(initialContent);
    const [languageError, setLanguageError] = useState<string | null>(null);
    const [previewFeatured, setPreviewFeatured] = useState(false);

    useEffect(() => {
        if (viewRecordedRef.current) return;
        viewRecordedRef.current = true;
        const storageKey = `necrotix:blog-view:${postId}`;
        try {
            if (sessionStorage.getItem(storageKey) === '1') return;
            sessionStorage.setItem(storageKey, '1');
        } catch {
            // Storage is optional in restricted embedded browsers.
        }
        void fetch('/api/blog/views', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId }),
        })
            .then(async (response) => {
                const data = await response.json() as { count?: number };
                if (!response.ok) throw new Error('Unable to record view.');
                setViewCount(Number(data.count) || 0);
            })
            .catch(() => {
                try { sessionStorage.removeItem(storageKey); } catch { /* optional */ }
                viewRecordedRef.current = false;
            });
    }, [postId]);

    useEffect(() => {
        if (!previewFeatured) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPreviewFeatured(false);
        };
        document.addEventListener('keydown', onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [previewFeatured]);

    const copyLink = async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const sharePublication = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: displayTitle, url: window.location.href });
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
            }
        }
        await copyLink();
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

    const dateLabel = new Date(publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const readingMinutes = estimateReadingMinutes(postType === 'POETRY' ? displayContent.text ?? '' : displayContent.html ?? '', postType === 'POETRY' ? 180 : 220);
    const showLanguageSwitch = availableLocales.length > 1;
    const isNote = postType === 'NOTE';
    const compactPublication = isNote || postType === 'THOUGHT';

    return (
        <main className="min-h-screen bg-background pb-24 pt-28 text-foreground sm:pt-32">
            <header className="container mx-auto max-w-6xl px-6">
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: 'easeOut' }} className={cn('mx-auto', compactPublication ? 'max-w-2xl' : 'max-w-3xl')}>
                    <Link href="/blog" className="group mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back to journal</span>
                    </Link>

                    <div className={cn('mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground', isNote && 'justify-center text-center')}>
                        <span className="text-fuchsia-500 dark:text-fuchsia-300">Journal</span>
                        <span aria-hidden="true">/</span>
                        <span>{typeLabel}</span>
                        <span aria-hidden="true">/</span>
                        <span>{categoryLabel}</span>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={activeLocale} initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: 0.22, ease: 'easeOut' }} className={cn(isNote && 'text-center')}>
                            <h1 className={cn('font-black leading-[1.04] tracking-[-0.04em]', compactPublication ? 'text-4xl sm:text-5xl' : 'text-4xl sm:text-5xl lg:text-6xl')}>{displayTitle}</h1>
                            {displayExcerpt && <p className={cn('mt-7 max-w-2xl text-lg font-light leading-8 text-muted-foreground sm:text-xl', isNote && 'mx-auto')}>{displayExcerpt}</p>}
                        </motion.div>
                    </AnimatePresence>

                    <div className={cn('mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground', isNote && 'justify-center text-center')}>
                        <span className="font-medium text-foreground">{author}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={publishedAt}>{dateLabel}</time>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" /> {readingMinutes} min read</span>
                    </div>
                </motion.div>
            </header>

            {featuredImage && !compactPublication && (
                <div className="container mx-auto mt-12 max-w-6xl px-6">
                    <motion.button type="button" onClick={() => setPreviewFeatured(true)} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} className="group block w-full overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.025] text-left" aria-label="Open featured image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={featuredImage} alt={displayTitle} className="max-h-[42rem] w-full object-cover transition duration-700 group-hover:scale-[1.012]" />
                    </motion.button>
                </div>
            )}

            <div className="container mx-auto mt-9 max-w-6xl px-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className={cn('mx-auto flex flex-wrap items-center justify-between gap-3 border-y border-foreground/10 py-3.5', compactPublication ? 'max-w-2xl' : 'max-w-3xl')}>
                    <div className="flex items-center gap-2">
                        <motion.button type="button" onClick={() => void toggleLike()} disabled={liking} aria-pressed={liked} aria-label={liked ? 'Unlike this publication' : 'Like this publication'} whileTap={{ scale: 0.92 }} className={cn('inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition', liked ? 'border-rose-500/25 bg-rose-500/10 text-rose-500' : 'border-foreground/10 bg-foreground/[0.03] text-muted-foreground hover:text-foreground')}>
                            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
                            <span>{formatCompactCount(likeCount)}</span>
                        </motion.button>
                        <div className="inline-flex h-9 items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 text-xs font-medium text-muted-foreground" title={`${viewCount.toLocaleString()} views`} aria-label={`${viewCount.toLocaleString()} views`}>
                            <Eye className="h-4 w-4" /><span>{formatCompactCount(viewCount)}</span>
                        </div>
                        <button type="button" onClick={() => void sharePublication()} className="inline-flex h-9 items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 text-xs text-muted-foreground transition hover:text-foreground">
                            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}<span>{copied ? 'Copied' : 'Share'}</span>
                        </button>
                        <button type="button" onClick={() => void copyLink()} className="hidden h-9 items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 text-xs text-muted-foreground transition hover:text-foreground sm:inline-flex" aria-label="Copy publication link">
                            <Copy className="h-4 w-4" /><span>Copy link</span>
                        </button>
                    </div>

                    {showLanguageSwitch && (
                        <motion.div layout className="inline-flex h-9 items-center gap-1 rounded-full border border-foreground/10 bg-foreground/[0.03] p-1" aria-label="Publication language">
                            <Languages className={cn('ml-2 h-4 w-4', switchingLocale ? 'animate-spin text-fuchsia-500' : 'text-muted-foreground')} />
                            {(['en', 'bg'] as const).filter((locale) => availableLocales.includes(locale)).map((locale) => (
                                <motion.button layout key={locale} type="button" onClick={() => void switchLanguage(locale)} disabled={switchingLocale || locale === activeLocale} aria-pressed={locale === activeLocale} whileTap={{ scale: 0.92 }} className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition', locale === activeLocale ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                                    {locale}
                                </motion.button>
                            ))}
                        </motion.div>
                    )}
                </motion.div>
                {languageError && <p className={cn('mx-auto mt-3 text-right text-xs text-rose-500', compactPublication ? 'max-w-2xl' : 'max-w-3xl')}>{languageError}</p>}
            </div>

            <div className="container mx-auto mt-12 max-w-6xl px-6">
                <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, delay: 0.2 }} className="mx-auto min-w-0">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={`body-${activeLocale}`} initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }} transition={{ duration: 0.24, ease: 'easeOut' }}>
                            {postType === 'POETRY' ? (
                                <div className="mx-auto max-w-2xl whitespace-pre-wrap font-serif text-lg leading-9 text-foreground md:text-xl md:leading-10">{displayContent.text ?? ''}</div>
                            ) : (
                                <EditorialArticleContent html={displayContent.html ?? ''} postType={postType} />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {tags.length > 0 && (
                        <section className={cn('mx-auto mt-16 flex flex-wrap gap-2 border-t border-foreground/10 pt-7', compactPublication ? 'max-w-2xl' : 'max-w-3xl')} aria-label="Publication tags">
                            {tags.map((tag) => {
                                const cleanTag = tag.replace(/^#/, '');
                                return <Link key={tag} href={`/blog?tag=${encodeURIComponent(cleanTag)}`} className="rounded-full border border-foreground/10 px-3 py-1.5 font-mono text-[10px] text-muted-foreground transition hover:border-fuchsia-500/30 hover:text-foreground">#{cleanTag}</Link>;
                            })}
                        </section>
                    )}
                </motion.article>
            </div>

            {comments && <div className="container mx-auto mt-16 max-w-6xl px-6"><div className="mx-auto max-w-3xl">{comments}</div></div>}

            {relatedPosts.length > 0 && (
                <section className="container mx-auto mt-20 max-w-6xl border-t border-foreground/10 px-6 pt-12">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-7 flex items-end justify-between gap-5">
                            <div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Keep reading</p><h3 className="mt-2 text-2xl font-bold tracking-tight">More from the journal</h3></div>
                            <Link href="/blog" className="text-sm text-muted-foreground transition hover:text-foreground">View all</Link>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {relatedPosts.map((post, index) => (
                                <motion.article key={post.slug} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: index * 0.06 }} className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
                                    <Link href={`/blog/${post.slug}`} className="group grid h-full grid-cols-[110px_minmax(0,1fr)] sm:grid-cols-[140px_minmax(0,1fr)]">
                                        <div className="min-h-36 overflow-hidden bg-foreground/[0.035]">
                                            {post.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={post.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                                            ) : <div className="grid h-full place-items-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/40">Journal</div>}
                                        </div>
                                        <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
                                            <div>
                                                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{post.category} · {new Date(post.date).toLocaleDateString()}</div>
                                                <h4 className="mt-2 line-clamp-3 text-lg font-bold leading-snug transition group-hover:text-fuchsia-500 dark:group-hover:text-fuchsia-300">{post.title}</h4>
                                                {post.excerpt && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{post.excerpt}</p>}
                                            </div>
                                            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground">Read <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                                        </div>
                                    </Link>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {previewFeatured && featuredImage && (
                <div role="dialog" aria-modal="true" aria-label="Featured image preview" onClick={() => setPreviewFeatured(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm">
                    <button type="button" onClick={() => setPreviewFeatured(false)} className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-white/15 bg-black/50 text-white" aria-label="Close featured image preview"><X className="size-5" /></button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredImage} alt={displayTitle} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain" />
                </div>
            )}
        </main>
    );
}