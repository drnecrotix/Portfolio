'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, SortAsc, SortDesc, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import FlowingMenu from '@/components/ui/flowing-menu';
import { BlogHeroTitle } from '@/components/blog/BlogHeroTitle';
import { cn } from '@/lib/utils';
import type { BlogArchivePost } from '@/lib/cms-posts';
import type { BlogSettings } from '@/lib/blog-settings';

const POSTS_PER_PAGE = 9;
const ROW_HEIGHT = 88;
const MOBILE_ROW_HEIGHT = 72;
const FALLBACK_IMAGE = '/dr-necrotix-mark.svg';

function displayDate(value: string) {
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function normalizeTag(value: string) {
    return value.replace(/^#/, '').trim();
}

export function BlogArchiveClient({ posts, settings }: { posts: BlogArchivePost[]; settings: BlogSettings }) {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
    const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') ?? 'all');
    const [selectedTag, setSelectedTag] = useState(() => searchParams.get('tag') ?? 'all');
    const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
    const [currentPage, setCurrentPage] = useState(1);
    const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
    const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const tagRailRef = useRef<HTMLElement>(null);
    const activeTagRef = useRef<HTMLButtonElement>(null);
    const tagSelectionMountedRef = useRef(false);
    const suppressTagClickRef = useRef(false);
    const tagDragRef = useRef({ active: false, pointerId: -1, startX: 0, scrollLeft: 0, moved: false });

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
                const matchesCategory = selectedCategory === 'all' || post.categorySlug === selectedCategory;
                const matchesTag = selectedTag === 'all' || post.tags.some((tag) => normalizeTag(tag).toLocaleLowerCase() === tagFilter);
                return matchesSearch && matchesCategory && matchesTag;
            })
            .sort((a, b) => {
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return sortBy === 'latest' ? bDate - aDate : aDate - bDate;
            });
    }, [posts, searchQuery, selectedCategory, selectedTag, sortBy]);

    const hasFilters = Boolean(searchQuery.trim()) || selectedCategory !== 'all' || selectedTag !== 'all';
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

    const menuItems = paginatedPosts.map((post) => ({
        link: `/blog/${post.slug}`,
        text: post.title,
        image: post.featuredImage || FALLBACK_IMAGE,
        category: post.category,
        date: displayDate(post.date).toUpperCase(),
    }));

    const resetPage = () => setCurrentPage(1);
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setSelectedTag('all');
        setCurrentPage(1);
    };
    const changePage = (nextPage: number) => {
        setCurrentPage(nextPage);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const updateTagRailState = () => {
        const rail = tagRailRef.current;
        if (!rail) return;
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        setCanScrollTagsLeft(rail.scrollLeft > 4);
        setCanScrollTagsRight(rail.scrollLeft < maxScroll - 4);
    };

    const scrollTags = (direction: -1 | 1) => {
        const rail = tagRailRef.current;
        if (!rail) return;
        rail.scrollBy({ left: direction * Math.max(240, rail.clientWidth * 0.72), behavior: 'smooth' });
    };

    const chooseTag = (tag: string) => {
        if (suppressTagClickRef.current) return;
        setSelectedTag(tag);
        resetPage();
    };

    const startTagDrag = (event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType === 'touch' || event.button !== 0) return;
        const rail = tagRailRef.current;
        if (!rail) return;
        tagDragRef.current = { active: true, pointerId: event.pointerId, startX: event.clientX, scrollLeft: rail.scrollLeft, moved: false };
        rail.setPointerCapture(event.pointerId);
    };

    const moveTagDrag = (event: ReactPointerEvent<HTMLElement>) => {
        const rail = tagRailRef.current;
        const drag = tagDragRef.current;
        if (!rail || !drag.active || drag.pointerId !== event.pointerId) return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 4) drag.moved = true;
        if (!drag.moved) return;
        event.preventDefault();
        rail.scrollLeft = drag.scrollLeft - delta;
    };

    const endTagDrag = (event: ReactPointerEvent<HTMLElement>) => {
        const rail = tagRailRef.current;
        const drag = tagDragRef.current;
        if (!rail || !drag.active || drag.pointerId !== event.pointerId) return;
        if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
        if (drag.moved) {
            suppressTagClickRef.current = true;
            window.setTimeout(() => { suppressTagClickRef.current = false; }, 0);
        }
        tagDragRef.current = { active: false, pointerId: -1, startX: 0, scrollLeft: rail.scrollLeft, moved: false };
        updateTagRailState();
    };

    useEffect(() => {
        const rail = tagRailRef.current;
        if (!rail) return;
        updateTagRailState();
        const onResize = () => updateTagRailState();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [tags.length]);

    useEffect(() => {
        const rail = tagRailRef.current;
        const active = activeTagRef.current;
        if (!rail || !active) return;
        const target = Math.max(0, Math.min(active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2, rail.scrollWidth - rail.clientWidth));
        const firstPosition = !tagSelectionMountedRef.current;
        tagSelectionMountedRef.current = true;
        if (firstPosition && selectedTag === 'all') {
            updateTagRailState();
            return;
        }
        rail.scrollTo({ left: target, behavior: firstPosition ? 'auto' : 'smooth' });
        const timer = window.setTimeout(updateTagRailState, firstPosition ? 0 : 260);
        return () => window.clearTimeout(timer);
    }, [selectedTag]);

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            <section className="px-4 pb-28 pt-24 sm:px-6 sm:pb-32 sm:pt-28 md:px-12 md:pt-32 lg:px-10">
                <div className="mx-auto max-w-screen-2xl">
                    <header className="grid gap-6 border-b border-foreground/10 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
                        <div className="max-w-3xl">
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-500 dark:text-fuchsia-300">{settings.eyebrow}</p>
                            <BlogHeroTitle settings={settings} className="mt-4 text-4xl leading-[1.03] sm:text-5xl lg:text-6xl" />
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{settings.subtitle}</p>
                        </div>
                        <div className="text-sm text-muted-foreground lg:text-right">
                            <p className="text-2xl font-semibold tabular-nums text-foreground">{posts.length}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em]">Publications</p>
                        </div>
                    </header>

                    <div className="relative border-b border-foreground/10" aria-label="Publication tags">
                        <div className="flex items-stretch gap-1">
                            <button
                                type="button"
                                onClick={() => scrollTags(-1)}
                                disabled={!canScrollTagsLeft}
                                aria-label="Scroll tags left"
                                className="my-3 grid size-9 shrink-0 place-items-center rounded-full border border-foreground/10 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:border-foreground/20 hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
                            >
                                <ChevronLeft className="size-4" />
                            </button>

                            <div className="relative min-w-0 flex-1">
                                {canScrollTagsLeft && <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />}
                                {canScrollTagsRight && <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />}
                                <nav
                                    ref={tagRailRef}
                                    onScroll={updateTagRailState}
                                    onPointerDown={startTagDrag}
                                    onPointerMove={moveTagDrag}
                                    onPointerUp={endTagDrag}
                                    onPointerCancel={endTagDrag}
                                    className="blog-tag-rail cursor-grab select-none overflow-x-auto overscroll-x-contain scroll-smooth px-2 active:cursor-grabbing"
                                >
                                    <div className="flex w-max min-w-full gap-2.5 py-3.5 md:gap-3">
                                        <button
                                            ref={selectedTag === 'all' ? activeTagRef : undefined}
                                            type="button"
                                            onClick={() => chooseTag('all')}
                                            className={cn(
                                                'group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] transition sm:px-3.5 sm:text-[11px]',
                                                selectedTag === 'all'
                                                    ? 'border-foreground bg-foreground text-background shadow-sm'
                                                    : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground/65 hover:border-foreground/20 hover:bg-foreground/[0.05] hover:text-foreground',
                                            )}
                                        >
                                            <span>All Publications</span>
                                            <span className={cn('tabular-nums', selectedTag === 'all' ? 'text-background/65' : 'text-muted-foreground/40')}>{posts.length}</span>
                                        </button>
                                        {tags.map(({ tag, count }) => {
                                            const active = selectedTag.toLocaleLowerCase() === tag.toLocaleLowerCase();
                                            return (
                                                <button
                                                    ref={active ? activeTagRef : undefined}
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => chooseTag(tag)}
                                                    className={cn(
                                                        'group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] transition sm:px-3.5 sm:text-[11px]',
                                                        active
                                                            ? 'border-foreground bg-foreground text-background shadow-sm'
                                                            : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground/65 hover:border-foreground/20 hover:bg-foreground/[0.05] hover:text-foreground',
                                                    )}
                                                >
                                                    <span>#{tag}</span>
                                                    <span className={cn('tabular-nums', active ? 'text-background/65' : 'text-muted-foreground/40')}>{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </nav>
                            </div>

                            <button
                                type="button"
                                onClick={() => scrollTags(1)}
                                disabled={!canScrollTagsRight}
                                aria-label="Scroll tags right"
                                className="my-3 grid size-9 shrink-0 place-items-center rounded-full border border-foreground/10 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:border-foreground/20 hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 border-b border-foreground/10 py-5 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-center">
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

                        <button type="button" onClick={() => { setSortBy((value) => value === 'latest' ? 'oldest' : 'latest'); resetPage(); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.025] px-3 text-xs text-muted-foreground transition hover:text-foreground" aria-label={`Sort ${sortBy === 'latest' ? 'oldest first' : 'latest first'}`}>
                            {sortBy === 'latest' ? <SortDesc className="size-4" /> : <SortAsc className="size-4" />}
                            <span>{sortBy === 'latest' ? 'Latest' : 'Oldest'}</span>
                        </button>
                    </div>

                    <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 py-4 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-3">
                            <p><span className="font-medium text-foreground">{filteredPosts.length}</span> {filteredPosts.length === 1 ? 'publication' : 'publications'} in this view</p>
                            {selectedTag !== 'all' && (
                                <button type="button" onClick={() => chooseTag('all')} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 font-mono text-[10px] text-primary transition hover:bg-primary/[0.1]" aria-label={`Clear ${selectedTag} tag filter`}>
                                    #{selectedTag}<X className="size-3" />
                                </button>
                            )}
                        </div>
                        {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-2 font-medium text-foreground transition hover:text-primary"><X className="size-3.5" /> Clear filters</button>}
                    </div>

                    <div ref={listRef} className="scroll-mt-24">
                        {paginatedPosts.length > 0 ? (
                            <div className="w-full overflow-hidden border-b border-foreground/10" style={{ height: `clamp(${paginatedPosts.length * MOBILE_ROW_HEIGHT}px, ${paginatedPosts.length * 9.5}vw, ${paginatedPosts.length * ROW_HEIGHT}px)` }}>
                                <FlowingMenu items={menuItems} />
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-foreground/15 py-20 text-center">
                                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">No publications match these filters.</p>
                                {hasFilters && <button type="button" onClick={clearFilters} className="mt-5 text-sm font-medium text-foreground underline decoration-foreground/20 underline-offset-4 hover:decoration-foreground">Clear filters and view the full journal</button>}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-10 flex items-center justify-between gap-3 border-t border-foreground/10 pt-6 md:mt-14 md:pt-8">
                                <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-20">Prev</button>
                                <div className="flex items-center gap-3 sm:gap-5">
                                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                        <button key={pageNumber} type="button" onClick={() => changePage(pageNumber)} aria-label={`Page ${pageNumber}`} aria-current={page === pageNumber ? 'page' : undefined} className={cn('relative min-w-7 py-1 text-sm font-bold transition-colors', page === pageNumber ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground')}>
                                            {String(pageNumber).padStart(2, '0')}
                                            {page === pageNumber && <motion.div layoutId="active-blog-page" className="absolute -bottom-1 left-0 right-0 h-px bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-20">Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
