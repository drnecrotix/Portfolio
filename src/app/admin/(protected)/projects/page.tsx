import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
    const projects = await prisma.project.findMany({
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        include: { _count: { select: { revisions: true } } },
    });

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content</p>
                    <h2 className="mt-2 text-4xl font-semibold">Projects</h2>
                    <p className="mt-2 text-sm text-white/40">Projects created here drive the public projects archive and detail pages.</p>
                </div>
                <Link href="/admin/projects/new" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">New project</Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                {projects.length === 0 ? (
                    <div className="p-10 text-center text-sm text-white/45">No CMS projects yet. Until the first one is created, the public site keeps using the existing portfolio data.</div>
                ) : (
                    <div className="divide-y divide-white/10">
                        {projects.map((project) => (
                            <Link key={project.id} href={`/admin/projects/${project.id}`} className="grid gap-3 p-5 transition-colors hover:bg-white/[0.03] md:grid-cols-[1fr_160px_100px_120px] md:items-center">
                                <div>
                                    <p className="font-semibold">{project.title}</p>
                                    <p className="mt-1 text-sm text-white/40">/{project.slug}</p>
                                </div>
                                <span className="text-sm text-white/55">{project.category || 'Uncategorized'}</span>
                                <span className="text-xs font-semibold tracking-wide text-white/55">{project.status}</span>
                                <span className="text-xs text-white/35">{project._count.revisions} revisions</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
