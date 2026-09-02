'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, CircleHelp, Plus, Search, Star, Trash2 } from 'lucide-react';
import { WikiRichEditor } from '@/components/admin/WikiRichEditor';
import type { WikiFaqContent, WikiFaqEntry } from '@/lib/wiki-faq';

const field = 'mt-1.5 w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30';
const label = 'text-[11px] font-medium text-muted-foreground';
const block = 'rounded-xl border border-foreground/10 bg-foreground/[0.012] p-4';

function uid() {
    return `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WikiFaqEditor({ initial, seoTitle, seoDescription }: { initial: WikiFaqContent; seoTitle?: string | null; seoDescription?: string | null }) {
    const [items, setItems] = useState<WikiFaqEntry[]>(initial.items);
    const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
    const [query, setQuery] = useState('');

    const selected = items.find((item) => item.id === selectedId) ?? null;
    const selectedIndex = selected ? items.findIndex((item) => item.id === selected.id) : -1;
    const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [items]);
    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return items;
        return items.filter((item) => `${item.question} ${item.category} ${item.keywords.join(' ')}`.toLowerCase().includes(needle));
    }, [items, query]);

    function patch(id: string, update: Partial<WikiFaqEntry>) {
        setItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
    }

    function addQuestion() {
        const item: WikiFaqEntry = { id: uid(), question: 'New question', answer: '<p></p>', category: 'General', keywords: [], enabled: true, featured: false };
        setItems((current) => [...current, item]);
        setSelectedId(item.id);
        setQuery('');
    }

    function removeQuestion(id: string) {
        const index = items.findIndex((item) => item.id === id);
        const next = items.filter((item) => item.id !== id);
        setItems(next);
        if (selectedId === id) setSelectedId(next[Math.min(index, Math.max(0, next.length - 1))]?.id ?? null);
    }

    function move(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        setItems((current) => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }

    return (
        <>
            <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_290px]">
                <aside className="space-y-3">
                    <div className={block}>
                        <div className="flex items-center justify-between gap-2">
                            <div><p className="text-sm font-bold">Questions</p><p className="mt-0.5 text-[10px] text-muted-foreground">{items.length} total</p></div>
                            <button type="button" onClick={addQuestion} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-2.5 py-1.5 text-[10px] font-bold text-background"><Plus className="size-3.5" /> Add</button>
                        </div>
                        <label className="mt-3 flex items-center gap-2 rounded-lg border border-foreground/10 bg-background px-2.5 py-2"><Search className="size-3.5 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find question..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
                        <div className="mt-3 max-h-[62vh] space-y-1 overflow-y-auto pr-1">
                            {visible.map((item) => (
                                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${selectedId === item.id ? 'border-sky-400/35 bg-sky-500/[0.09]' : 'border-transparent hover:border-foreground/10 hover:bg-foreground/[0.025]'}`}>
                                    <div className="flex items-start gap-2">
                                        <CircleHelp className={`mt-0.5 size-3.5 shrink-0 ${item.enabled ? 'text-sky-400' : 'text-muted-foreground/50'}`} />
                                        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-semibold leading-5">{item.question || 'Untitled question'}</p><div className="mt-1 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground"><span>{item.category || 'General'}</span>{item.featured ? <Star className="size-2.5 fill-current text-amber-400" /> : null}{!item.enabled ? <span>Hidden</span> : null}</div></div>
                                    </div>
                                </button>
                            ))}
                            {!visible.length ? <p className="py-6 text-center text-xs text-muted-foreground">No matching questions.</p> : null}
                        </div>
                    </div>
                </aside>

                <section className={block}>
                    {selected ? (
                        <div key={selected.id}>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 pb-3">
                                <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">FAQ entry</p><p className="mt-1 text-sm font-bold">Edit question</p></div>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => move(selectedIndex, -1)} disabled={selectedIndex <= 0} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground disabled:opacity-30" title="Move up"><ChevronUp className="size-3.5" /></button>
                                    <button type="button" onClick={() => move(selectedIndex, 1)} disabled={selectedIndex < 0 || selectedIndex >= items.length - 1} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground disabled:opacity-30" title="Move down"><ChevronDown className="size-3.5" /></button>
                                    <button type="button" onClick={() => removeQuestion(selected.id)} className="rounded-lg border border-red-500/20 p-2 text-red-500/70" title="Delete"><Trash2 className="size-3.5" /></button>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                                <label className={label}>Question<textarea value={selected.question} onChange={(event) => patch(selected.id, { question: event.target.value })} className={`${field} min-h-24 resize-y`} /></label>
                                <div className="space-y-3">
                                    <label className={label}>Category<input list="faq-categories" value={selected.category} onChange={(event) => patch(selected.id, { category: event.target.value })} className={field} /><datalist id="faq-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist></label>
                                    <div className="space-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={selected.enabled} onChange={(event) => patch(selected.id, { enabled: event.target.checked })} /> Visible</label><label className="flex items-center gap-2"><input type="checkbox" checked={selected.featured} onChange={(event) => patch(selected.id, { featured: event.target.checked })} /> Featured</label></div>
                                </div>
                            </div>
                            <label className={`${label} mt-3 block`}>Keywords <span className="font-normal opacity-70">comma separated</span><input value={selected.keywords.join(', ')} onChange={(event) => patch(selected.id, { keywords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className={field} placeholder="portfolio, github, projects" /></label>
                            <div className="mt-4"><div className="mb-2"><p className="text-sm font-bold">Answer</p><p className="mt-0.5 text-[10px] text-muted-foreground">Rich text supports headings, links, lists, quote, code and formatting.</p></div><WikiRichEditor key={selected.id} name={`faq-answer-${selected.id}`} initialValue={selected.answer} onChange={(answer) => patch(selected.id, { answer })} minHeight="min-h-[20rem]" /></div>
                        </div>
                    ) : (
                        <div className="flex min-h-[28rem] flex-col items-center justify-center text-center"><CircleHelp className="size-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">No question selected</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Add a question or choose one from the list to edit it.</p><button type="button" onClick={addQuestion} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-3 py-2 text-xs font-semibold"><Plus className="size-3.5" /> Add first question</button></div>
                    )}
                </section>

                <aside className="space-y-3">
                    <details className="rounded-xl border border-foreground/10 bg-foreground/[0.012]" open>
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">FAQ settings</summary>
                        <div className="space-y-3 border-t border-foreground/10 p-4">
                            <div className="space-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={initial.enabled} /> Public FAQ enabled</label><label className="flex items-center gap-2"><input type="checkbox" name="indexable" defaultChecked={initial.indexable} /> Allow search-engine indexing</label><label className="flex items-center gap-2"><input type="checkbox" name="showSearch" defaultChecked={initial.showSearch} /> Show search</label><label className="flex items-center gap-2"><input type="checkbox" name="showCategories" defaultChecked={initial.showCategories} /> Show categories</label><label className="flex items-center gap-2"><input type="checkbox" name="featuredFirst" defaultChecked={initial.featuredFirst} /> Featured questions first</label><label className="flex items-center gap-2"><input type="checkbox" name="defaultExpanded" defaultChecked={initial.defaultExpanded} /> Expand answers by default</label></div>
                            <label className={label}>Eyebrow<input name="eyebrow" defaultValue={initial.eyebrow} className={field} /></label>
                            <label className={label}>Page title<input name="title" defaultValue={initial.title} className={field} /></label>
                            <label className={label}>Subtitle<textarea name="subtitle" defaultValue={initial.subtitle} className={`${field} min-h-24 resize-y`} /></label>
                        </div>
                    </details>
                    <details className="rounded-xl border border-foreground/10 bg-foreground/[0.012]">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">Introduction</summary>
                        <div className="border-t border-foreground/10 p-4"><WikiRichEditor name="introHtml" initialValue={initial.introHtml} minHeight="min-h-36" /></div>
                    </details>
                    <details className="rounded-xl border border-foreground/10 bg-foreground/[0.012]">
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">SEO</summary>
                        <div className="space-y-3 border-t border-foreground/10 p-4"><label className={label}>SEO title<input name="seoTitle" defaultValue={seoTitle || ''} className={field} /></label><label className={label}>Meta description<textarea name="seoDescription" defaultValue={seoDescription || ''} className={`${field} min-h-24 resize-y`} /></label></div>
                    </details>
                    <button type="submit" className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background">Save FAQ</button>
                </aside>
            </div>
        </>
    );
}
