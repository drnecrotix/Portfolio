'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Project as PrismaProject } from '@prisma/client';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { PostEditor } from '@/components/admin/PostEditor';
import { TagInput } from '@/components/admin/TagInput';
import type { ProjectSaveResult } from '@/app/admin/(protected)/projects/actions';

const field = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/[0.05]';
const selectField = `${field} [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.02] p-6';

type ProjectSaveAction = (formData: FormData) => Promise<ProjectSaveResult>;

export function ProjectForm({
    project,
    categories = [],
    action,
    submitLabel,
}: {
    project?: PrismaProject | null;
    categories?: string[];
    action: ProjectSaveAction;
    submitLabel: string;
}) {
    const router = useRouter();
    const rawContent = (project?.content ?? {}) as Record<string, unknown>;
    const image = typeof rawContent.image === 'string' ? rawContent.image : '';
    const content = JSON.stringify(rawContent, null, 2);
    const categoryOptions = [...categories];
    if (project?.category && !categoryOptions.includes(project.category)) categoryOptions.push(project.category);
    categoryOptions.sort((a, b) => a.localeCompare(b));
    const [category, setCategory] = useState(project?.category ?? '');
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [isPending, startTransition] = useTransition();

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
                if (result.created) router.replace(`/admin/projects/${result.id}`);
            } catch (error) {
                setSaveState('error');
                setSaveMessage(error instanceof Error ? error.message : 'Unable to save project.');
            }
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            onInvalidCapture={() => {
                setSaveState('error');
                setSaveMessage('Please complete the required fields before saving.');
            }}
            className="space-y-8"
        >
            <section className={`grid gap-5 md:grid-cols-2 ${panel}`}>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Title</span><input className={field} name="title" required defaultValue={project?.title ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Slug</span><input className={field} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={project?.slug ?? ''} /></label>
                <label className="block">
                    <span className="text-sm text-white/55">Category</span>
                    <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectField}>
                        <option value="">Uncategorized</option>
                        {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        <option value="__new__">+ New category</option>
                    </select>
                </label>
                {category === '__new__' && (
                    <label className="block md:col-span-2"><span className="text-sm text-white/55">New category name</span><input className={field} name="newCategory" required placeholder="e.g. Web development" /></label>
                )}
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Short description</span><textarea className={field} name="description" rows={3} required defaultValue={project?.description ?? ''} /></label>
            </section>

            <section className={panel}>
                <div className="mb-3"><p className="text-sm font-medium text-white/70">Long description</p><p className="mt-1 text-xs text-white/35">Rich-text editor with headings, lists, quotes, code, links and formatting.</p></div>
                <PostEditor name="longDescription" initialValue={project?.longDescription ?? ''} />
            </section>

            <section className={panel}>
                <MediaPicker value={image} inputName="imageUrl" label="Project cover image" initialKind="image" lockKind />
                <p className="mt-3 text-[11px] text-white/30">Choose from the shared library or upload a new image directly here.</p>
            </section>

            <section className={`grid gap-5 md:grid-cols-2 ${panel}`}>
                <label className="block"><span className="text-sm text-white/55">Status</span><select className={selectField} name="status" defaultValue={project?.status ?? 'PLANNED'}><option value="PLANNED">Planned</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></label>
                <label className="block"><span className="text-sm text-white/55">Sort order</span><input className={field} type="number" name="sortOrder" defaultValue={project?.sortOrder ?? 0} /></label>
                <div className="md:col-span-2"><TagInput name="technologies" initialTags={project?.technologies ?? []} label="Technologies" /></div>
                <div className="md:col-span-2"><TagInput name="tools" initialTags={project?.tools ?? []} label="Tools" /></div>
                <div className="md:col-span-2"><TagInput name="highlights" initialTags={project?.highlights ?? []} label="Highlights" /></div>
            </section>

            <section className={`grid gap-5 md:grid-cols-2 ${panel}`}>
                <label className="block"><span className="text-sm text-white/55">Repository URL</span><input className={field} type="url" name="repoUrl" defaultValue={project?.repoUrl ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Demo URL</span><input className={field} type="url" name="demoUrl" defaultValue={project?.demoUrl ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Role</span><input className={field} name="role" defaultValue={project?.role ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Timeline</span><input className={field} name="timeline" defaultValue={project?.timeline ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Team</span><input className={field} name="team" defaultValue={project?.team ?? ''} /></label>
            </section>

            <section className={`grid gap-5 md:grid-cols-2 ${panel}`}>
                <label className="block"><span className="text-sm text-white/55">SEO title</span><input className={field} name="seoTitle" defaultValue={project?.seoTitle ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">SEO description</span><textarea className={field} name="seoDescription" rows={3} defaultValue={project?.seoDescription ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Advanced content JSON</span><p className="mt-1 text-xs text-white/30">Optional keys: galleryImages, features, installation, challengesAndSolutions. The cover image is managed above.</p><textarea className={`${field} font-mono`} name="content" rows={16} defaultValue={content} /></label>
            </section>

            <div className="sticky bottom-4 z-20 flex flex-col items-stretch gap-3 rounded-2xl border border-white/10 bg-[#101010]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <div aria-live="polite" className={`min-h-5 text-xs ${saveState === 'error' ? 'text-red-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-white/35'}`}>
                    {isPending ? 'Saving project without reloading…' : saveMessage || 'Changes are saved only when you press the button.'}
                </div>
                <button disabled={isPending} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Saving…' : submitLabel}</button>
            </div>
        </form>
    );
}
