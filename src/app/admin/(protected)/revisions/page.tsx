import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const entityLabels: Record<string, string> = {
    project: 'Project',
    post: 'Publication',
    page: 'Page',
};

function entityHref(entityType: string, entityId: string) {
    if (entityType === 'project') return `/admin/projects/${entityId}`;
    if (entityType === 'post') return `/admin/blog/${entityId}`;
    if (entityType === 'page') return `/admin/pages/${entityId}`;
    return null;
}

export default async function RevisionsPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    const { type } = await searchParams;
    const entityType = ['project', 'post', 'page'].includes(type ?? '') ? type : undefined;

    const [settings, total, revisions] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.revision.count({ where: entityType ? { entityType } : undefined }),
        prisma.revision.findMany({
            where: entityType ? { entityType } : undefined,
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true, role: true } },
                project: { select: { title: true } },
                post: { select: { title: true } },
                page: { select: { title: true } },
            },
        }),
    ]);

    const timezone = settings?.timezone ?? 'Europe/Sofia';

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content safety</p>
                    <h1 className="mt-2 text-4xl font-semibold">Revision History</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                        Automatic snapshots created before CMS content updates. The latest 100 matching revisions are shown.
                    </p>
                </div>
                <p className="text-sm text-white/40">{total} matching revision{total === 1 ? '' : 's'}</p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {[
                    ['All', '/admin/revisions'],
                    ['Projects', '/admin/revisions?type=project'],
                    ['Publications', '/admin/revisions?type=post'],
                    ['Pages', '/admin/revisions?type=page'],
                ].map(([label, href]) => {
                    const active = (label === 'All' && !entityType)
                        || (label === 'Projects' && entityType === 'project')
                        || (label === 'Publications' && entityType === 'post')
                        || (label === 'Pages' && entityType === 'page');
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] transition ${active ? 'border-white/50 bg-white text-black' : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white'}`}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                {revisions.length ? revisions.map((revision) => {
                    const title = revision.project?.title || revision.post?.title || revision.page?.title || revision.entityId;
                    const href = entityHref(revision.entityType, revision.entityId);
                    return (
                        <details key={revision.id} className="group border-b border-white/10 last:border-b-0">
                            <summary className="cursor-pointer list-none px-5 py-5 transition hover:bg-white/[0.025] md:px-7">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                                                {entityLabels[revision.entityType] ?? revision.entityType}
                                            </span>
                                            <span className="text-sm font-medium text-white/85">{title}</span>
                                        </div>
                                        <p className="mt-2 text-sm text-white/40">{revision.note || 'Automatic snapshot before update'}</p>
                                    </div>
                                    <div className="shrink-0 text-left md:text-right">
                                        <time className="text-xs text-white/40">{revision.createdAt.toLocaleString('en-GB', { timeZone: timezone })}</time>
                                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/25">
                                            {revision.user?.name ?? revision.user?.email ?? 'System'}{revision.user?.role ? ` · ${revision.user.role}` : ''}
                                        </p>
                                    </div>
                                </div>
                            </summary>

                            <div className="border-t border-white/10 bg-black/20 px-5 py-5 md:px-7">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">Stored snapshot</p>
                                    {href && (
                                        <Link href={href} className="text-sm text-white/45 transition hover:text-white">
                                            Open current item →
                                        </Link>
                                    )}
                                </div>
                                <pre className="max-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/55">
                                    {JSON.stringify(revision.snapshot, null, 2)}
                                </pre>
                            </div>
                        </details>
                    );
                }) : (
                    <div className="px-7 py-16 text-center text-sm text-white/40">No revisions found for this filter.</div>
                )}
            </section>
        </div>
    );
}
