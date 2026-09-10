import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseMonitoringState } from '@/modules/service-requests/monitoring';
import { verifyServiceStatusToken } from '@/modules/service-requests/status-access';
import { customerServiceAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Service request status',
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

type Props = {
    params: Promise<{ reference: string }>;
    searchParams: Promise<{ token?: string }>;
};

function money(cents: number | null | undefined, currency = 'EUR') {
    if (cents === null || cents === undefined) return '-';
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function object(value: Prisma.JsonValue | null): Prisma.JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.JsonObject : {};
}

function scoreFrom(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const score = Number((value as Record<string, unknown>).score);
    return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

function sourceLabel(value: string) {
    return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value: string | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-GB');
}

const steps = ['NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED'] as const;

export default async function ServiceRequestStatusPage({ params, searchParams }: Props) {
    const [{ reference }, query] = await Promise.all([params, searchParams]);
    const token = String(query.token ?? '');
    const request = await prisma.serviceRequest.findUnique({ where: { reference } });
    if (!request || !verifyServiceStatusToken(request.reference, request.customerEmail, token)) notFound();

    const snapshot = object(request.auditSnapshot);
    const before = snapshot.before;
    const after = snapshot.after;
    const beforeScore = request.scanScore ?? scoreFrom(before);
    const afterScore = scoreFrom(after);
    const monitoring = parseMonitoringState(request.auditSnapshot);
    const selectedIssues = Array.isArray(request.selectedIssues) ? request.selectedIssues.filter((item): item is Prisma.JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
    const stepIndex = request.status === 'REJECTED' ? -1 : Math.max(0, steps.indexOf(request.status as typeof steps[number]));

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-5xl">
                <header className="border-b border-border/80 pb-6">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-sky-500">Kreatrics customer service</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{request.reference}</h1><p className="mt-2 text-sm text-muted-foreground">{sourceLabel(request.source)} · {request.target}</p></div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">{request.status.replaceAll('_', ' ')}</span>
                    </div>
                </header>

                <section className="grid border-b border-border/80 md:grid-cols-[1fr_1fr_1fr]">
                    <Metric label="Created" value={request.createdAt.toLocaleString('en-GB')} />
                    <Metric label="Automated estimate" value={`${money(request.estimateMinCents, request.currency)}-${money(request.estimateMaxCents, request.currency)}`} />
                    <Metric label="Final quote" value={money(request.finalQuoteCents, request.currency)} />
                </section>

                <section className="border-b border-border/80 py-6">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Progress</p>
                    {request.status === 'REJECTED' ? <p className="mt-3 text-sm text-rose-500">This request was closed without proceeding.</p> : (
                        <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
                            {steps.map((step, index) => <div key={step} className="border-t border-border/80 pt-2"><span className={`font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${index <= stepIndex ? 'text-sky-500' : 'text-muted-foreground/50'}`}>{step.replaceAll('_', ' ')}</span></div>)}
                        </div>
                    )}
                </section>

                {(beforeScore !== null || afterScore !== null) ? (
                    <section className="grid border-b border-border/80 md:grid-cols-2">
                        <div className="py-6 md:border-r md:border-border/80 md:pr-6"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Before audit</p><p className="mt-2 text-4xl font-black tracking-[-0.06em]">{beforeScore ?? '-'}<span className="ml-1 text-xs text-muted-foreground">/100</span></p></div>
                        <div className="py-6 md:pl-6"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">After audit</p><p className="mt-2 text-4xl font-black tracking-[-0.06em]">{afterScore ?? 'Pending'}{afterScore !== null ? <span className="ml-1 text-xs text-muted-foreground">/100</span> : null}</p>{beforeScore !== null && afterScore !== null ? <p className={`mt-2 text-xs font-semibold ${afterScore >= beforeScore ? 'text-emerald-500' : 'text-amber-500'}`}>{afterScore >= beforeScore ? '+' : ''}{afterScore - beforeScore} points</p> : null}</div>
                    </section>
                ) : null}

                <section className="border-b border-border/80 py-6">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Selected findings</p>
                    <div className="mt-3 border-y border-border/60">
                        {selectedIssues.length ? selectedIssues.map((issue, index) => (
                            <div key={index} className={`grid gap-2 py-3 sm:grid-cols-[80px_200px_minmax(0,1fr)] ${index ? 'border-t border-border/50' : ''}`}>
                                <span className="font-mono text-[9px] font-bold uppercase text-amber-500">{String(issue.status ?? 'issue')}</span>
                                <span className="text-xs font-semibold">{String(issue.label ?? 'Finding')}</span>
                                <span className="text-xs leading-5 text-muted-foreground">{String(issue.summary ?? '')}</span>
                            </div>
                        )) : <p className="py-4 text-xs text-muted-foreground">Manual review request.</p>}
                    </div>
                </section>

                {request.status === 'QUOTE_SENT' && request.finalQuoteCents ? (
                    <section className="border-b border-border/80 py-6">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-sky-500">Quote ready</p>
                        <p className="mt-2 text-2xl font-black">{money(request.finalQuoteCents, request.currency)}</p>
                        <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">Accepting confirms that you want the work to proceed at the quoted price. Payment and access arrangements are handled separately.</p>
                        <form action={customerServiceAction} className="mt-4"><input type="hidden" name="reference" value={request.reference} /><input type="hidden" name="token" value={token} /><input type="hidden" name="action" value="accept_quote" /><button className="border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground">Accept quote</button></form>
                    </section>
                ) : null}

                {request.status === 'COMPLETED' ? (
                    <section className="border-b border-border/80 py-6">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-sky-500">Website care</p>
                        <h2 className="mt-2 text-xl font-black">Keep the result healthy</h2>
                        {!monitoring ? (
                            <form action={customerServiceAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="reference" value={request.reference} /><input type="hidden" name="token" value={token} /><input type="hidden" name="action" value="request_monitoring" /><label className="text-xs text-muted-foreground">Frequency<select name="cadence" defaultValue="monthly" className="ml-2 border border-border bg-background px-3 py-2 text-foreground"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label><button className="border border-foreground px-4 py-2 text-xs font-bold">Request monitoring</button></form>
                        ) : (
                            <div className="mt-4 border-y border-border/60">
                                <div className="grid gap-3 py-4 sm:grid-cols-[120px_1fr_1fr_1fr]">
                                    <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Status</p><p className="mt-1 text-xs font-bold">{monitoring.status}</p></div>
                                    <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Cadence</p><p className="mt-1 text-xs font-semibold">{monitoring.cadence.toLowerCase()}</p></div>
                                    <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Last check</p><p className="mt-1 text-xs font-semibold">{when(monitoring.lastRunAt)}</p></div>
                                    <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Next check</p><p className="mt-1 text-xs font-semibold">{monitoring.status === 'ACTIVE' ? when(monitoring.nextRunAt) : '-'}</p></div>
                                </div>
                                <div className="border-t border-border/50 py-4 text-xs leading-5 text-muted-foreground">
                                    {monitoring.status === 'REQUESTED' ? 'Your monitoring request is awaiting review. Recurring checks do not start until the plan is activated.' : null}
                                    {monitoring.status === 'ACTIVE' ? `Monitoring is active${monitoring.priceCents !== undefined ? ` at ${money(monitoring.priceCents, request.currency)} per billing period` : ''}. Latest score: ${monitoring.lastScore ?? monitoring.baselineScore ?? '-'}/100.` : null}
                                    {monitoring.status === 'PAUSED' ? 'Recurring checks are paused. No scheduled run will occur until the plan is activated again.' : null}
                                    {monitoring.status === 'CANCELLED' ? 'Monitoring has been cancelled. No further scheduled checks will run.' : null}
                                    {monitoring.lastError ? <span className="mt-2 block text-rose-500">Last monitoring error: {monitoring.lastError}</span> : null}
                                </div>
                            </div>
                        )}
                    </section>
                ) : null}

                <footer className="pt-6 text-xs leading-5 text-muted-foreground">This is a private status link. Do not share it publicly. Automated estimates and audit scores are informational until a final quote and manual review are provided.</footer>
            </div>
        </main>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="border-b border-border/60 py-5 last:border-b-0 md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0"><p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
