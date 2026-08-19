import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectForm } from '@/components/admin/ProjectForm';
import { deleteProject, updateProject } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
        include: { revisions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!project) notFound();

    const updateAction = updateProject.bind(null, project.id);
    const deleteAction = deleteProject.bind(null, project.id);

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div><p className="text-xs uppercase tracking-[0.3em] text-white/35">Projects</p><h2 className="mt-2 text-4xl font-semibold">{project.title}</h2><p className="mt-2 text-sm text-white/40">Last updated {project.updatedAt.toLocaleString()}</p></div>
                <div className="flex gap-3">
                    <Link href={`/admin/projects/${project.id}/preview`} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:text-white">Preview</Link>
                    <Link href="/admin/projects" className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:text-white">Back</Link>
                </div>
            </div>

            <ProjectForm project={project} action={updateAction} submitLabel="Save changes" />

            <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-semibold">Revision history</h3><p className="mt-1 text-sm text-white/40">A snapshot is saved automatically before each edit.</p></div><span className="text-sm text-white/35">{project.revisions.length} shown</span></div>
                <div className="mt-5 divide-y divide-white/10 border-t border-white/10">
                    {project.revisions.length === 0 ? <p className="py-6 text-sm text-white/35">No revisions yet.</p> : project.revisions.map((revision) => (
                        <div key={revision.id} className="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between"><span className="text-sm text-white/70">{revision.note || 'Project snapshot'}</span><span className="text-xs text-white/35">{revision.createdAt.toLocaleString()}</span></div>
                    ))}
                </div>
            </section>

            <section className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
                <h3 className="font-semibold text-red-300">Danger zone</h3><p className="mt-2 text-sm text-white/40">Deleting a project also deletes its revision history.</p>
                <form action={deleteAction} className="mt-4"><button className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">Delete project</button></form>
            </section>
        </div>
    );
}
