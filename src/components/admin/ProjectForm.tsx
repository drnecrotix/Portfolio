'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent, type InvalidEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Project as PrismaProject } from '@prisma/client';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { PostEditor } from '@/components/admin/PostEditor';
import { TagInput } from '@/components/admin/TagInput';
import { SeoEditor } from '@/components/admin/SeoEditor';
import { UnsavedContentPreview } from '@/components/admin/UnsavedContentPreview';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';
import type { ProjectSaveResult } from '@/app/admin/(protected)/projects/actions';

const field = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/[0.05] invalid:border-red-400/50 invalid:bg-red-400/[0.035]';
const selectField = `${field} [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.02] p-6';
const projectShortcodes = [
    { label: 'Mission Brief', value: '[[mission]]' },
    { label: 'Features', value: '[[features]]' },
    { label: 'Engineering Chronicles', value: '[[chronicles]]' },
    { label: 'Installation', value: '[[installation]]' },
];
const projectNoticeKey = 'admin:project-save-notice';

type ProjectSaveAction = (formData: FormData) => Promise<ProjectSaveResult>;
type ValidatableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function validationMessageFor(target: ValidatableField) {
    const labelText = target.closest('label')?.querySelector('span')?.textContent?.trim();
    const fieldName = labelText || target.name || 'This field';

    if (target.validity.valueMissing) return `${fieldName} is required.`;
    if (target.name === 'slug' && target.validity.patternMismatch) {
        return 'Slug must use lowercase letters, numbers and hyphens only - for example: volt-forge-stodio.';
    }
    if (target instanceof HTMLInputElement && target.type === 'url' && target.validity.typeMismatch) {
        return `${fieldName} must be a complete URL starting with http:// or https://.`;
    }
    if (target.validity.badInput) return `${fieldName} contains an invalid value.`;
    return target.validationMessage || `${fieldName} is invalid.`;
}

