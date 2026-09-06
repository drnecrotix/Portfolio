'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock3, Rows3, Search, SortAsc, SortDesc, Sparkles, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import FlowingMenu from '@/components/ui/flowing-menu';
import { cn } from '@/lib/utils';
import type { BlogArchivePost } from '@/lib/cms-posts';

const POSTS_PER_PAGE = 9;
const ROW_HEIGHT = 88;
const MOBILE_ROW_HEIGHT = 72;
const FALLBACK_IMAGE = '/dr-necrotix-mark.svg';

type ViewMode = 'editorial' | 'visual';

function displayDate(value: string) {
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function normalizeTag(value: string) {
    return value.replace(/^#/, '').trim();
}

export function BlogArchiveClient({ posts }: { posts: BlogArchivePost[] }) {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
    const [selectedType, setSelectedType] = useState(() => searchParams.get('type') ?? 'all');
    const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') ?? 'all');
    const [selectedTag, setSelectedTag] = useState(() => searchParams.get('tag') ?? 'all');
    const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
    const [viewMode, setViewMode] = useState<ViewMode>('editorial');
    const [currentPage, setCurrentPage] = useState(1);
    const listRef = useRef<HTMLDivElement>(null);

    const types = useMemo(() => {
        const bySlug = new Map<string, { label: string; count: number }>();
        for (const post of posts) {
            const current = bySlug.get(post.typeSlug);
            bySlug.set(post.typeSlug, { label: post.typeLabel, count: (current?.count ?? 0) + 1 });
        }
        return [{ slug: 'all', label: 'All Publications', count: posts.length }, ...Array.from(bySlug, ([slug, value]) => ({ slug, ...value }))];
    }, [posts]);

    const categories = useMemo(() => {
        const bySlug = new Map<string, { label: string; count: number }>();
        for (const post of posts) {
            const current = bySlug.get(post.categorySlug);
            bySlug.set(post.categorySlug, { label: post.category, count: (current?.count ?? 0) + 1 });
        }
        return Array.from(bySlug, ([slug, value]) => ({ slug, ...value })).sort((a, b) => a.label.localeCompare(b.label));
    }, [posts]);

    const tags = useMemo(() => {
        const counts = new Map<string, number>();
        for (const post of posts) {
            for (const rawTag of post.tags) {
                const tag = normalizeTag(rawTag);
                if (!tag) continue;
                counts.set(tag, (counts.get(tag) ?? 0) + 1);
            }
        }
        return Array.from(counts, ([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }, [posts]);

    const filteredPosts = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        const tagFilter = selectedTag.toLocaleLowerCase();
        return posts
            .filter((post) => {
                const matchesSearch = !query
                    || post.title.toLocaleLowerCase().includes(query)
                    || post.excerpt.toLocaleLowerCase().includes(query)
                    || post.category.toLocaleLowerCase().includes(query)
                    || post.typeLabel.toLocaleLowerCase().includes(query)
                    || post.tags.some((tag) => normalizeTag(tag).toLocaleLowerCase().includes(query));
                const matchesType = selectedType === 'all' || post.typeSlug === selectedType;
                const matchesCategory = selectedCategory === 'all' || post.categorySlug === selectedCategory;
                const matchesTag = selectedTag === 'all' || post.tags.some((tag) => normalizeTag(tag).toLocaleLowerCase() === tagFilter);
                return matchesSearch && matchesType && matchesCategory && matchesTag;
            })
            .sort((a, b) => {
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return sortBy === 'latest' ? bDate - aDate : aDate - bDate;
            });
    }, [posts, searchQuery, selectedType, selectedCategory, selectedTag, sortBy]);

    const hasFilters = Boolean(searchQuery.trim()) || selectedType !== 'all' || selectedCategory !== 'all' || selectedTag !== 'all';
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
    const spotlight = !hasFilters && page === 1 ? paginatedPosts[0] ?? null : null;
    const archivePosts = spotlight ? paginatedPosts.filter((post) => post.id !== spotlight.id) : paginatedPosts;

    const changePage = (nextPage: number) => {
        setCurrentPage(nextPage);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const resetPage = () => setCurrentPage(1);
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedType('all');
        setSelectedCategory('all');
        setSelectedTag('all');
        setCurrentPage(1);
    };

    const menuItems = archivePosts.map((post) => ({
        link: `/blog/${post.slug}`,
        text: post.title,
        image: post.featuredImage || FALLBACK_IMAGE,
        category: `${post.typeLabel} · ${post.category}`,
        date: displayDate(post.date).toUpperCase(),
    }));

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            <section className="px-4 pb-24 pt-24 sm:px-6 sm:pt-28 md:px-12 md:pt-32 lg:px-10">
                <div className="mx-auto max-w-screen-2xl">
                    <header className="grid gap-6 border-b border-foreground/10 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
                        <div className="max-w-3xl">
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-500 dark:text-fuchsia-300">NecrotixLab Journal</p>
                            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">Writing, notes & field logs.</h1>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Articles, thoughts, poetry and project logs collected as a readable editorial archive rather than a generic news feed.</p>
                        </div>
                        <div className="flex gap-8 text-sm text-muted-foreground lg:justify-end">
                            <div><p className="text-2xl font-semibold tabular-nums text-foreground">{posts.length}</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">Publications</p></div>
                            <div><p className="text-2xl font-semibold tabular-nums text-foreground">{Math.max(0, types.length - 1)}</p><p className="mt-1 text-xs uppercase tracking-[0.14em]">Formats</p></div>
                        </div>
                    </header>

                    <nav className="-mx-4 overflow-x-auto border-b border-foreground/10 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0" aria-label="Publication types">
                        <div className="flex w-max min-w-full gap-7 py-5 md:flex-wrap md:gap-x-10 md:gap-y-3">
                            {types.map((type) => {
                                const active = selectedType === type.slug;
                                return (
                                    <button
                                        key={type.slug}
                                        type="button"
                                        onClick={() => { setSelectedType(type.slug); resetPage(); }}
                                        className={cn('group relative flex shrink-0 items-start gap-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] transition sm:text-xs', active ? 'text-primary' : 'text-muted-foreground/55 hover:text-foreground')}
                                    >
                                        <span>{type.label}</span>
                                        <span className={cn('text-[10px] tabular-nums', active ? 'text-primary/70' : 'text-muted-foreground/35')}>{type.count}</span>
                                        {active && <motion.span layoutId="active-blog-type" className="absolute -bottom-5 left-0 right-0 h-px bg-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="grid gap-3 border-b border-foreground/10 py-5 lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto] lg:items-center">
                        <label className="group flex min-w-0 items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.025] px-4 py-2.5 focus-within:border-primary/40">
                            <Search className="size-4 shrink-0 text-muted-foreground" />
                            <input
                                type="search"
                                aria-label="SEARCH ARCHIVE"
                                placeholder="Search title, excerpt, tag or category"
                                value={searchQuery}
                                onChange={(event) => { setSearchQuery(event.target.value); resetPage(); }}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/45"
                            />
                            {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); resetPage(); }} aria-label="Clear search" className="text-muted-foreground transition hover:text-foreground"><X className="size-4" /></button>}
                        </label>

                        <select
                            aria-label="Filter by category"
                            value={selectedCategory}
                            onChange={(event) => { setSelectedCategory(event.target.value); resetPage(); }}
                            className="h-11 min-w-0 rounded-xl border border-foreground/10 bg-background px-3 text-xs text-foreground outline-none [color-scheme:dark]"
                        >
                            <option value="all">All categories</option>
                            {categories.map((category) => <option key={category.slug} value={category.slug}>{category.label} ({category.count})</option>)}
                        </select>

                        <select
                            aria-label="Filter by tag"
                            value={selectedTag}
                            onChange={(event) => { setSelectedTag(event.target.value); resetPage(); }}
                            className="h-11 min-w-0 rounded-xl border border-foreground/10 bg-background px-3 text-xs text-foreground outline-none [color-scheme:dark]"
                        >
                            <option value="all">All tags</option>
                            {tags.map(({ tag, count }) => <option key={tag} value={tag}>{tag} ({count})</option>)}
                        </select>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setSortBy((value) => value === 'latest' ? 'oldest' : 'latest'); resetPage(); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.025] px-3 text-xs text-muted-foreground transition hover:text-foreground" aria-label={`Sort ${sortBy === 'latest' ? 'oldest first' : 'latest first'}`} title={`Currently ${sortBy} first`}>
                                {sortBy === 'latest' ? <SortDesc className="size-4" /> : <SortAsc className="size-4" />}
                                <span className="hidden sm:inline">{sortBy === 'latest' ? 'Latest' : 'Oldest'}</span>
                            </button>
                            <div className="inline-flex h-11 rounded-xl border border-foreground/10 bg-foreground/[0.025] p-1" aria-label="Archive view">
                                <button type="button" onClick={() => setViewMode('editorial')} aria-label="Editorial list view" aria-pressed={viewMode === 'editorial'} className={cn('grid size-9 place-items-center rounded-lg transition', viewMode === 'editorial' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><Rows3 className="size-4" /></button>
                                <button type="button" onClick={() => setViewMode('visual')} aria-label="Visual archive view" aria-pressed={viewMode === 'visual'} className={cn('grid size-9 place-items-center rounded-lg transition', viewMode === 'visual' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><Sparkles className="size-4" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 py-4 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">{filteredPosts.length}</span> {filteredPosts.length === 1 ? 'publication' : 'publications'} in this view</p>
                        {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 font-medium text-foreground transition hover:text-primary"><X className="size-3.5" /> Clear filters</button>}
                    </div>

                    {spotlight && (
                        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-12 overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.02]">
                            <Link href={`/blog/${spotlight.slug}`} className="group grid lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                                <div className="relative min-h-64 overflow-hidden bg-foreground/[0.035] lg:min-h-[390px]">
                                    <img src={spotlight.featuredImage || FALLBACK_IMAGE} alt="" loading="eager" className={cn('h-full w-full transition duration-700 group-hover:scale-[1.025]', spotlight.featuredImage ? 'object-cover' : 'object-contain p-20 opacity-30')} />
                                    <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white backdrop-blur">Latest publication</div>
                                </div>
                                <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{spotlight.typeLabel} · {spotlight.category}</p>
                                        <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] transition group-hover:text-fuchsia-500 sm:text-4xl dark:group-hover:text-fuchsia-300">{spotlight.title}</h2>
                                        {spotlight.excerpt && <p className="mt-5 line-clamp-4 text-sm leading-7 text-muted-foreground sm:text-base">{spotlight.excerpt}</p>}
                                    </div>
                                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 pt-5 text-xs text-muted-foreground">
                                        <div className="flex flex-wrap items-center gap-3"><time dateTime={spotlight.date}>{displayDate(spotlight.date)}</time><span>·</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{spotlight.readingMinutes} min read</span></div>
                                        <span className="inline-flex items-center gap-2 font-medium text-foreground">Read publication <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                                    </div>
                                </div>
                            </Link>
                        </motion.article>
                    )}

                    <div ref={listRef} className="scroll-mt-24">
                        {archivePosts.length > 0 ? (
                            viewMode === 'editorial' ? (
                                <div className="divide-y divide-foreground/10 border-y border-foreground/10">
                                    {archivePosts.map((post, index) => (
                                        <motion.article key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.2) }}>
                                            <Link href={`/blog/${post.slug}`} className="group grid gap-5 py-6 md:grid-cols-[170px_minmax(0,1fr)_auto] md:items-center lg:grid-cols-[210px_minmax(0,1fr)_auto]">
                                                <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.025]">
                                                    <img src={post.featuredImage || FALLBACK_IMAGE} alt="" loading="lazy" decoding="async" className={cn('h-full w-full transition duration-500 group-hover:scale-[1.035]', post.featuredImage ? 'object-cover' : 'object-contain p-8 opacity-25')} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.17em] text-muted-foreground"><span className="text-fuchsia-500 dark:text-fuchsia-300">{post.typeLabel}</span><span>·</span><span>{post.category}</span></div>
                                                    <h2 className="mt-3 text-xl font-bold leading-snug tracking-[-0.02em] transition group-hover:text-fuchsia-500 sm:text-2xl dark:group-hover:text-fuchsia-300">{post.title}</h2>
                                                    {post.excerpt && <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">{post.excerpt}</p>}
                                                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground">
                                                        <time dateTime={post.date}>{displayDate(post.date)}</time><span>·</span><span>{post.readingMinutes} min read</span>
                                                        {post.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full border border-foreground/10 px-2 py-0.5">#{normalizeTag(tag)}</span>)}
                                                    </div>
                                                </div>
                                                <ArrowUpRight className="hidden size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground md:block" />
                                            </Link>
                                        </motion.article>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full overflow-hidden border-b border-foreground/10" style={{ height: `clamp(${archivePosts.length * MOBILE_ROW_HEIGHT}px, ${archivePosts.length * 9.5}vw, ${archivePosts.length * ROW_HEIGHT}px)` }}><FlowingMenu items={menuItems} /></div>
                            )
                        ) : (
                            <div className="rounded-3xl border border-dashed border-foreground/15 py-20 text-center">
                                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">No publications match these filters.</p>
                                {hasFilters && <button type="button" onClick={clearFilters} className="mt-5 text-sm font-medium text-foreground underline decoration-foreground/20 underline-offset-4 hover:decoration-foreground">Clear filters and view the full journal</button>}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-10 flex items-center justify-between gap-3 border-t border-foreground/10 pt-6 md:mt-14 md:pt-8">
                                <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-20">Prev</button>
                                <div className="flex items-center gap-3 sm:gap-5">{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => changePage(pageNumber)} aria-label={`Page ${pageNumber}`} aria-current={page === pageNumber ? 'page' : undefined} className={cn('relative min-w-7 py-1 text-sm font-bold transition-colors', page === pageNumber ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground')}>{String(pageNumber).padStart(2, '0')}{page === pageNumber && <motion.div layoutId="active-blog-page" className="absolute -bottom-1 left-0 right-0 h-px bg-primary" />}</button>)}</div>
                                <button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-20">Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
