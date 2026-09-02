'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Eye, Plus, Trash2 } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import type { PersonalWikiContent, WikiInfoboxRow, WikiRelatedLink, WikiSection, WikiTimelineEntry } from '@/lib/wiki-content';

const field = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${field} min-h-28 resize-y`;
const panel = 'rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 sm:p-6';
const label = 'text-xs font-medium text-muted-foreground';

function uid(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function reorder<T>(items: T[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

function RowActions({ index, length, onMove, onRemove }: { index: number; length: number; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
    return (
        <div className="flex items-center gap-1">
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-25" aria-label="Move up"><ArrowUp className="size-3.5" /></button>
            <button type="button" onClick={() => onMove(1)} disabled={index === length - 1} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-25" aria-label="Move down"><ArrowDown className="size-3.5" /></button>
            <button type="button" onClick={onRemove} className="rounded-lg border border-red-500/15 p-2 text-red-500/70 transition hover:bg-red-500/10 hover:text-red-500" aria-label="Remove"><Trash2 className="size-3.5" /></button>
        </div>
    );
}

function EnabledToggle({ checked, onChange, labelText = 'Visible' }: { checked: boolean; onChange: (value: boolean) => void; labelText?: string }) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            {labelText}
        </label>
    );
}

export function PersonalWikiEditor({ initial }: { initial: PersonalWikiContent }) {
    const [portrait, setPortrait] = useState(initial.portrait);
    const [aliasesText, setAliasesText] = useState(initial.aliases.join('\n'));
    const [facts, setFacts] = useState<WikiInfoboxRow[]>(initial.infoboxRows);
    const [sections, setSections] = useState<WikiSection[]>(initial.sections);
    const [timeline, setTimeline] = useState<WikiTimelineEntry[]>(initial.timeline);
    const [related, setRelated] = useState<WikiRelatedLink[]>(initial.relatedLinks);

    const aliases = useMemo(() => aliasesText.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 12), [aliasesText]);

    return (
        <>
            <input type="hidden" name="portrait" value={portrait} readOnly />
            <input type="hidden" name="aliasesJson" value={JSON.stringify(aliases)} readOnly />
            <input type="hidden" name="infoboxRowsJson" value={JSON.stringify(facts)} readOnly />
            <input type="hidden" name="sectionsJson" value={JSON.stringify(sections)} readOnly />
            <input type="hidden" name="timelineJson" value={JSON.stringify(timeline)} readOnly />
            <input type="hidden" name="relatedLinksJson" value={JSON.stringify(related)} readOnly />

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Page identity</p>
                        <h3 className="mt-1 text-xl font-bold">Personal Wiki</h3>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">The public page lives at <code>/wiki</code>. It uses a dedicated article/infobox layout rather than the generic Pages renderer.</p>
                    </div>
                    <Link href="/wiki" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"><Eye className="size-4" /> Preview</Link>
                </div>

                <div className="mt-6 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={initial.enabled} /> Public page enabled</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showInNavigation" defaultChecked={initial.showInNavigation} /> Show Wiki in public navigation</label>
                    <label className={label}>Eyebrow<input name="eyebrow" defaultValue={initial.eyebrow} className={field} /></label>
                    <label className={label}>Page title<input name="title" defaultValue={initial.title} className={field} /></label>
                    <label className={`${label} md:col-span-2`}>Subtitle<input name="subtitle" defaultValue={initial.subtitle} className={field} /></label>
                    <label className={`${label} md:col-span-2`}>Introduction<textarea name="lead" defaultValue={initial.lead} className={`${area} min-h-36`} /></label>
                </div>
            </section>

            <section className={panel}>
                <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
                    <div>
                        <MediaPicker value={portrait} onChange={setPortrait} label="Wiki portrait / profile image" initialKind="image" lockKind />
                        <p className="mt-2 text-[11px] text-muted-foreground">If empty, the page falls back to the public profile image and then the Dr Necrotix mark.</p>
                    </div>
                    <div className="space-y-5">
                        <label className={label}>Image caption<input name="portraitCaption" defaultValue={initial.portraitCaption} className={field} /></label>
                        <label className={label}>Aliases - one per line<textarea value={aliasesText} onChange={(event) => setAliasesText(event.target.value)} className={area} /></label>
                    </div>
                </div>
            </section>

            <section className={panel}>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Display</p>
                <h3 className="mt-1 text-lg font-bold">Wiki modules</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="rounded-xl border border-foreground/10 p-3 text-sm"><input type="checkbox" name="showContents" defaultChecked={initial.showContents} className="mr-2" />Contents / TOC</label>
                    <label className="rounded-xl border border-foreground/10 p-3 text-sm"><input type="checkbox" name="showInfobox" defaultChecked={initial.showInfobox} className="mr-2" />Infobox</label>
                    <label className="rounded-xl border border-foreground/10 p-3 text-sm"><input type="checkbox" name="showTimeline" defaultChecked={initial.showTimeline} className="mr-2" />Chronology</label>
                    <label className="rounded-xl border border-foreground/10 p-3 text-sm"><input type="checkbox" name="showRelatedLinks" defaultChecked={initial.showRelatedLinks} className="mr-2" />Related pages</label>
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Infobox</p><h3 className="mt-1 text-lg font-bold">Quick facts</h3></div>
                    <button type="button" onClick={() => setFacts((items) => [...items, { id: uid('fact'), label: '', value: '', href: '', enabled: true }])} className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold"><Plus className="size-4" /> Add fact</button>
                </div>
                <label className={`${label} mt-5 block max-w-md`}>Infobox heading<input name="infoboxTitle" defaultValue={initial.infoboxTitle} className={field} /></label>
                <div className="mt-5 space-y-3">
                    {facts.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-foreground/10 bg-background/40 p-4">
                            <div className="flex items-center justify-between gap-3"><EnabledToggle checked={item.enabled} onChange={(enabled) => setFacts((items) => items.map((entry, i) => i === index ? { ...entry, enabled } : entry))} /><RowActions index={index} length={facts.length} onMove={(direction) => setFacts((items) => reorder(items, index, direction))} onRemove={() => setFacts((items) => items.filter((_, i) => i !== index))} /></div>
                            <div className="mt-3 grid gap-3 md:grid-cols-[.7fr_1.2fr_1fr]">
                                <label className={label}>Label<input value={item.label} onChange={(event) => setFacts((items) => items.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry))} className={field} /></label>
                                <label className={label}>Value<input value={item.value} onChange={(event) => setFacts((items) => items.map((entry, i) => i === index ? { ...entry, value: event.target.value } : entry))} className={field} /></label>
                                <label className={label}>Optional link<input value={item.href} onChange={(event) => setFacts((items) => items.map((entry, i) => i === index ? { ...entry, href: event.target.value } : entry))} className={field} placeholder="/lab or https://..." /></label>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Article</p><h3 className="mt-1 text-lg font-bold">Wiki sections</h3></div>
                    <button type="button" onClick={() => setSections((items) => [...items, { id: uid('section'), title: 'New section', body: '', enabled: true }])} className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold"><Plus className="size-4" /> Add section</button>
                </div>
                <div className="mt-5 space-y-3">
                    {sections.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-foreground/10 bg-background/40 p-4">
                            <div className="flex items-center justify-between gap-3"><EnabledToggle checked={item.enabled} onChange={(enabled) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, enabled } : entry))} /><RowActions index={index} length={sections.length} onMove={(direction) => setSections((items) => reorder(items, index, direction))} onRemove={() => setSections((items) => items.filter((_, i) => i !== index))} /></div>
                            <label className={`${label} mt-3 block`}>Heading<input value={item.title} onChange={(event) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} className={field} /></label>
                            <label className={`${label} mt-3 block`}>Article text<textarea value={item.body} onChange={(event) => setSections((items) => items.map((entry, i) => i === index ? { ...entry, body: event.target.value } : entry))} className={`${area} min-h-40`} /><span className="mt-1 block text-[10px] text-muted-foreground">Separate paragraphs with a blank line.</span></label>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Chronology</p><h3 className="mt-1 text-lg font-bold">Timeline entries</h3></div>
                    <button type="button" onClick={() => setTimeline((items) => [...items, { id: uid('timeline'), period: '', title: '', body: '', href: '', enabled: true }])} className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold"><Plus className="size-4" /> Add entry</button>
                </div>
                <label className={`${label} mt-5 block max-w-md`}>Section heading<input name="timelineTitle" defaultValue={initial.timelineTitle} className={field} /></label>
                <div className="mt-5 space-y-3">
                    {timeline.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-foreground/10 bg-background/40 p-4">
                            <div className="flex items-center justify-between gap-3"><EnabledToggle checked={item.enabled} onChange={(enabled) => setTimeline((items) => items.map((entry, i) => i === index ? { ...entry, enabled } : entry))} /><RowActions index={index} length={timeline.length} onMove={(direction) => setTimeline((items) => reorder(items, index, direction))} onRemove={() => setTimeline((items) => items.filter((_, i) => i !== index))} /></div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[.5fr_1fr]">
                                <label className={label}>Period / label<input value={item.period} onChange={(event) => setTimeline((items) => items.map((entry, i) => i === index ? { ...entry, period: event.target.value } : entry))} className={field} placeholder="2026 or Journey" /></label>
                                <label className={label}>Title<input value={item.title} onChange={(event) => setTimeline((items) => items.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} className={field} /></label>
                            </div>
                            <label className={`${label} mt-3 block`}>Description<textarea value={item.body} onChange={(event) => setTimeline((items) => items.map((entry, i) => i === index ? { ...entry, body: event.target.value } : entry))} className={area} /></label>
                            <label className={`${label} mt-3 block`}>Optional link<input value={item.href} onChange={(event) => setTimeline((items) => items.map((entry, i) => i === index ? { ...entry, href: event.target.value } : entry))} className={field} placeholder="/journey or https://..." /></label>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Index links</p><h3 className="mt-1 text-lg font-bold">Related pages</h3></div>
                    <button type="button" onClick={() => setRelated((items) => [...items, { id: uid('link'), label: '', href: '', note: '', enabled: true }])} className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold"><Plus className="size-4" /> Add link</button>
                </div>
                <label className={`${label} mt-5 block max-w-md`}>Section heading<input name="relatedTitle" defaultValue={initial.relatedTitle} className={field} /></label>
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {related.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-foreground/10 bg-background/40 p-4">
                            <div className="flex items-center justify-between gap-3"><EnabledToggle checked={item.enabled} onChange={(enabled) => setRelated((items) => items.map((entry, i) => i === index ? { ...entry, enabled } : entry))} /><RowActions index={index} length={related.length} onMove={(direction) => setRelated((items) => reorder(items, index, direction))} onRemove={() => setRelated((items) => items.filter((_, i) => i !== index))} /></div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className={label}>Label<input value={item.label} onChange={(event) => setRelated((items) => items.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry))} className={field} /></label>
                                <label className={label}>URL<input value={item.href} onChange={(event) => setRelated((items) => items.map((entry, i) => i === index ? { ...entry, href: event.target.value } : entry))} className={field} /></label>
                            </div>
                            <label className={`${label} mt-3 block`}>Note<input value={item.note} onChange={(event) => setRelated((items) => items.map((entry, i) => i === index ? { ...entry, note: event.target.value } : entry))} className={field} /></label>
                        </div>
                    ))}
                </div>
            </section>

            <section className={panel}>
                <label className={label}>Footer note<textarea name="footerNote" defaultValue={initial.footerNote} className={area} /></label>
            </section>

            <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5">
                <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground"><BookOpen className="size-4" /> Content is stored in the CMS, not hard-coded into the public page.</div>
                <button className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background sm:w-auto">Save Personal Wiki</button>
            </div>
        </>
    );
}
