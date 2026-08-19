import type { Project as PrismaProject } from '@prisma/client';
import { MediaPicker } from '@/components/admin/MediaPicker';

const field = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none focus:border-white/30';

export function ProjectForm({ project, action, submitLabel }: { project?: PrismaProject | null; action: (formData: FormData) => void | Promise<void>; submitLabel: string }) {
    const rawContent = (project?.content ?? {}) as Record<string, unknown>;
    const image = typeof rawContent.image === 'string' ? rawContent.image : '';
    const content = JSON.stringify(rawContent, null, 2);

    return (
        <form action={action} className="space-y-8">
            <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Title</span><input className={field} name="title" required defaultValue={project?.title ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Slug</span><input className={field} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={project?.slug ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Category</span><input className={field} name="category" defaultValue={project?.category ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Short description</span><textarea className={field} name="description" rows={3} required defaultValue={project?.description ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Long description</span><textarea className={field} name="longDescription" rows={7} defaultValue={project?.longDescription ?? ''} /></label>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <MediaPicker value={image} inputName="imageUrl" label="Project cover image" />
            </section>

            <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
                <label className="block"><span className="text-sm text-white/55">Status</span><select className={field} name="status" defaultValue={project?.status ?? 'PLANNED'}><option value="PLANNED">Planned</option><option value="ONGOING">Ongoing</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></label>
                <label className="block"><span className="text-sm text-white/55">Sort order</span><input className={field} type="number" name="sortOrder" defaultValue={project?.sortOrder ?? 0} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Technologies - comma separated</span><input className={field} name="technologies" defaultValue={project?.technologies.join(', ') ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Tools - comma separated</span><input className={field} name="tools" defaultValue={project?.tools.join(', ') ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Highlights - comma separated</span><input className={field} name="highlights" defaultValue={project?.highlights.join(', ') ?? ''} /></label>
            </section>

            <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
                <label className="block"><span className="text-sm text-white/55">Repository URL</span><input className={field} type="url" name="repoUrl" defaultValue={project?.repoUrl ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Demo URL</span><input className={field} type="url" name="demoUrl" defaultValue={project?.demoUrl ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Role</span><input className={field} name="role" defaultValue={project?.role ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Timeline</span><input className={field} name="timeline" defaultValue={project?.timeline ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">Team</span><input className={field} name="team" defaultValue={project?.team ?? ''} /></label>
            </section>

            <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
                <label className="block"><span className="text-sm text-white/55">SEO title</span><input className={field} name="seoTitle" defaultValue={project?.seoTitle ?? ''} /></label>
                <label className="block"><span className="text-sm text-white/55">SEO description</span><textarea className={field} name="seoDescription" rows={3} defaultValue={project?.seoDescription ?? ''} /></label>
                <label className="block md:col-span-2"><span className="text-sm text-white/55">Advanced content JSON</span><p className="mt-1 text-xs text-white/30">Optional keys: galleryImages, features, installation, challengesAndSolutions. The cover image is managed above.</p><textarea className={`${field} font-mono`} name="content" rows={16} defaultValue={content} /></label>
            </section>

            <div className="flex justify-end"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">{submitLabel}</button></div>
        </form>
    );
}
