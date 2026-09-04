import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AlertTriangle, CheckCircle2, CircleDot, Database, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PortfolioUpdater, type PortfolioUpdateStatus } from '@/components/admin/PortfolioUpdater';
import { PurgeCacheButton } from '@/components/admin/PurgeCacheButton';
import { TrafficAnalyticsPanel } from '@/components/admin/TrafficAnalyticsPanel';
import { installedPortfolioVersion } from '@/lib/installed-version';
import { TRAFFIC_IP_RETENTION_HOURS, TRAFFIC_METRIC_RETENTION_DAYS } from '@/lib/traffic-analytics';

export const dynamic = 'force-dynamic';

function readUpdateStatus(): PortfolioUpdateStatus | null {
    try {
        const file = join(process.cwd(), 'tmp', 'update-status.json');
        return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as PortfolioUpdateStatus : null;
    } catch { return null; }
}

const panelClass = 'rounded-2xl border border-foreground/10 bg-foreground/[0.025]';

export default async function AdminDashboardPage() {
    let projects: number | null = null;
    let posts: number | null = null;
    let pages: number | null = null;
    let media: number | null = null;
    let drafts: number | null = null;
    let settings: { siteName: string } | null = null;
    let siteMode: { mode: string } | null = null;
    let databaseHealthy = false;

    try {
        const result = await prisma.$transaction([
            prisma.project.count(),
            prisma.post.count(),
            prisma.page.count(),
            prisma.mediaAsset.count(),
            prisma.post.count({ where: { status: 'DRAFT' } }),
            prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { siteName: true } }),
            prisma.siteModeSettings.findUnique({ where: { id: 'default' }, select: { mode: true } }),
        ]);

        [projects, posts, pages, media, drafts, settings, siteMode] = result;
        databaseHealthy = true;
    } catch {
        // Keep the control center renderable when the database is unavailable so
        // the health panel can report the failure instead of claiming success.
    }

    const contentStats: Array<[string, number | null]> = [
        ['Projects', projects],
        ['Posts', posts],
        ['Pages', pages],
        ['Media', media],
        ['Draft posts', drafts],
    ];

    const updateStatus = readUpdateStatus();
    const currentVersion = installedPortfolioVersion();
    const siteModeLabel = siteMode?.mode ?? (databaseHealthy ? 'NORMAL' : 'UNKNOWN');

    return (
        <div className="mx-auto max-w-[1500px]">
            <header className="mb-6 flex flex-col gap-4 border-b border-foreground/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">Control center</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h2>
                </div>
                <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">{settings?.siteName ?? 'Dr Necrotix'}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">Site mode: {siteModeLabel} · v{currentVersion}</p>
                </div>
            </header>

            <section className="mb-5">
                <TrafficAnalyticsPanel
                    chartMode="weekday"
                    refreshIntervalMs={15000}
                    title="Traffic overview"
                    description="Weekly browsing pattern with live traffic, session depth, country coverage and device distribution."
                />
            </section>

            <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                <div className="min-w-0">
                    <PortfolioUpdater currentVersion={currentVersion} initialStatus={updateStatus} />
                </div>

                <div className={`${panelClass} p-5 sm:p-6`}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Site health</p>
                            <h3 className="mt-2 text-lg font-semibold">Production status</h3>
                        </div>
                        <span className={databaseHealthy
                            ? 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400'
                            : 'rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300'}>
                            {databaseHealthy ? 'Healthy' : 'Degraded'}
                        </span>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-500" /> Application</span><span className="font-medium">Online</span></div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                                {databaseHealthy ? <Database className="size-4 text-emerald-500" /> : <AlertTriangle className="size-4 text-amber-500" />}
                                Database
                            </span>
                            <span className={databaseHealthy ? 'font-medium' : 'font-medium text-amber-700 dark:text-amber-300'}>{databaseHealthy ? 'Connected' : 'Unavailable'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><CircleDot className="size-4" /> Site mode</span><span className="font-mono text-xs">{siteModeLabel}</span></div>
                        <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-4" /> Version</span><span className="font-mono text-xs">v{currentVersion}</span></div>
                    </div>

                    {!databaseHealthy ? (
                        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                            The dashboard could not complete its database health query. Content totals and database-backed controls may be unavailable until the connection recovers.
                        </div>
                    ) : null}

                    <div className="mt-5 border-t border-foreground/10 pt-5">
                        <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Content snapshot</p><span className="text-[10px] text-muted-foreground">Current totals</span></div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {contentStats.map(([label, value], index) => (
                                <div key={label} className={`${index === contentStats.length - 1 ? 'col-span-2' : ''} rounded-xl border border-foreground/10 bg-background/45 px-3 py-3`}>
                                    <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span><span className="text-lg font-semibold tabular-nums">{value ?? '—'}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-foreground/10 bg-background/40 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
                        Country/device aggregates expire after about {TRAFFIC_METRIC_RETENTION_DAYS} days. Short-lived traffic session rows, including raw IP used only for country fallback, expire after about {TRAFFIC_IP_RETENTION_HOURS} hours.
                    </div>

                    <div className="mt-4">
                        <PurgeCacheButton />
                    </div>
                </div>
            </section>
        </div>
    );
}
