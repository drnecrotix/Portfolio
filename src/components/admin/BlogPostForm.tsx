'use client';

import { useState } from 'react';
import type { ContentStatus, PostType } from '@prisma/client';
import { PostEditor } from '@/components/admin/PostEditor';
import { MediaPicker } from '@/components/admin/MediaPicker';

export type BlogPostFormValue = {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    type?: PostType;
    status?: ContentStatus;
    category?: string | null;
    tags?: string[];
    authorName?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publishedAt?: Date | null;
    scheduledAt?: Date | null;
    content?: { html?: string; text?: string; featuredImage?: string };
};

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 outline-none focus:border-white/25';

function dateValue(value?: Date | null) {
    if (!value) return '';
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export function BlogPostForm({ value = {} }: { value?: BlogPostFormValue }) {
    const [type, setType] = useState<PostType>(value.type ?? 'ARTICLE');
    const initialContent = type === 'POETRY' ? value.content?.text ?? '' : value.content?.html ?? '';

    return (
        <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2">
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Title</span><input name="title" required defaultValue={value.title ?? ''} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Slug</span><input name="slug" required defaultValue={value.slug ?? ''} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Author</span><input name="authorName" required defaultValue={value.authorName ?? 'Dr Necrotix'} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Type</span><select name="type" value={type} onChange={(e) => setType(e.target.value as PostType)} className={inputClass}>{['ARTICLE','POETRY','THOUGHT','NOTE','PROJECT_LOG'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
                <label className="block"><span className="text-sm text-white/55">Status</span><select name="status" defaultValue={value.status ?? 'DRAFT'} className={inputClass}>{['DRAFT','REVIEW','PUBLISHED','ARCHIVED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="block"><span className="text-sm text-white/55">Category</span><input name="category" defaultValue={value.category ?? ''} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Tags - comma separated</span><input name="tags" defaultValue={(value.tags ?? []).join(', ')} className={inputClass} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Excerpt</span><textarea name="excerpt" rows={3} defaultValue={value.excerpt ?? ''} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Published at</span><input name="publishedAt" type="datetime-local" defaultValue={dateValue(value.publishedAt)} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">Scheduled at</span><input name="scheduledAt" type="datetime-local" defaultValue={dateValue(value.scheduledAt)} className={inputClass} /></label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <MediaPicker value={value.content?.featuredImage ?? ''} inputName="featuredImage" label="Featured image (optional)" />
            </div>

            <div>
                <div className="mb-3">
                    <p className="text-sm text-white/55">Content</p>
                    <p className="mt-1 text-xs text-white/35">{type === 'POETRY' ? 'Poetry mode preserves line breaks and stanza spacing exactly.' : 'Rich text mode supports headings, emphasis, lists and quotes.'}</p>
                </div>
                <PostEditor key={type} name="content" initialValue={initialContent} poetry={type === 'POETRY'} />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <label className="block"><span className="text-sm text-white/55">SEO title</span><input name="seoTitle" defaultValue={value.seoTitle ?? ''} className={inputClass} /></label>
                <label className="block"><span className="text-sm text-white/55">SEO description</span><input name="seoDescription" defaultValue={value.seoDescription ?? ''} className={inputClass} /></label>
            </div>
        </div>
    );
}
