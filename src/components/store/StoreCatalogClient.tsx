'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download, Search, Sparkles } from 'lucide-react';

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

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export function StoreCatalogClient({ products, categories }: { products: StoreCatalogProduct[]; categories: string[] }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState<'featured' | 'newest' | 'price-low' | 'price-high'>('featured');

    const categoryCounts = useMemo(() => {
        return products.reduce<Record<string, number>>((counts, product) => {
            if (product.category) counts[product.category] = (counts[product.category] || 0) + 1;
            return counts;
        }, {});
    }, [products]);

    const visibleProducts = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const filtered = products.filter((product) => {
            const matchesCategory = category === 'All' || product.category === category;
            const haystack = `${product.title} ${product.excerpt || ''} ${product.description} ${product.category || ''}`.toLowerCase();
            return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
        });
        return [...filtered].sort((a, b) => {
            if (sort === 'price-low') return a.priceCents - b.priceCents || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            if (sort === 'price-high') return b.priceCents - a.priceCents || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            if (sort === 'featured') return Number(b.featured) - Number(a.featured) || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            return Date.parse(b.createdAt) - Date.parse(a.createdAt);
        });
    }, [category, products, query, sort]);

    return (
        <div className="min-w-0 max-w-full overflow-x-clip">
            <section className="mt-12 min-w-0 max-w-full sm:mt-14">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">Catalog</p>
                        <h2 className="mt-2 break-words text-2xl font-black tracking-[-0.035em] sm:text-3xl">Browse the collection</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A focused catalog of digital releases without countdowns, popups or artificial urgency.</p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-muted-foreground">{visibleProducts.length} of {products.length} shown</p>
                </div>

                <div className="mt-6 rounded-[1.35rem] border border-foreground/10 bg-foreground/[0.018] p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.08)] sm:rounded-[1.7rem] sm:p-3">
                    <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:items-center">
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Search the Store</span>
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search art, resources, templates..."
                                className="h-12 min-w-0 w-full max-w-full rounded-2xl border border-foreground/10 bg-background pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-foreground/25"
                            />
                        </label>
                        <label className="min-w-0 w-full shrink-0 lg:w-auto">
                            <span className="sr-only">Sort products</span>
                            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-12 min-w-0 w-full max-w-full rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-semibold outline-none lg:min-w-44 lg:w-auto">
                                <option value="featured">Featured first</option>
                                <option value="newest">Newest</option>
                                <option value="price-low">Price: low to high</option>
                                <option value="price-high">Price: high to low</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-2.5 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
                        {['All', ...categories].map((item) => {
                            const count = item === 'All' ? products.length : categoryCounts[item] || 0;
                            const active = category === item;
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setCategory(item)}
                                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground'}`}
                                >
                                    <span>{item}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-background/15 text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {visibleProducts.length ? (
                <section className="mt-7 grid min-w-0 max-w-full grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Digital products">
                    {visibleProducts.map((product, index) => {
                        const free = product.priceCents === 0;
                        const spotlight = product.featured && index === 0 && visibleProducts.length >= 3;
                        return (
                            <article key={product.id} className={`group min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-foreground/8 bg-foreground/[0.012] p-2 transition duration-300 hover:border-foreground/15 hover:bg-foreground/[0.022] sm:rounded-[1.6rem] ${spotlight ? 'sm:col-span-2 lg:col-span-2' : ''}`}>
                                <Link href={`/store/${product.slug}`} className="block min-w-0 max-w-full">
                                    <div className={`relative w-full max-w-full overflow-hidden rounded-[1rem] border border-foreground/8 bg-foreground/[0.035] shadow-[0_14px_40px_rgba(0,0,0,0.10)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_60px_rgba(0,0,0,0.16)] sm:rounded-[1.25rem] ${spotlight ? 'aspect-[16/9]' : 'aspect-square'}`}>
                                        {product.coverImageUrl ? (
                                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.03]" style={{ backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` }} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.07),transparent_40%)]">
                                                <Download className="h-10 w-10 text-foreground/15" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 to-transparent opacity-80" />
                                        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                                            {product.featured ? <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md"><Sparkles className="h-3 w-3" /> Featured</span> : null}
                                            {free ? <span className="rounded-full border border-white/15 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">Free</span> : null}
                                        </div>
                                        <span className="absolute bottom-3 right-3 hidden h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"><ArrowUpRight className="h-4 w-4" /></span>
                                    </div>
                                </Link>

                                <div className="min-w-0 px-2 pb-2 pt-4 sm:px-2.5">
                                    <div className="flex min-w-0 items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            {product.category ? <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{product.category}</p> : <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Digital product</p>}
                                            <Link href={`/store/${product.slug}`} className={`mt-1.5 block min-w-0 break-words line-clamp-2 font-bold leading-tight tracking-[-0.02em] transition hover:underline ${spotlight ? 'text-lg sm:text-xl' : 'text-[15px]'}`}>{product.title}</Link>
                                        </div>
                                        <div className="min-w-0 shrink-0 text-right">
                                            {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-[11px] text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                            <p className="text-sm font-black">{free ? 'Free' : money(product.priceCents, product.currency)}</p>
                                        </div>
                                    </div>
                                    <p className={`mt-2 break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere] ${spotlight ? 'line-clamp-3 max-w-2xl' : 'line-clamp-2'}`}>{product.excerpt || product.description}</p>
                                    <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-foreground/8 pt-3 text-[11px] text-muted-foreground">
                                        <span className="inline-flex min-w-0 items-center gap-1.5"><Download className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Instant digital delivery</span></span>
                                        <span className="shrink-0">{product.fileCount} {product.fileCount === 1 ? 'file' : 'files'}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
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
