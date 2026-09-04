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
        <>
            <section className="mt-10 rounded-[2rem] border border-foreground/10 bg-foreground/[0.018] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Search the Store</span>
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search digital art, resources, templates..."
                            className="h-12 w-full rounded-2xl border border-foreground/10 bg-background pl-11 pr-4 text-sm outline-none transition focus:border-foreground/25"
                        />
                    </label>
                    <label className="shrink-0">
                        <span className="sr-only">Sort products</span>
                        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-12 min-w-44 rounded-2xl border border-foreground/10 bg-background px-4 text-sm font-semibold outline-none">
                            <option value="featured">Featured first</option>
                            <option value="newest">Newest</option>
                            <option value="price-low">Price: low to high</option>
                            <option value="price-high">Price: high to low</option>
                        </select>
                    </label>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {['All', ...categories].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setCategory(item)}
                            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${category === item ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground'}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </section>

            {visibleProducts.length ? (
                <section className="mt-9 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Digital products">
                    {visibleProducts.map((product) => {
                        const free = product.priceCents === 0;
                        return (
                            <article key={product.id} className="group min-w-0">
                                <Link href={`/store/${product.slug}`} className="block">
                                    <div className="relative aspect-square overflow-hidden rounded-[1.45rem] border border-foreground/10 bg-foreground/[0.035] shadow-[0_14px_40px_rgba(0,0,0,0.10)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_60px_rgba(0,0,0,0.18)]">
                                        {product.coverImageUrl ? (
                                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.035]" style={{ backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` }} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.07),transparent_40%)]">
                                                <Download className="h-10 w-10 text-foreground/15" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent opacity-70" />
                                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                            {product.featured ? <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md"><Sparkles className="h-3 w-3" /> Featured</span> : null}
                                            {free ? <span className="rounded-full border border-white/15 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black">Free</span> : null}
                                        </div>
                                        <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
                                    </div>
                                </Link>

                                <div className="px-1 pt-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            {product.category ? <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{product.category}</p> : <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Digital product</p>}
                                            <Link href={`/store/${product.slug}`} className="mt-1.5 block line-clamp-2 text-[15px] font-bold leading-5 tracking-tight transition hover:underline">{product.title}</Link>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-[11px] text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                            <p className="text-sm font-black">{free ? 'Free' : money(product.priceCents, product.currency)}</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{product.excerpt || product.description}</p>
                                    <div className="mt-3 flex items-center justify-between border-t border-foreground/8 pt-3 text-[11px] text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Instant download</span>
                                        <span>{product.fileCount} {product.fileCount === 1 ? 'file' : 'files'}</span>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="mt-12 rounded-[2rem] border border-dashed border-foreground/15 px-6 py-16 text-center">
                    <Search className="mx-auto h-8 w-8 text-foreground/20" />
                    <h2 className="mt-4 text-xl font-bold">No products match this search.</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Try another keyword or category.</p>
                </section>
            )}
        </>
    );
}
