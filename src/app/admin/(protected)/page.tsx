import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const [
        projects,
        posts,
        pages,
        media,
        drafts,
        publishedPosts,
        activeUsers,
        revisions,
        settings,
        siteMode,
        recentRevisions,
    ] = await Promise.all([
        prisma.project.count(),
        prisma.post.count(),
        prisma.page.count(),
        prisma.mediaAsset.count(),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.revision.count(),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.siteModeSettings.findUnique({ where: { id: 'default' } }),
        prisma.revision.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } },
        }),
    ]);

    const cards = [
        ['Projects', projects],
        ['Posts', posts],
        ['Pages', pages],
        ['Media', media],
        ['Draft posts', drafts],
        ['Published', publishedPosts],
        ['Active users', activeUsers],
        ['Revisions', revisions],
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Control center</p>
                    <h2 className="text-4xl font-semibold mt-2">Dashboard</h2>
                </div>
                <div className="text-right">
                    <p className="text-sm text-white/60">{settings?.siteName ?? 'Dr Necrotix'}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/30">Site mode: {siteMode?.mode ?? 'NORMAL'}</p>
                </div>
            </div>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
                        <p className="text-3xl font-semibold mt-4">{value}</p>
                    </div>
                ))}
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-white/35">Activity</p>
                            <h3 className="mt-2 text-xl font-semibold">Recent revisions</h3>
                        </div>
                        <Link href="/admin/revisions" className="text-sm text-white/45 transition hover:text-white">View history →</Link>
                    </div>

                    <div className="mt-6 divide-y divide-white/10">
                        {recentRevisions.length ? recentRevisions.map((revision) => (
                            <div key={revision.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-white/80">{revision.note || `${revision.entityType} revision`}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/30">{revision.entityType} · {revision.user?.name ?? revision.user?.email ?? 'System'}</p>
                                </div>
                                <time className="text-xs text-white/35">{revision.createdAt.toLocaleString('en-GB', { timeZone: settings?.timezone ?? 'Europe/Sofia' })}</time>
                            </div>
                        )) : (
                            <p className="py-8 text-sm text-white/40">No revisions have been recorded yet.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Quick access</p>
                    <div className="mt-5 space-y-2">
                        {[
                            ['New project', '/admin/projects/new'],
                            ['New publication', '/admin/blog/new'],
                            ['Manage media', '/admin/media'],
                            ['Site Mode', '/admin/site-mode'],
                            ['Users & roles', '/admin/users'],
                        ].map(([label, href]) => (
                            <Link key={href} href={href} className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white">
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
