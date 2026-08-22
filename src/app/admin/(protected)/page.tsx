import Link from 'next/link';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { PortfolioUpdater, type PortfolioUpdateStatus } from '@/components/admin/PortfolioUpdater';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import { installedPortfolioVersion } from '@/lib/installed-version';
import { purgeApplicationCache } from './actions';

export const dynamic = 'force-dynamic';

function readUpdateStatus(): PortfolioUpdateStatus | null {
    try {
        const file = join(process.cwd(), 'tmp', 'update-status.json');
        return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as PortfolioUpdateStatus : null;
    } catch { return null; }
}

const panelClass = 'rounded-2xl border border-foreground/10 bg-foreground/[0.025]';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const [projects, posts, pages, media, drafts, publishedPosts, activeUsers, revisions, settings, siteMode, recentRevisions] = await prisma.$transaction([
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
        prisma.revision.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }),
    ]);

    const cards = [['Projects', projects], ['Posts', posts], ['Pages', pages], ['Media', media], ['Draft posts', drafts], ['Published', publishedPosts], ['Active users', activeUsers], ['Revisions', revisions]];
    const assistant = normalizeAssistantSettings(settings?.assistantSettings);
    const updateStatus = readUpdateStatus();
    const currentVersion = installedPortfolioVersion();
    const error = typeof params.error === 'string' ? params.error : undefined;
    const toastMessage = error ? error : params.cache === 'purged' ? 'Public cache revalidated successfully.' : undefined;

    return (
        <div className="mx-auto max-w-[1500px]">
            <StatusToast type={error ? 'error' : toastMessage ? 'success' : undefined} message={toastMessage} />

            <header className="mb-6 flex flex-col gap-4 border-b border-foreground/10 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">Control center</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h2>
                </div>
                <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">{settings?.siteName ?? 'Dr Necrotix'}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">Site mode: {siteMode?.mode ?? 'NORMAL'} · v{currentVersion}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4 xl:grid-cols-8" aria-label="Site statistics">
                {cards.map(([label, value]) => (
                    <div key={label} className={`${panelClass} min-w-0 p-4 sm:p-5`}>
                        <p className="truncate text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">{label}</p>
                        <p className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
                    </div>
                ))}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-5"><PortfolioUpdater currentVersion={currentVersion} initialStatus={updateStatus} /></div>

                <div className={`${panelClass} p-5 sm:p-6 lg:col-span-3`}>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Cache</p>
                    <h3 className="mt-2 text-lg font-semibold">Public cache</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Blog and Project pages stay dynamic. Sitemap and RSS refresh automatically within 1 hour, and content edits trigger them immediately. Use this button to force revalidation of all public routes, metadata, sitemap, RSS and robots.txt.</p>
                    <form action={purgeApplicationCache} className="mt-5"><button className="w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm transition hover:bg-foreground/[0.05] sm:w-auto">Purge public cache</button></form>
                </div>

                <div className={`${panelClass} p-5 sm:p-6 lg:col-span-4`}>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Assistant</p>
                    <h3 className="mt-2 text-lg font-semibold">{assistant.assistantName}</h3>
                    <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{assistant.enabled ? 'Enabled' : 'Disabled'} · {assistant.providerOrder.join(' → ')} · temp {assistant.temperature}</p>
                    <Link href="/admin/assistant" className="mt-5 inline-flex rounded-xl border border-foreground/15 px-4 py-2.5 text-sm transition hover:bg-foreground/[0.05]">Edit assistant</Link>
                </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.5fr)]">
                <div className={`${panelClass} min-w-0 p-5 sm:p-6`}>
                    <div className="flex flex-col gap-3 border-b border-foreground/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Activity</p><h3 className="mt-2 text-lg font-semibold">Recent revisions</h3></div>
                        <Link href="/admin/revisions" className="text-sm text-muted-foreground transition hover:text-foreground">View history →</Link>
                    </div>
                    <div className="divide-y divide-foreground/10">
                        {recentRevisions.length ? recentRevisions.map((revision) => (
                            <div key={revision.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                    <p className="break-words text-sm text-foreground/85">{revision.note || `${revision.entityType} revision`}</p>
                                    <p className="mt-1 break-words text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">{revision.entityType} · {revision.user?.name ?? revision.user?.email ?? 'System'}</p>
                                </div>
                                <time className="text-xs text-muted-foreground sm:text-right">{revision.createdAt.toLocaleString('en-GB', { timeZone: settings?.timezone ?? 'Europe/Sofia' })}</time>
                            </div>
                        )) : <p className="py-8 text-sm text-muted-foreground">No revisions have been recorded yet.</p>}
                    </div>
                </div>

                <div className={`${panelClass} p-5 sm:p-6`}>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick access</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                        {[['New project', '/admin/projects/new'], ['New publication', '/admin/blog/new'], ['Manage media', '/admin/media'], ['AI Assistant', '/admin/assistant'], ['Site Mode', '/admin/site-mode'], ['Users & roles', '/admin/users']].map(([label, href]) => (
                            <Link key={href} href={href} className="min-w-0 rounded-xl border border-foreground/10 px-3 py-3 text-sm text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground">{label}</Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
