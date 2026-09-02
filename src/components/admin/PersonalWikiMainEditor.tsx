'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { WikiRichEditor } from '@/components/admin/WikiRichEditor';
import type { PersonalWikiContent, WikiInfoboxRow, WikiRelatedLink, WikiSection, WikiTimelineEntry } from '@/lib/wiki-content';

const field = 'mt-1.5 w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30';
const label = 'text-[11px] font-medium text-muted-foreground';
const block = 'rounded-xl border border-foreground/10 bg-foreground/[0.012]';
const summary = 'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden';

function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function reorder<T>(items: T[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

function RowActions({ index, length, onMove, onRemove }: { index: number; length: number; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
    return <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-md border border-foreground/10 p-1.5 text-muted-foreground disabled:opacity-25"><ArrowUp className="size-3" /></button>
        <button type="button" disabled={index === length - 1} onClick={() => onMove(1)} className="rounded-md border border-foreground/10 p-1.5 text-muted-foreground disabled:opacity-25"><ArrowDown className="size-3" /></button>
        <button type="button" onClick={onRemove} className="rounded-md border border-red-500/15 p-1.5 text-red-500/70"><Trash2 className="size-3" /></button>
    </div>;
}

export function PersonalWikiMainEditor({ initial }: { initial: PersonalWikiContent }) {
    const [portrait, setPortrait] = useState(initial.portrait);
    const [aliasesText, setAliasesText] = useState(initial.aliases.join('\n'));
    const [facts, setFacts] = useState<WikiInfoboxRow[]>(initial.infoboxRows);
    const [sections, setSections] = useState<WikiSection[]>(initial.sections);
    const [timeline, setTimeline] = useState<WikiTimelineEntry[]>(initial.timeline);
    const [related, setRelated] = useState<WikiRelatedLink[]>(initial.relatedLinks);
    const aliases = useMemo(() => aliasesText.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 12), [aliasesText]);

    return <>
        <input type="hidden" name="portrait" value={portrait} readOnly />
        <input type="hidden" name="aliasesJson" value={JSON.stringify(aliases)} readOnly />
        <input type="hidden" name="infoboxRowsJson" value={JSON.stringify(facts)} readOnly />
        <input type="hidden" name="sectionsJson" value={JSON.stringify(sections)} readOnly />
        <input type="hidden" name="timelineJson" value={JSON.stringify(timeline)} readOnly />
        <input type="hidden" name="relatedLinksJson" value={JSON.stringify(related)} readOnly />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
                <section className={`${block} p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Main article</p><h3 className="mt-1 text-lg font-bold">Biography identity</h3></div>
                        <Link href="/wiki" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-xs text-muted-foreground"><Eye className="size-3.5" /> Preview</Link>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="enabled" defaultChecked={initial.enabled} /> Public page enabled</label>
                        <div />
                        <label className={label}>Eyebrow<input name="eyebrow" defaultValue={initial.eyebrow} className={field} /></label>
                        <label className={label}>Title<input name="title" defaultValue={initial.title} className={field} /></label>
                        <label className={`${label} sm:col-span-2`}>Subtitle<input name="subtitle" defaultValue={initial.subtitle} className={field} /></label>
                    </div>
                    <div className="mt-4"><p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Introduction</p><WikiRichEditor name="lead" initialValue={initial.lead} minHeight="min-h-40" /></div>
                </section>

                <details className={block} open>
                    <summary className={summary}><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Article</p><span className="text-sm font-bold">Sections ({sections.length})</span></div><button type="button" onClick={(event) => { event.preventDefault(); setSections((items) => [...items, { id: uid('section'), title: 'New section', body: '<p></p>', enabled: true }]); }} className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px] font-semibold"><Plus className="size-3" /> Add</button></summary>
                    <div className="space-y-2 border-t border-foreground/10 p-3">
                        {sections.map((item, index) => <details key={item.id} className="rounded-lg border border-foreground/10 bg-background/40">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                                <div className="min-w-0"><div className="flex items-center gap-2"><input type="checkbox" checked={item.enabled} onClick={(event) => event.stopPropagation()} onChange={(event) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, enabled: event.target.checked } : entry))} /><span className="truncate text-xs font-semibold">{item.title || 'Untitled section'}</span></div></div>
                                <RowActions index={index} length={sections.length} onMove={(direction) => setSections((items) => reorder(items, index, direction))} onRemove={() => setSections((items) => items.filter((_, i) => i !== index))} />
                            </summary>
                            <div className="border-t border-foreground/10 p-3">
                                <label className={label}>Section heading<input value={item.title} onChange={(event) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} className={field} /></label>
                                <div className="mt-3"><WikiRichEditor name={`section-${item.id}`} initialValue={item.body} onChange={(body) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, body } : entry))} minHeight="min-h-36" /></div>
                            </div>
                        </details>)}
                    </div>
                </details>

                <details className={block}>
                    <summary className={summary}><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Infobox</p><span className="text-sm font-bold">Quick facts ({facts.length})</span></div><span className="text-[10px] text-muted-foreground">Edit</span></summary>
                    <div className="border-t border-foreground/10 p-4">
                        <label className={label}>Infobox heading<input name="infoboxTitle" defaultValue={initial.infoboxTitle} className={field} /></label>
                        <div className="mt-3 space-y-2">{facts.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg border border-foreground/10 p-3 sm:grid-cols-[.7fr_1fr_1fr_auto] sm:items-end"><label className={label}>Label<input value={item.label} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} className={field} /></label><label className={label}>Value<input value={item.value} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, value: e.target.value } : x))} className={field} /></label><label className={label}>Link<input value={item.href} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, href: e.target.value } : x))} className={field} /></label><div className="flex items-center gap-2 pb-1"><input type="checkbox" checked={item.enabled} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, enabled: e.target.checked } : x))} /><button type="button" onClick={() => setFacts((items) => items.filter((_, i) => i !== index))} className="text-red-500/70"><Trash2 className="size-3.5" /></button></div></div>)}</div>
                        <button type="button" onClick={() => setFacts((items) => [...items, { id: uid('fact'), label: '', value: '', href: '', enabled: true }])} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add fact</button>
                    </div>
                </details>

                <details className={block}>
                    <summary className={summary}><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Chronology</p><span className="text-sm font-bold">Timeline ({timeline.length})</span></div><span className="text-[10px] text-muted-foreground">Edit</span></summary>
                    <div className="border-t border-foreground/10 p-4"><label className={label}>Heading<input name="timelineTitle" defaultValue={initial.timelineTitle} className={field} /></label><div className="mt-3 space-y-2">{timeline.map((item, index) => <div key={item.id} className="rounded-lg border border-foreground/10 p-3"><div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]"><input value={item.period} onChange={(e) => setTimeline((items) => items.map((x, i) => i === index ? { ...x, period: e.target.value } : x))} className={field} placeholder="Period" /><input value={item.title} onChange={(e) => setTimeline((items) => items.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} className={field} placeholder="Title" /><button type="button" onClick={() => setTimeline((items) => items.filter((_, i) => i !== index))} className="self-end rounded-md border border-red-500/15 p-2 text-red-500/70"><Trash2 className="size-3.5" /></button></div><textarea value={item.body} onChange={(e) => setTimeline((items) => items.map((x, i) => i === index ? { ...x, body: e.target.value } : x))} className={`${field} min-h-16 resize-y`} placeholder="Description" /><input value={item.href} onChange={(e) => setTimeline((items) => items.map((x, i) => i === index ? { ...x, href: e.target.value } : x))} className={field} placeholder="Optional link" /></div>)}</div><button type="button" onClick={() => setTimeline((items) => [...items, { id: uid('timeline'), period: '', title: '', body: '', href: '', enabled: true }])} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add entry</button></div>
                </details>

                <details className={block}>
                    <summary className={summary}><div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Index links</p><span className="text-sm font-bold">Related pages ({related.length})</span></div><span className="text-[10px] text-muted-foreground">Edit</span></summary>
                    <div className="border-t border-foreground/10 p-4"><label className={label}>Heading<input name="relatedTitle" defaultValue={initial.relatedTitle} className={field} /></label><div className="mt-3 space-y-2">{related.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg border border-foreground/10 p-3 sm:grid-cols-[.8fr_1fr_1.4fr_auto] sm:items-end"><input value={item.label} onChange={(e) => setRelated((items) => items.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} className={field} placeholder="Label" /><input value={item.href} onChange={(e) => setRelated((items) => items.map((x, i) => i === index ? { ...x, href: e.target.value } : x))} className={field} placeholder="Link" /><input value={item.note} onChange={(e) => setRelated((items) => items.map((x, i) => i === index ? { ...x, note: e.target.value } : x))} className={field} placeholder="Note" /><button type="button" onClick={() => setRelated((items) => items.filter((_, i) => i !== index))} className="rounded-md border border-red-500/15 p-2 text-red-500/70"><Trash2 className="size-3.5" /></button></div>)}</div><button type="button" onClick={() => setRelated((items) => [...items, { id: uid('link'), label: '', href: '', note: '', enabled: true }])} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add link</button></div>
                </details>
            </div>

            <aside className="space-y-4">
                <section className={`${block} p-4`}><p className="text-xs font-bold">Display</p><div className="mt-3 grid gap-2 text-xs"><label><input type="checkbox" name="showContents" defaultChecked={initial.showContents} className="mr-2" />Contents</label><label><input type="checkbox" name="showInfobox" defaultChecked={initial.showInfobox} className="mr-2" />Infobox</label><label><input type="checkbox" name="showTimeline" defaultChecked={initial.showTimeline} className="mr-2" />Chronology</label><label><input type="checkbox" name="showRelatedLinks" defaultChecked={initial.showRelatedLinks} className="mr-2" />Related pages</label></div></section>
                <section className={`${block} p-4`}><MediaPicker value={portrait} onChange={setPortrait} label="Portrait" initialKind="image" lockKind /><label className={`${label} mt-3 block`}>Caption<input name="portraitCaption" defaultValue={initial.portraitCaption} className={field} /></label></section>
                <section className={`${block} p-4`}><label className={label}>Aliases - one per line<textarea value={aliasesText} onChange={(event) => setAliasesText(event.target.value)} className={`${field} min-h-28 resize-y`} /></label></section>
                <section className={`${block} p-4`}><label className={label}>Footer note<textarea name="footerNote" defaultValue={initial.footerNote} className={`${field} min-h-24 resize-y`} /></label></section>
            </aside>
        </div>
        <div className="sticky bottom-4 z-20 mt-5 flex justify-end"><button type="submit" className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-xl">Save main article</button></div>
    </>;
}
