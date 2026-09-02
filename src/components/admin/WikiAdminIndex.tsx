'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FilePlus2, Search, Star } from 'lucide-react';
import { wikiCategoryLabel, type WikiCategory } from '@/lib/wiki-articles';

export type WikiAdminItem = {
    id: string;
    slug: string;
    title: string;
    summary: string;
    category: WikiCategory;
    status: string;
    featured: boolean;
    updatedAt: string;
};

export function WikiAdminIndex({ mainTitle, mainUpdatedAt, items }: { mainTitle: string; mainUpdatedAt: string | null; items: WikiAdminItem[] }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<'ALL' | WikiCategory>('ALL');
    const categories = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return items.filter((item) => (category === 'ALL' || item.category === category) && (!needle || `${item.title} ${item.summary} ${item.slug}`.toLowerCase().includes(needle)));
    }, [items, query, category]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-foreground/10 bg-background px-3 py-2"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Wiki..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
                    <select value={category} onChange={(event) => setCategory(event.target.value as 'ALL' | WikiCategory)} className="rounded-xl border border-foreground/10 bg-background px-3 py-2 text-sm outline-none"><option value="ALL">All categories</option>{categories.map((item) => <option key={item} value={item}>{wikiCategoryLabel(item)}</option>)}</select>
                </div>
                <Link href="/admin/wiki/new" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3.5 py-2 text-xs font-bold text-background"><FilePlus2 className="size-4" /> New article</Link>
            </div>

            <div className="mt-5 divide-y divide-foreground/10 border-y border-foreground/10">
                <Link href="/admin/wiki/main" className="grid gap-2 py-4 transition hover:bg-foreground/[0.02] sm:grid-cols-[115px_minmax(0,1fr)_100px_90px] sm:items-center sm:px-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-foreground"><Star className="size-3.5" /> Main</span>
                    <div><p className="font-semibold">{mainTitle}</p><p className="mt-0.5 text-[11px] text-muted-foreground">/wiki · Personal biography</p></div>
                    <span className="text-[10px] font-medium text-emerald-500">Published</span>
                    <span className="text-[10px] text-muted-foreground sm:text-right">{mainUpdatedAt ? new Date(mainUpdatedAt).toLocaleDateString('en-GB') : 'Default'}</span>
                </Link>
                {filtered.map((item) => (
                    <Link key={item.id} href={`/admin/wiki/${item.id}`} className="grid gap-2 py-4 transition hover:bg-foreground/[0.02] sm:grid-cols-[115px_minmax(0,1fr)_100px_90px] sm:items-center sm:px-3">
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{wikiCategoryLabel(item.category)}</span>
                        <div><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p>{item.featured ? <Star className="size-3.5 fill-current text-amber-400" /> : null}</div><p className="mt-0.5 text-[11px] text-muted-foreground">/wiki/{item.slug}</p></div>
                        <span className={`text-[10px] font-medium ${item.status === 'PUBLISHED' ? 'text-emerald-500' : item.status === 'ARCHIVED' ? 'text-muted-foreground' : 'text-amber-500'}`}>{item.status}</span>
                        <span className="text-[10px] text-muted-foreground sm:text-right">{new Date(item.updatedAt).toLocaleDateString('en-GB')}</span>
                    </Link>
                ))}
                {!filtered.length ? <p className="py-10 text-center text-sm text-muted-foreground">No Wiki articles found.</p> : null}
            </div>
        </div>
    );
}
