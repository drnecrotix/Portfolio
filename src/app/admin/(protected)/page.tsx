import Link from 'next/link';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CheckCircle2, CircleDot, Database, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { StatusToast } from '@/components/admin/StatusToast';
import { PortfolioUpdater, type PortfolioUpdateStatus } from '@/components/admin/PortfolioUpdater';
import { TrafficAnalyticsPanel } from '@/components/admin/TrafficAnalyticsPanel';
import { installedPortfolioVersion } from '@/lib/installed-version';
import { TRAFFIC_METRIC_RETENTION_DAYS, TRAFFIC_SESSION_RETENTION_HOURS } from '@/lib/traffic-analytics';
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
    const [projects, posts, pages, media, drafts, settings, siteMode] = await prisma.$transaction([
        prisma.project.count(),
        prisma.post.count(),
        prisma.page.count(),
        prisma.mediaAsset.count(),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.siteModeSettings.findUnique({ where: { id: 'default' } }),
    ]);

    const contentStats = [
        ['Projects', projects],
        ['Posts', posts],
        ['Pages', pages],
        ['Media', media],
        ['Draft posts', drafts],
    ] as const;

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

            <section className="mb-5">
                <PortfolioUpdater currentVersion={currentVersion} initialStatus={updateStatus} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.45fr)]">
                <TrafficAnalyticsPanel
                    chartMode="weekday"
                    title="Traffic overview"
                    description="Interactive weekday traffic pattern. Compare page views and visits across the week using the last 7 or 30 days."
                />

                <div className="space-y-4">
                    <div className={`${panelClass} p-5 sm:p-6`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Site health</p>
                                <h3 className="mt-2 text-lg font-semibold">Production status</h3>
                            </div>
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">Healthy</span>
                        </div>

                        <div className="mt-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-500" /> Application</span><span className="font-medium">Online</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><Database className="size-4 text-emerald-500" /> Database</span><span className="font-medium">Connected</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><CircleDot className="size-4" /> Site mode</span><span className="font-mono text-xs">{siteMode?.mode ?? 'NORMAL'}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-4" /> Version</span><span className="font-mono text-xs">v{currentVersion}</span></div>
                        </div>

                        <div className="mt-5 border-t border-foreground/10 pt-5">
                            <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Content snapshot</p><span className="text-[10px] text-muted-foreground">Current totals</span></div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {contentStats.map(([label, value], index) => (
                                    <div key={label} className={`${index === contentStats.length - 1 ? 'col-span-2' : ''} rounded-xl border border-foreground/10 bg-background/45 px-3 py-3`}>
                                        <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><span className="text-lg font-semibold tabular-nums">{value}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-foreground/10 bg-background/40 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
                            Traffic aggregates expire after about {TRAFFIC_METRIC_RETENTION_DAYS} days. Anonymous live-session hashes expire after about {TRAFFIC_SESSION_RETENTION_HOURS} hours.
                        </div>

                        <form action={purgeApplicationCache} className="mt-4">
                            <button className="w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.05]">Purge public cache</button>
                        </form>
                    </div>

                    <div className={`${panelClass} p-5 sm:p-6`}>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Quick access</p>
                        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
                            {[
                                ['New project', '/admin/projects/new'],
                                ['New publication', '/admin/blog/new'],
                                ['Manage media', '/admin/media'],
                                ['Experiments', '/admin/experiments'],
                                ['Revision history', '/admin/revisions'],
                                ['AI Assistant', '/admin/assistant'],
                                ['Site Mode', '/admin/site-mode'],
                                ['Users & roles', '/admin/users'],
                            ].map(([label, href]) => (
                                <Link key={href} href={href} className="min-w-0 rounded-xl border border-foreground/10 px-3 py-3 text-sm text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground">{label}</Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
