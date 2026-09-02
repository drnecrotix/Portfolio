'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, HelpCircle, LibraryBig, Search, Star } from 'lucide-react';
import type { WikiFaqContent } from '@/lib/wiki-faq';

function plain(value: string) {
    return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

const navBase = 'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition';

export function WikiFaqPage({ content }: { content: WikiFaqContent }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All');
    const enabled = useMemo(() => content.items.filter((item) => item.enabled), [content.items]);
    const categories = useMemo(() => ['All', ...new Set(enabled.map((item) => item.category).filter(Boolean))], [enabled]);
    const ordered = useMemo(() => content.featuredFirst ? [...enabled].sort((a, b) => Number(b.featured) - Number(a.featured)) : enabled, [content.featuredFirst, enabled]);
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return ordered.filter((item) => {
            const categoryMatch = category === 'All' || item.category === category;
            const searchMatch = !needle || `${item.question} ${item.category} ${item.keywords.join(' ')} ${plain(item.answer)}`.toLowerCase().includes(needle);
            return categoryMatch && searchMatch;
        });
    }, [ordered, query, category]);

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <header className="mx-auto max-w-6xl px-5 sm:px-8">
                <div className="border-b border-foreground/10 pb-10 sm:pb-12">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground"><HelpCircle className="size-4 text-sky-400" /> {content.eyebrow}</div>
                        <div className="grid grid-cols-3 gap-2 sm:flex">
                            <Link href="/wiki" className={`${navBase} border-foreground/10 bg-foreground/[0.025] text-muted-foreground hover:border-sky-400/25 hover:bg-sky-500/[0.06] hover:text-foreground`}><BookOpen className="size-3.5" /> <span className="hidden sm:inline">Main article</span><span className="sm:hidden">Main</span></Link>
                            <Link href="/wiki/articles" className={`${navBase} border-foreground/10 bg-foreground/[0.025] text-muted-foreground hover:border-sky-400/25 hover:bg-sky-500/[0.06] hover:text-foreground`}><LibraryBig className="size-3.5" /> <span className="hidden sm:inline">All articles</span><span className="sm:hidden">Articles</span></Link>
                            <Link href="/wiki/faq" aria-current="page" className={`${navBase} border-sky-400/35 bg-sky-500/[0.1] text-sky-500 dark:text-sky-300`}><HelpCircle className="size-3.5" /> FAQ</Link>
                        </div>
                    </div>
                    <h1 className="mt-7 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-6xl lg:text-7xl">{content.title}</h1>
                    <p className="mt-5 max-w-3xl text-base leading-7 text-foreground/68 sm:text-lg">{content.subtitle}</p>
                    {content.introHtml ? <div className="prose prose-sm mt-5 max-w-3xl prose-p:text-muted-foreground prose-a:text-sky-400 dark:prose-invert" dangerouslySetInnerHTML={{ __html: content.introHtml }} /> : null}
                </div>
            </header>

            <div className="mx-auto mt-8 max-w-6xl px-5 sm:px-8">
                {(content.showSearch || (content.showCategories && categories.length > 2)) ? (
                    <div className="sticky top-20 z-10 rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-sm backdrop-blur-xl">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {content.showSearch ? <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.018] px-3 py-2.5"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FAQ..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label> : null}
                            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{filtered.length} of {enabled.length}</div>
                        </div>
                        {content.showCategories && categories.length > 2 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${category === item ? 'border-sky-400/35 bg-sky-500/[0.1] text-sky-500 dark:text-sky-300' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div> : null}
                    </div>
                ) : null}

                <section className="mt-7">
                    <div className="divide-y divide-foreground/10 border-y border-foreground/10">
                        {filtered.map((item, index) => (
                            <details key={item.id} id={item.id} open={content.defaultExpanded || undefined} className="group scroll-mt-32 py-1">
                                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl px-2 py-5 transition hover:bg-foreground/[0.02] [&::-webkit-details-marker]:hidden">
                                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.02] font-mono text-[9px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold tracking-tight sm:text-lg">{item.question}</h2>{item.featured ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-amber-500"><Star className="size-2.5 fill-current" /> Featured</span> : null}</div><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{item.category}</p></div>
                                    <span className="mt-1 text-lg text-muted-foreground transition group-open:rotate-45">+</span>
                                </summary>
                                <div className="ml-0 border-t border-foreground/10 px-2 pb-7 pt-5 sm:ml-10 sm:px-3"><div className="prose max-w-none prose-headings:font-black prose-p:leading-7 prose-p:text-foreground/76 prose-a:text-sky-400 prose-a:underline-offset-4 prose-strong:text-foreground prose-li:text-foreground/75 dark:prose-invert" dangerouslySetInnerHTML={{ __html: item.answer }} />{item.keywords.length ? <div className="mt-5 flex flex-wrap gap-1.5">{item.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-foreground/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{keyword}</span>)}</div> : null}</div>
                            </details>
                        ))}
                    </div>
                    {!filtered.length ? <div className="py-16 text-center"><HelpCircle className="mx-auto size-8 text-muted-foreground/35" /><p className="mt-3 text-sm font-bold">No matching questions</p><p className="mt-1 text-xs text-muted-foreground">Try another search term or category.</p></div> : null}
                </section>
            </div>
        </main>
    );
}
