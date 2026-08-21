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
            <div className="mb-7 flex flex-col gap-5 md:mb-8 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Projects</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Projects created here drive the public projects archive and detail pages.</p>
                </div>
                <Link href="/admin/projects/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background sm:self-start md:self-auto">New project</Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.015]">
                {projects.length === 0 ? (
                    <div className="px-5 py-14 text-center text-sm leading-6 text-muted-foreground">No CMS projects yet. Until the first one is created, the public site keeps using the existing portfolio data.</div>
                ) : (
                    <div>
                        {projects.map((project) => (
                            <Link key={project.id} href={`/admin/projects/${project.id}`} className="block border-b border-foreground/10 p-4 transition-colors last:border-b-0 hover:bg-foreground/[0.035] sm:p-5 md:grid md:grid-cols-[minmax(0,1fr)_160px_100px_120px] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    <p className="break-words text-lg font-semibold sm:text-base">{project.title}</p>
                                    <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">/{project.slug}</p>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs md:mt-0 md:contents">
                                    <div className="min-w-0 md:block">
                                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">Category</span>
                                        <span className="block truncate text-sm text-muted-foreground">{project.category || 'Uncategorized'}</span>
                                    </div>
                                    <div className="md:block">
                                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">Status</span>
                                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">{project.status}</span>
                                    </div>
                                    <div className="col-span-2 md:block">
                                        <span className="text-xs text-muted-foreground">{project._count.revisions} revisions</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
