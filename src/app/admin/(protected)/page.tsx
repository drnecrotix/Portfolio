import Link from 'next/link';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import { checkForPortfolioUpdate, installPortfolioUpdate, purgeApplicationCache } from './actions';

export const dynamic = 'force-dynamic';

type UpdateStatus = { state?: string; message?: string; updatedAt?: string; targetVersion?: string | null };

function readUpdateStatus(): UpdateStatus | null {
    try {
        const file = join(process.cwd(), 'tmp', 'update-status.json');
        return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as UpdateStatus : null;
    } catch { return null; }
}

function localVersion() {
    try { return (JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string }).version || 'unknown'; } catch { return 'unknown'; }
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const [params, projects, posts, pages, media, drafts, publishedPosts, activeUsers, revisions, settings, siteMode, recentRevisions] = await Promise.all([
        searchParams,
        prisma.project.count(), prisma.post.count(), prisma.page.count(), prisma.mediaAsset.count(),
        prisma.post.count({ where: { status: 'DRAFT' } }), prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.user.count({ where: { isActive: true } }), prisma.revision.count(),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.siteModeSettings.findUnique({ where: { id: 'default' } }),
        prisma.revision.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }),
    ]);

    const cards = [['Projects', projects], ['Posts', posts], ['Pages', pages], ['Media', media], ['Draft posts', drafts], ['Published', publishedPosts], ['Active users', activeUsers], ['Revisions', revisions]];
    const assistant = normalizeAssistantSettings(settings?.assistantSettings);
    const updateStatus = readUpdateStatus();
    const currentVersion = localVersion();
    const updateParam = typeof params.update === 'string' ? params.update : undefined;
    const error = typeof params.error === 'string' ? params.error : undefined;
    const remoteVersion = typeof params.remoteVersion === 'string' ? params.remoteVersion : undefined;
    const toastMessage = error
        ? error
        : params.cache === 'purged'
            ? 'Application cache purged and public routes revalidated.'
            : updateParam === 'available'
                ? `Update available: ${currentVersion} → ${remoteVersion || 'newer version'}.`
                : updateParam === 'current'
                    ? `Portfolio ${currentVersion} is up to date.`
                    : updateParam === 'started'
                        ? 'Portfolio update started. Refresh the dashboard to see progress.'
                        : undefined;

    return (
        <div className="max-w-7xl mx-auto">
            <StatusToast type={error ? 'error' : toastMessage ? 'success' : undefined} message={toastMessage} />
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
                <div><p className="text-xs uppercase tracking-[0.3em] text-white/35">Control center</p><h2 className="text-4xl font-semibold mt-2">Dashboard</h2></div>
                <div className="text-right"><p className="text-sm text-white/60">{settings?.siteName ?? 'Dr Necrotix'}</p><p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/30">Site mode: {siteMode?.mode ?? 'NORMAL'} · v{currentVersion}</p></div>
            </div>

            <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"><p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p><p className="text-3xl font-semibold mt-4">{value}</p></div>)}
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Portfolio updates</p>
                    <h3 className="mt-2 text-xl font-semibold">GitHub updater</h3>
                    <p className="mt-2 text-sm text-white/45">Installed v{currentVersion}. Checks the main branch version and can deploy it on N0C while preserving secrets and Passenger configuration.</p>
                    {updateStatus && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55"><span className="uppercase tracking-[0.18em]">{updateStatus.state}</span><p className="mt-1 normal-case tracking-normal">{updateStatus.message}</p></div>}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <form action={checkForPortfolioUpdate}><button className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Check update</button></form>
                        <form action={installPortfolioUpdate}><button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Install update</button></form>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Cache</p>
                    <h3 className="mt-2 text-xl font-semibold">Purge cache</h3>
                    <p className="mt-2 text-sm text-white/45">Revalidates the public layout, projects, blog, contact page and dashboard without deleting user data.</p>
                    <form action={purgeApplicationCache} className="mt-5"><button className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Purge application cache</button></form>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">AI Assistant</p>
                    <h3 className="mt-2 text-xl font-semibold">{assistant.assistantName}</h3>
                    <p className="mt-2 text-sm text-white/45">{assistant.enabled ? 'Enabled' : 'Disabled'} · {assistant.providerOrder.join(' → ')} · temp {assistant.temperature}</p>
                    <Link href="/admin/assistant" className="mt-5 inline-block rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Edit assistant</Link>
                </div>
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-white/35">Activity</p><h3 className="mt-2 text-xl font-semibold">Recent revisions</h3></div><Link href="/admin/revisions" className="text-sm text-white/45 transition hover:text-white">View history →</Link></div>
                    <div className="mt-6 divide-y divide-white/10">
                        {recentRevisions.length ? recentRevisions.map((revision) => <div key={revision.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-white/80">{revision.note || `${revision.entityType} revision`}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/30">{revision.entityType} · {revision.user?.name ?? revision.user?.email ?? 'System'}</p></div><time className="text-xs text-white/35">{revision.createdAt.toLocaleString('en-GB', { timeZone: settings?.timezone ?? 'Europe/Sofia' })}</time></div>) : <p className="py-8 text-sm text-white/40">No revisions have been recorded yet.</p>}
                    </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Quick access</p><div className="mt-5 space-y-2">{[['New project', '/admin/projects/new'], ['New publication', '/admin/blog/new'], ['Manage media', '/admin/media'], ['AI Assistant', '/admin/assistant'], ['Site Mode', '/admin/site-mode'], ['Users & roles', '/admin/users']].map(([label, href]) => <Link key={href} href={href} className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white">{label}</Link>)}</div></div>
            </section>
        </div>
    );
}
