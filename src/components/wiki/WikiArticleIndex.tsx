'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { wikiCategoryLabel, type WikiCategory } from '@/lib/wiki-articles';

export type WikiIndexItem = {
    slug: string;
    title: string;
    summary: string;
    category: WikiCategory;
    featured: boolean;
    updatedAt: string;
};

export function WikiArticleIndex({ items }: { items: WikiIndexItem[] }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<'ALL' | WikiCategory>('ALL');
    const categories = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return items.filter((item) => {
            const categoryMatch = category === 'ALL' || item.category === category;
            const queryMatch = !needle || `${item.title} ${item.summary} ${wikiCategoryLabel(item.category)}`.toLowerCase().includes(needle);
            return categoryMatch && queryMatch;
        });
    }, [items, query, category]);
    const featured = filtered.filter((item) => item.featured);
    const rest = filtered.filter((item) => !item.featured);

    return (
        <>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3.5 py-2.5">
                    <Search className="size-4 text-muted-foreground" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Wiki articles..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
                </label>
                <select value={category} onChange={(event) => setCategory(event.target.value as 'ALL' | WikiCategory)} className="rounded-xl border border-foreground/10 bg-background px-3.5 py-2.5 text-sm outline-none">
                    <option value="ALL">All categories</option>
                    {categories.map((item) => <option key={item} value={item}>{wikiCategoryLabel(item)}</option>)}
                </select>
            </div>

            {featured.length ? (
                <section className="mt-12">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Featured</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {featured.map((item) => <ArticleCard key={item.slug} item={item} featured />)}
                    </div>
                </section>
            ) : null}

            <section className="mt-12">
                <div className="flex items-end justify-between gap-4">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Archive</p><h2 className="mt-2 text-2xl font-black tracking-tight">All articles</h2></div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{filtered.length} article{filtered.length === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
                    {rest.map((item) => (
                        <Link key={item.slug} href={`/wiki/${item.slug}`} className="grid gap-2 py-5 transition hover:bg-foreground/[0.018] sm:grid-cols-[130px_minmax(0,1fr)_120px] sm:items-center sm:px-3">
                            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{wikiCategoryLabel(item.category)}</span>
                            <div><h3 className="font-bold tracking-tight">{item.title}</h3>{item.summary ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.summary}</p> : null}</div>
                            <span className="text-left text-[10px] text-muted-foreground sm:text-right">{new Date(item.updatedAt).toLocaleDateString('en-GB')}</span>
                        </Link>
                    ))}
                    {!rest.length && !featured.length ? <p className="py-12 text-center text-sm text-muted-foreground">No Wiki articles match this search.</p> : null}
                </div>
            </section>
        </>
    );
}

function ArticleCard({ item, featured }: { item: WikiIndexItem; featured?: boolean }) {
    return (
        <Link href={`/wiki/${item.slug}`} className="group rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-5 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-foreground/[0.03]">
            <div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{wikiCategoryLabel(item.category)}</span>{featured ? <span className="rounded-full border border-foreground/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">Featured</span> : null}</div>
            <h3 className="mt-4 text-xl font-black tracking-tight">{item.title}</h3>
            {item.summary ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.summary}</p> : null}
            <div className="mt-5 text-xs font-semibold text-foreground/70 transition group-hover:text-foreground">Open article →</div>
        </Link>
    );
}
