'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import FlowingMenu from '@/components/ui/flowing-menu';
import { cn } from '@/lib/utils';
import type { PublicPost } from '@/lib/cms-posts';

const POSTS_PER_PAGE = 9;
const ROW_HEIGHT = 88;
const MOBILE_ROW_HEIGHT = 72;
const FALLBACK_IMAGE = '/dr-necrotix-mark.svg';

function categoryLabel(value: string) {
    return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function BlogArchiveClient({ posts }: { posts: PublicPost[] }) {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
    const [currentPage, setCurrentPage] = useState(1);
    const [isHoveringSort, setIsHoveringSort] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const categories = useMemo(() => {
        const bySlug = new Map<string, string>();
        for (const post of posts) bySlug.set(post.categorySlug || post.category, post.category);
        return [{ slug: 'all', label: 'All Publications' }, ...Array.from(bySlug, ([slug, label]) => ({ slug, label }))];
    }, [posts]);

    const filteredPosts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return posts
            .filter((post) => {
                const matchesSearch = !query
                    || post.title.toLowerCase().includes(query)
                    || post.excerpt.toLowerCase().includes(query)
                    || post.tags.some((tag) => tag.toLowerCase().includes(query));
                const matchesCategory = selectedCategory === 'all' || post.categorySlug === selectedCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return sortBy === 'latest' ? bDate - aDate : aDate - bDate;
            });
    }, [posts, searchQuery, selectedCategory, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

    const changePage = (nextPage: number) => {
        setCurrentPage(nextPage);
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const selectCategory = (category: string) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const changeSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const toggleSort = () => {
        setSortBy((value) => value === 'latest' ? 'oldest' : 'latest');
        setCurrentPage(1);
    };

    const menuItems = paginatedPosts.map((post) => ({
        link: `/blog/${post.slug}`,
        text: post.title,
        image: post.content.featuredImage || FALLBACK_IMAGE,
        category: post.category || categoryLabel(post.categorySlug),
        date: new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(post.date)).toUpperCase(),
    }));

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            <section className="relative z-20 px-4 pb-20 pt-24 sm:px-6 sm:pt-28 md:px-12 md:pt-32 lg:px-10">
                <div className="mx-auto max-w-screen-2xl">
                    <div className="mb-8 flex flex-col gap-5 border-b border-foreground/10 pb-5 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-8 md:pb-7">
                        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:overflow-visible md:px-0">
                            <div className="flex w-max min-w-full gap-6 md:w-auto md:flex-wrap md:gap-x-12 md:gap-y-6">
                                {categories.map((category) => {
                                    const count = category.slug === 'all' ? posts.length : posts.filter((post) => post.categorySlug === category.slug).length;
                                    const active = selectedCategory === category.slug;
                                    return (
                                        <button key={category.slug} type="button" onClick={() => selectCategory(category.slug)} className={cn('group relative flex shrink-0 items-start py-2 text-[12px] font-bold uppercase tracking-[0.16em] transition-all md:text-[15px] md:tracking-[0.2em]', active ? 'text-primary opacity-100' : 'text-muted-foreground/50 hover:text-foreground')}>
                                            <span className="relative whitespace-nowrap">{category.label}{active && <motion.div layoutId="active-blog-category" className="absolute -bottom-2 left-0 right-0 h-[2px] bg-primary" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}</span>
                                            <span className={cn('ml-1 text-[11px] font-bold transition-all md:text-[13px]', active ? 'text-primary opacity-100' : 'text-foreground/50 opacity-60')}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex w-full items-center gap-3 md:w-auto md:gap-6">
                            <div className="group relative shrink-0">
                                <AnimatePresence>{isHoveringSort && <motion.div initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 5, x: '-50%' }} className="pointer-events-none absolute -top-10 left-1/2 z-50 hidden whitespace-nowrap rounded bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background shadow-xl md:block">{sortBy}</motion.div>}</AnimatePresence>
                                <button type="button" onClick={toggleSort} onMouseEnter={() => setIsHoveringSort(true)} onMouseLeave={() => setIsHoveringSort(false)} className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 text-muted-foreground transition hover:border-foreground hover:bg-foreground hover:text-background md:h-12 md:w-12" aria-label={`Sort ${sortBy === 'latest' ? 'oldest first' : 'latest first'}`}>
                                    {sortBy === 'latest' ? <SortDesc size={19} strokeWidth={1.5} /> : <SortAsc size={19} strokeWidth={1.5} />}
                                </button>
                            </div>

                            <div className="group relative min-w-0 flex-1 md:w-80">
                                <input type="search" placeholder="SEARCH ARCHIVE" value={searchQuery} onChange={(event) => changeSearch(event.target.value)} className="w-full border-b border-foreground/10 bg-transparent py-3 pr-7 text-[12px] font-bold uppercase tracking-[0.08em] text-foreground outline-none transition placeholder:text-muted-foreground/30 focus:border-primary/60 md:text-[14px] md:tracking-[0.1em]" />
                                <Search className="absolute bottom-3 right-0 h-4 w-4 opacity-30 transition-opacity group-focus-within:opacity-100" />
                            </div>
                        </div>
                    </div>

                    <div ref={listRef} className="relative mx-auto max-w-screen-2xl scroll-mt-24 pt-2 md:pt-5">
                        {paginatedPosts.length > 0 ? (
                            <div className="w-full overflow-hidden" style={{ height: `clamp(${paginatedPosts.length * MOBILE_ROW_HEIGHT}px, ${paginatedPosts.length * 9.5}vw, ${paginatedPosts.length * ROW_HEIGHT}px)` }}><FlowingMenu items={menuItems} /></div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground/50 md:text-sm">No publications match the selected filters.</p></motion.div>
                        )}

                        {totalPages > 1 && (
                            <div className="mt-10 flex items-center justify-between gap-3 border-t border-foreground/10 pt-6 md:mt-16 md:pt-8">
                                <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page === 1} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-0 md:text-[16px] md:tracking-[0.2em]">Prev</button>
                                <div className="flex items-center gap-4 md:gap-7">{Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} type="button" onClick={() => changePage(pageNumber)} className={cn('relative py-1 text-sm font-bold transition-colors md:text-lg', page === pageNumber ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground')}>{String(pageNumber).padStart(2, '0')}{page === pageNumber && <motion.div layoutId="active-blog-page" className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary" />}</button>)}</div>
                                <button type="button" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground disabled:opacity-0 md:text-[16px] md:tracking-[0.2em]">Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
