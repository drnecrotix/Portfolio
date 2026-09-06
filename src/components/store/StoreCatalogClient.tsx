'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, Loader2, Search, Sparkles } from 'lucide-react';

type StoreCatalogProduct = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    description: string;
    category: string | null;
    priceCents: number;
    compareAtPriceCents: number | null;
    currency: string;
    coverImageUrl: string | null;
    featured: boolean;
    fileCount: number;
    createdAt: string;
};

type StoreCategory = {
    name: string;
    count: number;
};

type StoreCatalogResponse = {
    products: StoreCatalogProduct[];
    total: number;
    hasMore: boolean;
};

type StoreSort = 'featured' | 'newest' | 'price-low' | 'price-high';

const STORE_PAGE_SIZE = 18;

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

function catalogUrl(query: string, category: string, sort: StoreSort, offset: number) {
    const params = new URLSearchParams({
        offset: String(offset),
        limit: String(STORE_PAGE_SIZE),
        sort,
    });
    const normalizedQuery = query.trim();
    if (normalizedQuery) params.set('q', normalizedQuery);
    if (category !== 'All') params.set('category', category);
    return `/api/store/products?${params.toString()}`;
}

export function StoreCatalogClient({
    initialProducts,
    categories,
    totalProducts,
}: {
    initialProducts: StoreCatalogProduct[];
    categories: StoreCategory[];
    totalProducts: number;
}) {
    const [products, setProducts] = useState(initialProducts);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState<StoreSort>('featured');
    const [total, setTotal] = useState(totalProducts);
    const [hasMore, setHasMore] = useState(initialProducts.length < totalProducts);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const firstRender = useRef(true);
    const filterKey = `${query}\u0000${category}\u0000${sort}`;
    const filterKeyRef = useRef(filterKey);

    useEffect(() => {
        filterKeyRef.current = filterKey;
    }, [filterKey]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const controller = new AbortController();
        setRefreshing(true);
        setError(null);

        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(catalogUrl(query, category, sort, 0), {
                    cache: 'no-store',
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error(`Store catalog request failed with ${response.status}`);
                const data = await response.json() as StoreCatalogResponse;
                setProducts(data.products);
                setTotal(data.total);
                setHasMore(data.hasMore);
            } catch (requestError) {
                if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
                console.error(requestError);
                setError('Could not refresh the catalog. Please try again.');
            } finally {
                if (!controller.signal.aborted) setRefreshing(false);
            }
        }, query.trim() ? 250 : 0);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [category, query, sort]);

    async function loadMore() {
        if (!hasMore || loadingMore || refreshing) return;
        const requestKey = filterKey;
        setLoadingMore(true);
        setError(null);

        try {
            const response = await fetch(catalogUrl(query, category, sort, products.length), {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`Store catalog request failed with ${response.status}`);
            const data = await response.json() as StoreCatalogResponse;
            if (filterKeyRef.current !== requestKey) return;

            setProducts((current) => {
                const existing = new Set(current.map((product) => product.id));
                return [...current, ...data.products.filter((product) => !existing.has(product.id))];
            });
            setTotal(data.total);
            setHasMore(data.hasMore);
        } catch (requestError) {
            console.error(requestError);
            setError('Could not load more products. Please try again.');
        } finally {
            setLoadingMore(false);
        }
    }

    const categoryOptions = [{ name: 'All', count: totalProducts }, ...categories];

    return (
        <div className="min-w-0 max-w-full overflow-x-clip">
            <section className="min-w-0 max-w-full" aria-label="Store controls">
                <div className="rounded-[1.35rem] border border-foreground/10 bg-foreground/[0.018] p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.08)] sm:rounded-[1.7rem] sm:p-3">
                    <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-center">
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Search the Store</span>
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search art, resources, templates..."
                                className="h-12 min-w-0 w-full max-w-full rounded-2xl border border-foreground/10 bg-background pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-foreground/25"
                            />
                        </label>
                        <label className="min-w-0 w-full shrink-0 lg:w-auto">
                            <span className="sr-only">Sort products</span>
                            <select value={sort} onChange={(event) => setSort(event.target.value as StoreSort)} className="h-12 min-w-0 w-full max-w-full rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-semibold outline-none lg:min-w-44 lg:w-auto">
                                <option value="featured">Featured first</option>
                                <option value="newest">Newest</option>
                                <option value="price-low">Price: low to high</option>
                                <option value="price-high">Price: high to low</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-2.5 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
                        {categoryOptions.map((item) => {
                            const active = category === item.name;
                            return (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => setCategory(item.name)}
                                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground'}`}
                                >
                                    <span>{item.name}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-background/15 text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>{item.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {error ? <p className="mt-4 text-center text-xs font-semibold text-red-500" role="status">{error}</p> : null}

            {products.length ? (
                <>
                    <section className={`mt-5 grid min-w-0 max-w-full grid-cols-1 gap-3 transition-opacity sm:mt-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ${refreshing ? 'pointer-events-none opacity-45' : ''}`} aria-label="Digital products" aria-busy={refreshing}>
                        {products.map((product) => {
                            const free = product.priceCents === 0;
                            return (
                                <article key={product.id} className="group min-w-0 max-w-full overflow-hidden rounded-[1rem] border border-foreground/8 bg-foreground/[0.012] p-1.5 transition duration-300 [content-visibility:auto] [contain-intrinsic-size:280px_340px] hover:border-foreground/15 hover:bg-foreground/[0.022]">
                                    <Link href={`/store/${product.slug}`} className="block min-w-0 max-w-full">
                                        <div className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-[0.8rem] border border-foreground/8 bg-foreground/[0.035] shadow-[0_10px_28px_rgba(0,0,0,0.09)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.14)]">
                                            {product.coverImageUrl ? (
                                                // Store cover URLs can come from user-configured external hosts that are not known to next/image at build time.
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={product.coverImageUrl}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.07),transparent_40%)]">
                                                    <Download className="h-7 w-7 text-foreground/15" />
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent opacity-75" />
                                            <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
                                                {product.featured ? <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md"><Sparkles className="h-2.5 w-2.5" /> Featured</span> : null}
                                                {free ? <span className="rounded-full border border-white/15 bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-black">Free</span> : null}
                                            </div>
                                            <span className="absolute bottom-2 right-2 hidden h-7 w-7 translate-y-1 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                                        </div>
                                    </Link>

                                    <div className="min-w-0 px-1 pb-1 pt-2.5">
                                        <div className="flex min-w-0 items-center justify-between gap-2">
                                            <p className="min-w-0 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{product.category || 'Digital product'}</p>
                                            <div className="shrink-0 text-right">
                                                {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <span className="mr-1 text-[9px] text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</span> : null}
                                                <span className="text-xs font-black">{free ? 'Free' : money(product.priceCents, product.currency)}</span>
                                            </div>
                                        </div>

                                        <Link href={`/store/${product.slug}`} className="mt-1.5 block min-w-0 break-words line-clamp-2 text-sm font-bold leading-[1.25] tracking-[-0.015em] transition hover:underline">{product.title}</Link>
                                        <p className="mt-1 break-words line-clamp-1 text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">{product.excerpt || product.description}</p>

                                        <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-foreground/8 pt-2 text-[10px] text-muted-foreground">
                                            <span className="inline-flex min-w-0 items-center gap-1"><Download className="h-3 w-3 shrink-0" /> <span className="truncate">Digital download</span></span>
                                            <span className="shrink-0">{product.fileCount} {product.fileCount === 1 ? 'file' : 'files'}</span>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </section>

                    <div className="mt-6 flex flex-col items-center gap-2" aria-live="polite">
                        <p className="text-[11px] font-semibold text-muted-foreground">Showing {products.length} of {total} product{total === 1 ? '' : 's'}</p>
                        {hasMore ? (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore || refreshing}
                                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-full border border-foreground/12 bg-foreground/[0.035] px-5 py-2.5 text-xs font-bold transition hover:border-foreground/25 hover:bg-foreground/[0.06] disabled:cursor-wait disabled:opacity-60"
                            >
                                {loadingMore ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</> : 'Load more products'}
                            </button>
                        ) : null}
                    </div>
                </>
            ) : refreshing ? (
                <section className="mt-10 flex min-h-44 items-center justify-center text-sm text-muted-foreground" aria-live="polite">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading products...
                </section>
            ) : (
                <section className="mt-10 max-w-full rounded-[1.5rem] border border-dashed border-foreground/15 px-5 py-12 text-center sm:mt-12 sm:rounded-[2rem] sm:px-6 sm:py-16">
                    <Search className="mx-auto h-8 w-8 text-foreground/20" />
                    <h2 className="mt-4 break-words text-xl font-bold">No products match this search.</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Try another keyword or category.</p>
                </section>
            )}
        </div>
    );
}
