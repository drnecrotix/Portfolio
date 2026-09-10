import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { updateServiceRequest } from './actions';

export const dynamic = 'force-dynamic';

const statuses = ['NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED', 'REJECTED'] as const;

function sourceLabel(source: string) {
    return source.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(cents: number | null | undefined, currency = 'EUR') {
    if (!cents) return '—';
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function issues(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Prisma.JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
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
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Audit-generated repair leads from the public Web Health Suite. Automated ranges are estimates only; set the final quote after manual review.</p>
                <div className="mt-5 flex gap-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40"><span>{requests.length} recent</span><span>{openCount} open</span></div>
            </header>

            {requests.length === 0 ? <p className="border-y border-dashed border-white/10 py-16 text-center text-sm text-white/35">No service requests yet.</p> : (
                <div className="border-y border-white/10">
                    {requests.map((request, index) => {
                        const selectedIssues = issues(request.selectedIssues);
                        return (
                            <details key={request.id} className={index ? 'border-t border-white/10' : ''}>
                                <summary className="grid cursor-pointer list-none gap-3 py-5 md:grid-cols-[150px_120px_minmax(0,1fr)_180px_130px] md:items-center">
                                    <div><p className="font-mono text-[10px] font-bold text-sky-300">{request.reference}</p><p className="mt-1 text-[10px] text-white/30">{request.createdAt.toLocaleString('en-GB')}</p></div>
                                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">{request.status.replaceAll('_', ' ')}</span>
                                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{request.target}</p><p className="mt-1 text-xs text-white/40">{sourceLabel(request.source)} · {selectedIssues.length} selected issue{selectedIssues.length === 1 ? '' : 's'}</p></div>
                                    <div><p className="text-sm">{request.customerName}</p><a href={`mailto:${request.customerEmail}`} className="text-xs text-sky-300 hover:underline">{request.customerEmail}</a></div>
                                    <div className="text-xs text-white/45"><p>Est. {money(request.estimateMinCents, request.currency)}-{money(request.estimateMaxCents, request.currency)}</p><p className="mt-1">Quote {money(request.finalQuoteCents, request.currency)}</p></div>
                                </summary>

                                <div className="border-t border-white/5 pb-7 pt-5 md:pl-[150px]">
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                                        <div>
                                            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">Selected audit findings</p>
                                            <div className="mt-3 border-y border-white/10">
                                                {selectedIssues.length ? selectedIssues.map((issue, issueIndex) => (
                                                    <div key={`${request.id}-${issueIndex}`} className={`grid gap-2 py-3 sm:grid-cols-[80px_180px_minmax(0,1fr)] ${issueIndex ? 'border-t border-white/5' : ''}`}>
                                                        <span className="font-mono text-[9px] font-bold uppercase text-amber-300">{String(issue.status ?? 'issue')}</span>
                                                        <span className="text-xs font-semibold">{String(issue.label ?? 'Finding')}</span>
                                                        <span className="text-xs leading-5 text-white/45">{String(issue.summary ?? '')}</span>
                                                    </div>
                                                )) : <p className="py-4 text-xs text-white/40">Manual review requested without selected automated findings.</p>}
                                            </div>
                                            <div className="mt-5 grid gap-3 text-xs text-white/45 sm:grid-cols-2"><p><strong className="text-white/65">CMS:</strong> {request.cms || 'Unknown'}</p><p><strong className="text-white/65">Access:</strong> {request.accessStatus || 'Not specified'}</p><p><strong className="text-white/65">Company:</strong> {request.company || '—'}</p><p><strong className="text-white/65">Budget:</strong> {money(request.budgetCents, request.currency)}</p></div>
                                            {request.customerMessage ? <div className="mt-5 border-l border-white/15 pl-4 text-sm leading-6 text-white/55">{request.customerMessage}</div> : null}
                                        </div>

                                        <form action={updateServiceRequest.bind(null, request.id)} className="border-l border-white/10 pl-0 lg:pl-6">
                                            <label className="block text-xs text-white/45">Status<select name="status" defaultValue={request.status} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30">{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
                                            <label className="mt-4 block text-xs text-white/45">Final quote, EUR<input name="finalQuote" type="number" min="0" max="10000" step="1" defaultValue={request.finalQuoteCents ? request.finalQuoteCents / 100 : ''} className="mt-2 w-full border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30" /></label>
                                            <label className="mt-4 block text-xs text-white/45">Internal notes<textarea name="internalNotes" rows={6} maxLength={5000} defaultValue={request.internalNotes ?? ''} className="mt-2 w-full border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-white/30" /></label>
                                            <button className="mt-4 bg-white px-4 py-2.5 text-xs font-bold text-black">Save request</button>
                                        </form>
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