export function ProjectForm({ project, categories = [], action, submitLabel }: {
    project?: PrismaProject | null;
    categories?: string[];
    action: ProjectSaveAction;
    submitLabel: string;
}) {
    const router = useRouter();
    const rawContent = (project?.content ?? {}) as Record<string, unknown>;
    const initialImage = typeof rawContent.image === 'string' ? rawContent.image : '';
    const initialDownloadUrl = typeof rawContent.downloadUrl === 'string' ? rawContent.downloadUrl : '';
    const content = JSON.stringify(rawContent, null, 2);
    const categoryOptions = [...categories];
    if (project?.category && !categoryOptions.includes(project.category)) categoryOptions.push(project.category);
    categoryOptions.sort((a, b) => a.localeCompare(b));

    const draftKey = project?.id ? `project:edit:${project.id}` : 'project:new';
    const [category, setCategory] = useState(project?.category ?? '');
    const [title, setTitle] = useState(project?.title ?? '');
    const [slug, setSlug] = useState(project?.slug ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [image, setImage] = useState(initialImage);
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [noticeVisible, setNoticeVisible] = useState(false);
    const [isPending, startTransition] = useTransition();
    const invalidHandledRef = useRef(false);
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showNotice = (message: string, state: 'saved' | 'error') => {
        setSaveState(state);
        setSaveMessage(message);
        setNoticeVisible(true);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => setNoticeVisible(false), 7000);
    };

    useEffect(() => {
        let restoredMessage: string | undefined;

        try {
            const stored = sessionStorage.getItem(projectNoticeKey);
            if (stored) {
                const parsed = JSON.parse(stored) as { message?: string };
                sessionStorage.removeItem(projectNoticeKey);
                restoredMessage = parsed.message;
            }
        } catch {
            sessionStorage.removeItem(projectNoticeKey);
        }

        const restoreTimer = restoredMessage
            ? window.setTimeout(() => showNotice(restoredMessage, 'saved'), 0)
            : null;

        return () => {
            if (restoreTimer !== null) window.clearTimeout(restoreTimer);
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        };
    }, []);

    const handleInvalid = (event: InvalidEvent<HTMLFormElement>) => {
        if (invalidHandledRef.current) return;
        invalidHandledRef.current = true;

        const target = event.target as ValidatableField;
        showNotice(validationMessageFor(target), 'error');

        window.requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.focus({ preventScroll: true });
        });

        window.setTimeout(() => {
            invalidHandledRef.current = false;
        }, 0);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setSaveState('idle');
        setSaveMessage('');

        startTransition(async () => {
            try {
                const result = await action(formData);

                if (!result.ok) {
                    showNotice(result.error, 'error');
                    if (result.field) {
                        const target = form.elements.namedItem(result.field);
                        if (target instanceof HTMLElement) {
                            window.requestAnimationFrame(() => {
                                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                target.focus({ preventScroll: true });
                            });
                        }
                    }
                    return;
                }

                markDraftCommitted(draftKey);
                const savedTime = new Date(result.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const message = result.created
                    ? `Project “${title || 'Untitled'}” was created successfully at ${savedTime}.`
                    : `Project “${title || 'Untitled'}” was updated successfully at ${savedTime}.`;

                showNotice(message, 'saved');

                if (result.created) {
                    try { sessionStorage.setItem(projectNoticeKey, JSON.stringify({ message })); } catch { /* storage is optional */ }
                    router.replace(`/admin/projects/${result.id}`, { scroll: false });
                }
            } catch (error) {
                showNotice(
                    error instanceof Error && error.message && !error.message.includes('Server Components render')
                        ? error.message
                        : 'The project request failed before a save result was returned. Please retry. If it continues, check the server logs.',
                    'error',
                );
            }
        });
    };

    return (
        <>
            <form onSubmit={handleSubmit} onInvalidCapture={handleInvalid} className="space-y-8">
                <FormDraftGuard draftKey={draftKey} label="project" />

                <section className={`grid gap-5 md:grid-cols-2 ${panel}`}>
                    <label className="block md:col-span-2"><span className="text-sm text-white/55">Title</span><input className={field} name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                    <label className="block"><span className="text-sm text-white/55">Slug</span><input className={field} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
                    <label className="block">
                        <span className="text-sm text-white/55">Category</span>
                        <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectField}>
                            <option value="">Uncategorized</option>
                            {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                            <option value="__new__">+ New category</option>
                        </select>
                    </label>
                    {category === '__new__' && <label className="block md:col-span-2"><span className="text-sm text-white/55">New category name</span><input className={field} name="newCategory" required placeholder="e.g. Web development" /></label>}
                    <label className="block md:col-span-2"><span className="text-sm text-white/55">Short description</span><textarea className={field} name="description" rows={3} required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                </section>

                <section className={panel}>
                    <div className="mb-4">
                        <p className="text-sm font-medium text-white/70">Long description</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/35">Write a clean rich-text description. Use <strong className="text-white/55">Insert project block…</strong> only where you want Mission, Features, Chronicles or Installation to appear. Blocks are no longer added automatically.</p>
                    </div>
                    <PostEditor name="longDescription" initialValue={project?.longDescription ?? ''} shortcodes={projectShortcodes} />
                </section>

                <section className={panel}>
                    <MediaPicker value={image} onChange={setImage} inputName="imageUrl" label="Project cover image" initialKind="image" lockKind />
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
                    <label className="block"><span className="text-sm text-white/55">Download URL <span className="text-white/30">(optional)</span></span><input className={field} type="url" name="downloadUrl" defaultValue={initialDownloadUrl} placeholder="https://example.com/download.zip" /></label>
                    <label className="block"><span className="text-sm text-white/55">Role</span><input className={field} name="role" defaultValue={project?.role ?? ''} /></label>
                    <label className="block"><span className="text-sm text-white/55">Timeline</span><input className={field} name="timeline" defaultValue={project?.timeline ?? ''} /></label>
                    <label className="block"><span className="text-sm text-white/55">Team</span><input className={field} name="team" defaultValue={project?.team ?? ''} /></label>
                </section>

                <SeoEditor sourceTitle={title} sourceDescription={description} slug={slug} hasImage={Boolean(image)} initialTitle={project?.seoTitle} initialDescription={project?.seoDescription} />

                <section className={panel}>
                    <label className="block"><span className="text-sm text-white/55">Advanced content JSON</span><p className="mt-1 text-xs text-white/30">Optional data sources for project blocks: galleryImages, features, installation, challengesAndSolutions. Download URL is managed by the dedicated field above. A block renders only when its shortcode is placed in Long description.</p><textarea className={`${field} font-mono`} name="content" rows={16} defaultValue={content} /></label>
                </section>

                <div className="sticky bottom-4 z-20 flex flex-col items-stretch gap-3 rounded-2xl border border-white/10 bg-[#101010]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div aria-live="polite" className={`min-h-5 flex-1 text-xs ${saveState === 'error' ? 'text-red-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-white/35'}`}>{isPending ? 'Saving project without reloading…' : saveMessage || 'Preview changes before saving, then publish when ready.'}</div>
                    <div className="flex gap-2"><UnsavedContentPreview kind="project" /><button disabled={isPending} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">{isPending ? 'Saving…' : submitLabel}</button></div>
                </div>
            </form>

            {noticeVisible && (
                <div className="fixed bottom-5 left-4 right-4 z-[120] rounded-2xl border border-white/15 bg-[#101010]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[min(92vw,420px)]" role="status" aria-live="polite">
                    <div className="flex items-start gap-3">
                        <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${saveState === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{saveState === 'error' ? 'Project save failed' : 'Project saved'}</p>
                            <p className="mt-1 text-sm leading-5 text-white/80">{saveMessage}</p>
                        </div>
                        <button type="button" onClick={() => setNoticeVisible(false)} className="text-lg leading-none text-white/40 transition hover:text-white" aria-label="Dismiss save notification">×</button>
                    </div>
                </div>
            )}
        </>
    );
}
