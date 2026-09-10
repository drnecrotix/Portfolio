import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseMonitoringState } from '@/modules/service-requests/monitoring';
import { SERVICE_PRICING } from '@/modules/service-requests/pricing';
import { serviceStatusUrl } from '@/modules/service-requests/status-access';
import { runServiceMonitoringNow, updateServiceMonitoring } from './actions';

export const dynamic = 'force-dynamic';

function money(cents: number | undefined, currency = 'EUR') {
    if (cents === undefined) return '-';
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function when(value: string | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-GB');
}

export default async function ServiceMonitoringAdminPage() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const requests = await prisma.serviceRequest.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 200,
    });
    const monitored = requests.map((request) => ({ request, monitoring: parseMonitoringState(request.auditSnapshot) })).filter((item) => item.monitoring !== null);
    const active = monitored.filter((item) => item.monitoring?.status === 'ACTIVE').length;
    const requested = monitored.filter((item) => item.monitoring?.status === 'REQUESTED').length;
    const schedulerConfigured = String(process.env.MONITORING_CRON_SECRET ?? '').trim().length >= 24;
    const defaultMonthlyPrice = SERVICE_PRICING.monthly.find((plan) => plan.id === 'monitor')?.price ?? 89;

    return (
        <div className="mx-auto max-w-7xl">
            <header className="mb-8 border-b border-white/10 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">Customer service</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">Service Monitoring</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Manage recurring Web Health checks requested after completed service work. Due checks run sequentially to keep the shared N0C workload bounded.</p>
                <div className="mt-5 flex flex-wrap gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                    <span>{monitored.length} plans</span><span>{requested} requested</span><span>{active} active</span>
                    <span className={schedulerConfigured ? 'text-emerald-300' : 'text-amber-300'}>{schedulerConfigured ? 'scheduler secret configured' : 'scheduler secret missing'}</span>
                </div>
            </header>

            {!schedulerConfigured ? (
                <div className="mb-7 border-y border-amber-300/20 py-4 text-xs leading-5 text-amber-100/70">
                    Set <code className="font-mono text-amber-200">MONITORING_CRON_SECRET</code> and configure PlanetHoster cron to POST to <code className="font-mono text-amber-200">/api/internal/service-monitoring</code>. Manual runs below work independently from cron.
                </div>
            ) : null}

            {monitored.length === 0 ? <p className="border-y border-dashed border-white/10 py-16 text-center text-sm text-white/35">No monitoring requests yet.</p> : (
                <div className="border-y border-white/10">
                    {monitored.map(({ request, monitoring }, index) => {
                        if (!monitoring) return null;
                        const statusUrl = serviceStatusUrl(request.reference, request.customerEmail);
                        const lastHistory = monitoring.history?.slice(-5).reverse() ?? [];
                        return (
                            <details key={request.id} className={index ? 'border-t border-white/10' : ''}>
                                <summary className="grid cursor-pointer list-none gap-3 py-5 md:grid-cols-[150px_110px_minmax(0,1fr)_150px_180px] md:items-center">
                                    <div><p className="font-mono text-[10px] font-bold text-sky-300">{request.reference}</p><p className="mt-1 text-[10px] text-white/30">{request.customerName}</p></div>
                                    <span className={`font-mono text-[9px] font-bold uppercase ${monitoring.status === 'ACTIVE' ? 'text-emerald-300' : monitoring.status === 'REQUESTED' ? 'text-amber-300' : 'text-white/45'}`}>{monitoring.status}</span>
                                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{request.target}</p><p className="mt-1 text-xs text-white/40">{monitoring.cadence.toLowerCase()} · {money(monitoring.priceCents, request.currency)}</p></div>
                                    <div className="text-xs text-white/45"><p>Score {monitoring.lastScore ?? monitoring.baselineScore ?? '-'}</p><p className="mt-1">Baseline {monitoring.baselineScore ?? '-'}</p></div>
                                    <div className="text-xs text-white/45"><p>Last {when(monitoring.lastRunAt)}</p><p className="mt-1">Next {when(monitoring.nextRunAt)}</p></div>
                                </summary>

                                <div className="border-t border-white/5 pb-7 pt-5 md:pl-[150px]">
                                    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
                                        <div>
                                            <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                                                <a href={statusUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Customer status</a>
                                                <a href={`mailto:${request.customerEmail}`} className="text-sky-300 hover:underline">{request.customerEmail}</a>
                                            </div>
                                            <p className="mt-5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Recent checks</p>
                                            <div className="mt-3 border-y border-white/10">
                                                {lastHistory.length ? lastHistory.map((entry, historyIndex) => (
                                                    <div key={`${entry.checkedAt}-${historyIndex}`} className={`grid gap-2 py-3 sm:grid-cols-[90px_90px_minmax(0,1fr)] ${historyIndex ? 'border-t border-white/5' : ''}`}>
                                                        <span className={`font-mono text-[9px] font-bold uppercase ${entry.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{entry.ok ? 'PASS' : 'ERROR'}</span>
                                                        <span className="text-xs font-semibold">{entry.score === undefined ? '-' : `${entry.score}/100`}</span>
                                                        <span className="text-xs text-white/45">{when(entry.checkedAt)}</span>
                                                    </div>
                                                )) : <p className="py-4 text-xs text-white/40">No recurring checks have run yet.</p>}
                                            </div>
                                            {monitoring.lastError ? <p className="mt-4 border-l border-rose-300/30 pl-4 text-xs leading-5 text-rose-200/70">Last error: {monitoring.lastError}</p> : null}
                                        </div>

                                        <div className="space-y-5 border-l border-white/10 pl-0 xl:pl-6">
                                            <form action={updateServiceMonitoring.bind(null, request.id)}>
                                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Monitoring plan</p>
                                                <label className="mt-4 block text-xs text-white/45">Status<select name="status" defaultValue={monitoring.status} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"><option value="REQUESTED">Requested</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="CANCELLED">Cancelled</option></select></label>
                                                <label className="mt-4 block text-xs text-white/45">Cadence<select name="cadence" defaultValue={monitoring.cadence} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option></select></label>
                                                <label className="mt-4 block text-xs text-white/45">Recurring price, EUR<input name="price" type="number" min="0" max="10000" step="1" defaultValue={(monitoring.priceCents ?? defaultMonthlyPrice * 100) / 100} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" /></label>
                                                <button className="mt-4 bg-white px-4 py-2.5 text-xs font-bold text-black">Save monitoring</button>
                                            </form>
                                            <form action={runServiceMonitoringNow.bind(null, request.id)} className="border-t border-white/10 pt-5">
                                                <p className="text-xs leading-5 text-white/40">Manual runs use the same bounded audit engine and update the latest score/history immediately.</p>
                                                <button className="mt-3 border border-sky-300/40 px-4 py-2.5 text-xs font-bold text-sky-200 hover:border-sky-200">Run check now</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
