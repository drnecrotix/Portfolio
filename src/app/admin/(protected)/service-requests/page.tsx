import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { serviceStatusUrl } from '@/modules/service-requests/status-access';
import { captureAfterAudit, sendServiceQuote, updateServiceRequest } from './actions';

export const dynamic = 'force-dynamic';

const statuses = ['NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED', 'REJECTED'] as const;

function sourceLabel(source: string) {
    return source.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(cents: number | null | undefined, currency = 'EUR') {
    if (!cents) return '-';
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function issues(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Prisma.JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
}

function object(value: Prisma.JsonValue | null): Prisma.JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.JsonObject : {};
}

function reportScore(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const score = Number((value as Record<string, unknown>).score);
    return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

export default async function ServiceRequestsAdminPage() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const requests = await prisma.serviceRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    const openCount = requests.filter((request) => !['COMPLETED', 'REJECTED'].includes(request.status)).length;

    return (
        <div className="mx-auto max-w-7xl">
            <header className="mb-8 border-b border-white/10 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">Customer service</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">Service Requests</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Review Web Health remediation leads and website project requests, send final quotes, track acceptance and manage delivery from the same workflow.</p>
                <div className="mt-5 flex gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40"><span>{requests.length} recent</span><span>{openCount} open</span></div>
            </header>

            {requests.length === 0 ? <p className="border-y border-dashed border-white/10 py-16 text-center text-sm text-white/35">No service requests yet.</p> : (
                <div id="service-request-list" className="scroll-mt-24 border-y border-white/10">
                    {requests.map((request, index) => {
                        const selectedIssues = issues(request.selectedIssues);
                        const snapshot = object(request.auditSnapshot);
                        const afterScore = reportScore(snapshot.after);
                        const monitoring = object((snapshot.monitoring ?? null) as Prisma.JsonValue | null);
                        const planning = object((snapshot.planning ?? null) as Prisma.JsonValue | null);
                        const weeks = object((planning.weeks ?? null) as Prisma.JsonValue | null);
                        const statusUrl = serviceStatusUrl(request.reference, request.customerEmail);
                        const isWebsiteProject = request.source === 'WEBSITE_CREATION';
                        const noun = isWebsiteProject ? 'scope item' : 'issue';

                        return (
                            <details key={request.id} className={index ? 'border-t border-white/10' : ''}>
                                <summary className="grid cursor-pointer list-none gap-3 py-5 md:grid-cols-[150px_120px_minmax(0,1fr)_180px_150px] md:items-center">
                                    <div><p className="font-mono text-[10px] font-bold text-sky-300">{request.reference}</p><p className="mt-1 text-[10px] text-white/30">{request.createdAt.toLocaleString('en-GB')}</p></div>
                                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">{request.status.replaceAll('_', ' ')}</span>
                                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{request.target}</p><p className="mt-1 text-xs text-white/40">{sourceLabel(request.source)} · {selectedIssues.length} {noun}{selectedIssues.length === 1 ? '' : 's'}</p></div>
                                    <div><p className="text-sm">{request.customerName}</p><a href={`mailto:${request.customerEmail}`} className="text-xs text-sky-300 hover:underline">{request.customerEmail}</a></div>
                                    <div className="text-xs text-white/45"><p>Quote {money(request.finalQuoteCents, request.currency)}</p>{isWebsiteProject ? <p className="mt-1">Est. {money(request.estimateMinCents, request.currency)}-{money(request.estimateMaxCents, request.currency)}</p> : <p className="mt-1">Audit {request.scanScore ?? '-'} → {afterScore ?? '-'}</p>}</div>
                                </summary>

                                <div className="border-t border-white/5 pb-7 pt-5 md:pl-[150px]">
                                    <div className="mb-5 flex flex-wrap items-center gap-3">
                                        <a href="/admin/service-requests#service-request-list" className="inline-flex items-center border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white">← Back to service requests</a>
                                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/25">{request.reference}</span>
                                    </div>
                                    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
                                        <div>
                                            <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                                                <a href={statusUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Open customer status</a>
                                                {monitoring.requested === true ? <span className="text-emerald-300">Monitoring requested · {String(monitoring.cadence ?? 'monthly').toLowerCase()}</span> : null}
                                                {isWebsiteProject && weeks.min && weeks.max ? <span>Planning · {String(weeks.min)}-{String(weeks.max)} weeks</span> : null}
                                            </div>
                                            <p className="mt-5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">{isWebsiteProject ? 'Project scope' : 'Selected audit findings'}</p>
                                            <div className="mt-3 border-y border-white/10">
                                                {selectedIssues.length ? selectedIssues.map((issue, issueIndex) => (
                                                    <div key={`${request.id}-${issueIndex}`} className={`grid gap-2 py-3 sm:grid-cols-[80px_180px_minmax(0,1fr)] ${issueIndex ? 'border-t border-white/5' : ''}`}>
                                                        <span className={`font-mono text-[9px] font-bold uppercase ${String(issue.status) === 'scope' ? 'text-sky-300' : 'text-amber-300'}`}>{String(issue.status ?? (isWebsiteProject ? 'scope' : 'issue'))}</span>
                                                        <span className="text-xs font-semibold">{String(issue.label ?? (isWebsiteProject ? 'Scope item' : 'Finding'))}</span>
                                                        <span className="text-xs leading-5 text-white/45">{String(issue.summary ?? '')}</span>
                                                    </div>
                                                )) : <p className="py-4 text-xs text-white/40">{isWebsiteProject ? 'No project scope was stored.' : 'Manual review requested without selected automated findings.'}</p>}
                                            </div>
                                            <div className="mt-5 grid gap-3 text-xs text-white/45 sm:grid-cols-2"><p><strong className="text-white/65">CMS:</strong> {request.cms || 'Unknown'}</p><p><strong className="text-white/65">Access / hosting:</strong> {request.accessStatus || 'Not specified'}</p><p><strong className="text-white/65">Company:</strong> {request.company || '-'}</p><p><strong className="text-white/65">Budget:</strong> {money(request.budgetCents, request.currency)}</p></div>
                                            {request.customerMessage ? <div className="mt-5 border-l border-white/15 pl-4 text-sm leading-6 text-white/55">{request.customerMessage}</div> : null}

                                            {!isWebsiteProject ? <div className="mt-7 border-t border-white/10 pt-5">
                                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Before / after verification</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm"><span>Before <strong className="ml-1 text-white">{request.scanScore ?? '-'}</strong></span><span>After <strong className="ml-1 text-white">{afterScore ?? 'Pending'}</strong></span>{request.scanScore !== null && afterScore !== null ? <span className={afterScore >= request.scanScore ? 'text-emerald-300' : 'text-amber-300'}>{afterScore >= request.scanScore ? '+' : ''}{afterScore - request.scanScore} points</span> : null}</div>
                                                <form action={captureAfterAudit.bind(null, request.id)} className="mt-4"><button className="border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white">Run & capture after audit</button></form>
                                            </div> : <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-white/45"><strong className="text-white/65">After launch:</strong> save the live HTTP(S) URL in Internal workflow before completing the request if recurring maintenance or monitoring may be activated.</div>}
                                        </div>

                                        <div className="space-y-6 border-l border-white/10 pl-0 xl:pl-6">
                                            <form action={updateServiceRequest.bind(null, request.id)}>
                                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Internal workflow</p>
                                                {isWebsiteProject ? <label className="mt-4 block text-xs text-white/45">Project target / live URL<input name="target" required minLength={3} maxLength={2048} defaultValue={request.target} placeholder="https://example.com" className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" /><span className="mt-1 block text-[10px] leading-4 text-white/30">Before recurring monitoring is activated, replace the project name or desired domain with the final live HTTP(S) URL.</span></label> : null}
                                                <label className="mt-4 block text-xs text-white/45">Status<select name="status" defaultValue={request.status} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30">{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
                                                <label className="mt-4 block text-xs text-white/45">Final quote, EUR<input name="finalQuote" type="number" min="0" max="50000" step="1" defaultValue={request.finalQuoteCents ? request.finalQuoteCents / 100 : ''} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" /></label>
                                                <label className="mt-4 block text-xs text-white/45">Internal notes<textarea name="internalNotes" rows={5} maxLength={5000} defaultValue={request.internalNotes ?? ''} className="mt-2 w-full border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-white/30" /></label>
                                                <button className="mt-4 bg-white px-4 py-2.5 text-xs font-bold text-black">Save request</button>
                                            </form>

                                            <form action={sendServiceQuote.bind(null, request.id)} className="border-t border-white/10 pt-5">
                                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-sky-300">Customer quote</p>
                                                <label className="mt-3 block text-xs text-white/45">Final quote, EUR<input name="finalQuote" required type="number" min="1" max="50000" step="1" defaultValue={request.finalQuoteCents ? request.finalQuoteCents / 100 : ''} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" /></label>
                                                <label className="mt-3 block text-xs text-white/45">Customer note<textarea name="quoteNote" rows={4} maxLength={1500} className="mt-2 w-full border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-white/30" placeholder="Scope, assumptions, next steps..." /></label>
                                                <button className="mt-4 border border-sky-300/40 px-4 py-2.5 text-xs font-bold text-sky-200 hover:border-sky-200">Send final quote</button>
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
