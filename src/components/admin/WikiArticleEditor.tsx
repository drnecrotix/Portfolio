'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleHelp, Plus, Trash2 } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { WikiRichEditor } from '@/components/admin/WikiRichEditor';
import { WIKI_CATEGORIES, wikiCategoryLabel, type WikiArticleContent, type WikiFact, type WikiFaqItem } from '@/lib/wiki-articles';

const field = 'mt-1.5 w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30';
const label = 'text-[11px] font-medium text-muted-foreground';
const block = 'rounded-xl border border-foreground/10 bg-foreground/[0.012] p-4';

function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function slugify(value: string) { return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100); }

export type WikiArticleOption = { slug: string; title: string };

export function WikiArticleEditor({
    articleId,
    initialTitle,
    initialStatus,
    initial,
    seoTitle,
    seoDescription,
    articleOptions,
}: {
    articleId?: string;
    initialTitle: string;
    initialStatus: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
    initial: WikiArticleContent;
    seoTitle?: string | null;
    seoDescription?: string | null;
    articleOptions: WikiArticleOption[];
}) {
    const [title, setTitle] = useState(initialTitle);
    const [slug, setSlug] = useState(initial.slug);
    const [slugTouched, setSlugTouched] = useState(Boolean(articleId));
    const [category, setCategory] = useState(initial.category);
    const [image, setImage] = useState(initial.image);
    const [facts, setFacts] = useState<WikiFact[]>(initial.infoboxRows);
    const [faq, setFaq] = useState<WikiFaqItem[]>(initial.faqItems);
    const [related, setRelated] = useState<string[]>(initial.relatedSlugs);
    const categoryOptions = articleId ? WIKI_CATEGORIES : WIKI_CATEGORIES.filter((item) => item !== 'FAQ');

    return <>
        {articleId ? <input type="hidden" name="articleId" value={articleId} /> : null}
        <input type="hidden" name="image" value={image} />
        <input type="hidden" name="infoboxRowsJson" value={JSON.stringify(facts)} />
        <input type="hidden" name="faqItemsJson" value={JSON.stringify(faq)} />
        <input type="hidden" name="relatedSlugsJson" value={JSON.stringify(related)} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
                {!articleId ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-500/[0.045] px-4 py-3 text-xs text-muted-foreground"><div className="flex items-center gap-2"><CircleHelp className="size-4 text-sky-500" /><span>Creating questions? FAQ now has a dedicated editor, search, categories and structured data.</span></div><Link href="/admin/wiki/faq" className="font-semibold text-sky-500">Open FAQ manager →</Link></div> : null}

                <section className={block}>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                        <label className={label}>Article title<input name="title" required value={title} onChange={(event) => { const next = event.target.value; setTitle(next); if (!slugTouched) setSlug(slugify(next)); }} className={field} placeholder="BG-GAMER" /></label>
                        <label className={label}>Status<select name="status" defaultValue={initialStatus} className={field}><option value="DRAFT">Draft</option><option value="REVIEW">Review</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                        <label className={label}>Public slug<div className="mt-1.5 flex items-center rounded-lg border border-foreground/10 bg-background"><span className="pl-3 text-xs text-muted-foreground">/wiki/</span><input name="slug" required value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" /></div></label>
                        <label className={label}>Category<select name="category" value={category} onChange={(event) => setCategory(event.target.value as WikiArticleContent['category'])} className={field}>{categoryOptions.map((item) => <option key={item} value={item}>{wikiCategoryLabel(item)}</option>)}</select></label>
                    </div>
                    <label className={`${label} mt-3 block`}>Summary<textarea name="summary" defaultValue={initial.summary} className={`${field} min-h-24 resize-y`} placeholder="Short description used in Wiki search results and metadata." /></label>
                </section>

                <section className={block}>
                    <div className="mb-2"><p className="text-sm font-bold">Article body</p><p className="mt-0.5 text-[10px] text-muted-foreground">Use Heading 2/3 to create the automatic article table of contents.</p></div>
                    <WikiRichEditor name="bodyHtml" initialValue={initial.bodyHtml} minHeight="min-h-[28rem]" />
                </section>

                <details className="rounded-xl border border-foreground/10 bg-foreground/[0.012]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">Quick facts / infobox <span className="ml-2 text-[10px] font-normal text-muted-foreground">{facts.length} rows</span></summary>
                    <div className="border-t border-foreground/10 p-4">
                        <label className={label}>Infobox heading<input name="infoboxTitle" defaultValue={initial.infoboxTitle} className={field} /></label>
                        <div className="mt-3 space-y-2">{facts.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg border border-foreground/10 p-3 sm:grid-cols-[.7fr_1fr_1fr_auto] sm:items-end"><label className={label}>Label<input value={item.label} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} className={field} /></label><label className={label}>Value<input value={item.value} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, value: e.target.value } : x))} className={field} /></label><label className={label}>Optional link<input value={item.href} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, href: e.target.value } : x))} className={field} /></label><div className="flex items-center gap-2 pb-1"><input type="checkbox" checked={item.enabled} onChange={(e) => setFacts((items) => items.map((x, i) => i === index ? { ...x, enabled: e.target.checked } : x))} /><button type="button" onClick={() => setFacts((items) => items.filter((_, i) => i !== index))} className="text-red-500/70"><Trash2 className="size-3.5" /></button></div></div>)}</div>
                        <button type="button" onClick={() => setFacts((items) => [...items, { id: uid('fact'), label: '', value: '', href: '', enabled: true }])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add fact</button>
                    </div>
                </details>

                {category === 'FAQ' ? <details className="rounded-xl border border-amber-400/20 bg-amber-500/[0.035]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">Legacy FAQ questions <span className="ml-2 text-[10px] font-normal text-muted-foreground">Existing articles only</span></summary>
                    <div className="border-t border-foreground/10 px-4 py-3 text-xs leading-5 text-muted-foreground">This article predates the dedicated FAQ manager. It remains editable, but new FAQ content should be created at <Link href="/admin/wiki/faq" className="font-semibold text-sky-500">Admin → Wiki → FAQ</Link>.</div>
                    <div className="space-y-3 border-t border-foreground/10 p-4">{faq.map((item, index) => <div key={item.id} className="rounded-lg border border-foreground/10 p-3"><div className="flex items-center gap-2"><input type="checkbox" checked={item.enabled} onChange={(e) => setFaq((items) => items.map((x, i) => i === index ? { ...x, enabled: e.target.checked } : x))} /><input value={item.question} onChange={(e) => setFaq((items) => items.map((x, i) => i === index ? { ...x, question: e.target.value } : x))} className={`${field} mt-0 flex-1`} placeholder="Question" /><button type="button" onClick={() => setFaq((items) => items.filter((_, i) => i !== index))} className="text-red-500/70"><Trash2 className="size-3.5" /></button></div><div className="mt-2"><WikiRichEditor name={`faq-${item.id}`} initialValue={item.answer} onChange={(answer) => setFaq((items) => items.map((x, i) => i === index ? { ...x, answer } : x))} minHeight="min-h-28" /></div></div>)}</div>
                    <div className="px-4 pb-4"><button type="button" onClick={() => setFaq((items) => [...items, { id: uid('faq'), question: '', answer: '<p></p>', enabled: true }])} className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-2.5 py-1.5 text-[10px]"><Plus className="size-3" /> Add legacy question</button></div>
                </details> : null}
            </div>

            <aside className="space-y-4">
                <section className={block}><p className="text-sm font-bold">Publishing</p><div className="mt-3 space-y-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" name="indexable" defaultChecked={initial.indexable} /> Allow search-engine indexing</label><label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={initial.featured} /> Featured in Wiki index</label></div></section>
                <section className={block}><MediaPicker value={image} onChange={setImage} label="Article / infobox image" initialKind="image" lockKind /><label className={`${label} mt-3 block`}>Image caption<input name="imageCaption" defaultValue={initial.imageCaption} className={field} /></label></section>
                <section className={block}><p className="text-sm font-bold">Related Wiki articles</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Hold Ctrl/Cmd to select multiple articles.</p><select multiple value={related} onChange={(event) => setRelated(Array.from(event.target.selectedOptions).map((option) => option.value))} className={`${field} min-h-36`}>{articleOptions.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></section>
                <details className="rounded-xl border border-foreground/10 bg-foreground/[0.012]"><summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">SEO overrides</summary><div className="space-y-3 border-t border-foreground/10 p-4"><label className={label}>SEO title<input name="seoTitle" defaultValue={seoTitle || ''} className={field} /></label><label className={label}>Meta description<textarea name="seoDescription" defaultValue={seoDescription || ''} className={`${field} min-h-24 resize-y`} /></label></div></details>
                <button type="submit" className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background">Save Wiki article</button>
            </aside>
        </div>
    </>;
}
