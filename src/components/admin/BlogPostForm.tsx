'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import type { ContentStatus, PostType } from '@prisma/client';
import { PostEditor } from '@/components/admin/PostEditor';
import { MediaPicker } from '@/components/admin/MediaPicker';

export type BlogTypeOption = { id: string; name: string; slug: string; editorMode: PostType };
export type BlogCategoryOption = { id: string; name: string; slug: string };
export type BlogPostSaveResult = { ok: true; id: string; created: boolean; savedAt: string };
export type BlogPostSaveAction = (form: FormData) => Promise<BlogPostSaveResult>;

export type BlogPostFormValue = {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    type?: PostType;
    postTypeId?: string | null;
    status?: ContentStatus;
    category?: string | null;
    categoryId?: string | null;
    tags?: string[];
    authorName?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publishedAt?: Date | null;
    scheduledAt?: Date | null;
    content?: { html?: string; text?: string; featuredImage?: string };
};

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none transition focus:border-white/30 focus:bg-white/[0.05]';
const panelClass = 'rounded-2xl border border-white/10 bg-white/[0.02] p-5';

function dateValue(value?: Date | null) {
    if (!value) return '';
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function BlogPostForm({ value = {}, postTypes, categories, action, submitLabel = 'Publish / Save' }: {
    value?: BlogPostFormValue;
    postTypes: BlogTypeOption[];
    categories: BlogCategoryOption[];
    action: BlogPostSaveAction;
    submitLabel?: string;
}) {
    const router = useRouter();
    const initialTypeId = value.postTypeId || postTypes[0]?.id || '';
    const [selectedTypeId, setSelectedTypeId] = useState(initialTypeId);
    const [title, setTitle] = useState(value.title ?? '');
    const [slug, setSlug] = useState(value.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(Boolean(value.slug));
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [isPending, startTransition] = useTransition();

    const selectedType = useMemo(() => postTypes.find((item) => item.id === selectedTypeId) || postTypes[0], [postTypes, selectedTypeId]);
    const editorMode = selectedType?.editorMode ?? value.type ?? 'ARTICLE';
    const poetry = editorMode === 'POETRY';
    const initialContent = poetry ? value.content?.text ?? '' : value.content?.html ?? '';

    const changeTitle = (next: string) => {
        setTitle(next);
        if (!slugTouched) setSlug(slugify(next));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setSaveState('idle');
        setSaveMessage('');

        startTransition(async () => {
            try {
                const result = await action(formData);
                setSaveState('saved');
                setSaveMessage(`Saved ${new Date(result.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                if (result.created) router.replace(`/admin/blog/${result.id}`);
            } catch (error) {
                setSaveState('error');
                setSaveMessage(error instanceof Error ? error.message : 'Unable to save post.');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div className="min-w-0 space-y-6">
                    <section className={panelClass}>
                        <label className="block">
                            <span className="sr-only">Title</span>
                            <input name="title" required value={title} onChange={(event) => changeTitle(event.target.value)} className="w-full border-0 bg-transparent px-0 py-2 text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-white/20 md:text-4xl" placeholder="Add title" />
                        </label>
                        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/30">Permalink</span>
                            <div className="flex min-w-0 flex-1 items-center rounded-lg bg-black/25 px-3 py-2">
                                <span className="shrink-0 text-xs text-white/25">/blog/</span>
                                <input name="slug" required value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value); }} className="min-w-0 flex-1 bg-transparent text-xs text-white/65 outline-none" placeholder="post-slug" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex items-end justify-between gap-4">
                            <div><p className="text-sm font-medium text-white/70">Content</p><p className="mt-1 text-xs text-white/35">{poetry ? 'Poetry editor preserves line breaks and stanza spacing.' : 'Visual rich-text editor with headings, lists, quotes, links and formatting.'}</p></div>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/35">{selectedType?.name || editorMode.replaceAll('_', ' ')}</span>
                        </div>
                        <PostEditor key={selectedTypeId || editorMode} name="content" initialValue={initialContent} poetry={poetry} />
                    </section>

                    <section className={panelClass}>
                        <h3 className="text-sm font-semibold">SEO</h3>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="block text-xs text-white/45">SEO title<input name="seoTitle" defaultValue={value.seoTitle ?? ''} className={inputClass} /></label>
                            <label className="block text-xs text-white/45">SEO description<textarea name="seoDescription" rows={3} defaultValue={value.seoDescription ?? ''} className={inputClass} /></label>
                        </div>
                    </section>
                </div>

                <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
                    <section className={panelClass}>
                        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Publish</h3><span className="text-[10px] uppercase tracking-[0.18em] text-white/30">Post</span></div>
                        <div className="mt-4 space-y-4">
                            <label className="block text-xs text-white/45">Status<select name="status" defaultValue={value.status ?? 'DRAFT'} className={inputClass}>{['DRAFT','REVIEW','PUBLISHED','ARCHIVED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                            <label className="block text-xs text-white/45">Author<input name="authorName" required defaultValue={value.authorName ?? 'Dr Necrotix'} className={inputClass} /></label>
                            <label className="block text-xs text-white/45">Publish date<input name="publishedAt" type="datetime-local" defaultValue={dateValue(value.publishedAt)} className={inputClass} /></label>
                            <label className="block text-xs text-white/45">Schedule<input name="scheduledAt" type="datetime-local" defaultValue={dateValue(value.scheduledAt)} className={inputClass} /></label>
                        </div>
                        <button disabled={isPending} className="mt-5 w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Saving…' : submitLabel}</button>
                        <div aria-live="polite" className={`mt-3 min-h-5 text-center text-xs transition-opacity duration-200 ${saveState === 'idle' && !isPending ? 'opacity-0' : 'opacity-100'} ${saveState === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                            {isPending ? 'Saving changes without reloading…' : saveMessage || 'Saved'}
                        </div>
                    </section>

                    <section className={panelClass}>
                        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Type & Category</h3><Link href="/admin/blog/taxonomies" className="text-[11px] text-white/40 hover:text-white">Manage</Link></div>
                        <div className="mt-4 space-y-4">
                            <label className="block text-xs text-white/45">Type<select name="postTypeId" value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)} className={inputClass} required>{postTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                            <label className="block text-xs text-white/45">Category<select name="categoryId" defaultValue={value.categoryId ?? ''} className={inputClass}><option value="">Uncategorized</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                            <label className="block text-xs text-white/45">Tags<input name="tags" defaultValue={(value.tags ?? []).join(', ')} placeholder="design, development" className={inputClass} /></label>
                        </div>
                    </section>

                    <section className={panelClass}><MediaPicker value={value.content?.featuredImage ?? ''} inputName="featuredImage" label="Featured image" initialKind="image" lockKind /></section>

                    <section className={panelClass}>
                        <h3 className="text-sm font-semibold">Excerpt</h3>
                        <textarea name="excerpt" rows={5} defaultValue={value.excerpt ?? ''} className={inputClass} placeholder="Optional short summary used in cards and search results." />
                    </section>
                </aside>
            </div>
        </form>
    );
}
