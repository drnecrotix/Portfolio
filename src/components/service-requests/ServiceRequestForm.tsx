'use client';

import { useState, type FormEvent } from 'react';
import { ExternalLink, Loader2, Wrench } from 'lucide-react';
import { estimateServiceRange, type ServiceRequestIssue, type ServiceRequestSource } from '@/modules/service-requests/estimate';

export function ServiceRequestForm({
    source,
    target,
    score,
    issues,
    snapshot,
    defaultCms = 'Unknown',
}: {
    source: ServiceRequestSource;
    target: string;
    score?: number;
    issues: ServiceRequestIssue[];
    snapshot?: Record<string, unknown>;
    defaultCms?: string;
}) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(() => new Set(issues.map((issue) => issue.id)));
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [reference, setReference] = useState('');
    const [statusUrl, setStatusUrl] = useState('');
    const [startedAt, setStartedAt] = useState(() => Date.now());
    const [cms, setCms] = useState(defaultCms);
    const [accessStatus, setAccessStatus] = useState('Need guidance');
    const selectedIssues = issues.filter((issue) => selected.has(issue.id));
    const estimate = estimateServiceRange(source, selectedIssues, { cms, accessStatus });

    function toggle(id: string) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function openForm() {
        setStartedAt(Date.now());
        setOpen(true);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading) return;
        const form = new FormData(event.currentTarget);
        setLoading(true);
        setMessage('Sending service request...');
        setReference('');
        setStatusUrl('');
        try {
            const response = await fetch('/api/service-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    target,
                    score,
                    issues: selectedIssues,
                    snapshot,
                    name: form.get('name'),
                    email: form.get('email'),
                    company: form.get('company'),
                    cms,
                    accessStatus,
                    budget: form.get('budget'),
                    message: form.get('message'),
                    privacyAccepted: form.get('privacyAccepted') === 'on',
                    website: form.get('website'),
                    startedAt,
                }),
            });
            const payload = await response.json().catch(() => ({})) as {
                reference?: string;
                statusUrl?: string;
                confirmationEmailSent?: boolean;
                error?: string;
                estimate?: { min: number; max: number };
            };
            if (!response.ok || !payload.reference) throw new Error(payload.error || 'The service request could not be created.');
            setReference(payload.reference);
            setStatusUrl(payload.statusUrl || '');
            setMessage(payload.confirmationEmailSent
                ? `Request ${payload.reference} was created and a confirmation email was sent. I will review the audit before confirming a final quote.`
                : `Request ${payload.reference} was created, but the confirmation email could not be delivered. Save the private status link below while I review the audit.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'The service request could not be created.');
        } finally {
            setLoading(false);
        }
    }

    if (!open) {
        return (
            <div className="mt-10 border-t border-border/80 pt-5">
                <button type="button" onClick={openForm} className="inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground">
                    <Wrench className="size-4" /> Request a professional fix
                </button>
                <p className="mt-2 text-xs text-muted-foreground">Current automated estimate: €{estimate.min}-€{estimate.max}. It is based on the selected findings and is refined by CMS/access details before submission. <a href="/services/pricing" className="font-semibold text-sky-500 hover:underline">View EUR pricing guide</a>.</p>
            </div>
        );
    }

    return (
        <section className="mt-10 border-y border-border/80 py-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-sky-500">Kreatrics service request</p><h2 className="mt-2 text-2xl font-black tracking-tight">Request a professional fix</h2></div>
                <div className="text-right"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Estimate €{estimate.min}-€{estimate.max}</p><a href="/services/pricing" className="mt-1 inline-block text-[10px] font-semibold text-sky-500 hover:underline">EUR pricing guide</a></div>
            </div>

            {issues.length ? (
                <div className="mt-6 border-y border-border/60">
                    {issues.map((issue, index) => (
                        <label key={issue.id} className={`grid cursor-pointer gap-2 py-3 sm:grid-cols-[28px_90px_minmax(0,1fr)] sm:items-start ${index ? 'border-t border-border/50' : ''}`}>
                            <input type="checkbox" checked={selected.has(issue.id)} onChange={() => toggle(issue.id)} className="mt-0.5 size-4" />
                            <span className={`font-mono text-[9px] font-black uppercase tracking-[0.1em] ${issue.status === 'fail' ? 'text-rose-500' : 'text-amber-500'}`}>{issue.status}</span>
                            <span><span className="text-sm font-semibold">{issue.label}</span><span className="ml-2 text-xs text-muted-foreground">{issue.summary}</span></span>
                        </label>
                    ))}
                </div>
            ) : <p className="mt-5 text-sm text-muted-foreground">No automated warning or failure is selected. You can still request a manual review.</p>}

            <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Name<input name="name" required minLength={2} maxLength={80} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                <label className="text-xs text-muted-foreground">Email<input name="email" required type="email" maxLength={200} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                <label className="text-xs text-muted-foreground">Company / project <span className="opacity-60">optional</span><input name="company" maxLength={120} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                <label className="text-xs text-muted-foreground">CMS / technology<select name="cms" value={cms} onChange={(event) => setCms(event.target.value)} className="mt-2 w-full border-0 border-b border-border bg-background py-2 text-sm text-foreground outline-none focus:border-sky-500"><option>Unknown</option><option>WordPress</option><option>WooCommerce</option><option>Next.js</option><option>Shopify</option><option>Custom</option><option>Other</option></select></label>
                <label className="text-xs text-muted-foreground">Access available?<select name="accessStatus" value={accessStatus} onChange={(event) => setAccessStatus(event.target.value)} className="mt-2 w-full border-0 border-b border-border bg-background py-2 text-sm text-foreground outline-none focus:border-sky-500"><option>Need guidance</option><option>Hosting access available</option><option>CMS admin access available</option><option>Both available</option><option>No access yet</option></select></label>
                <label className="text-xs text-muted-foreground">Budget <span className="opacity-60">optional, EUR</span><input name="budget" type="number" min="0" max="10000" step="1" className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                <p className="sm:col-span-2 text-[11px] leading-5 text-muted-foreground">Estimate basis: finding-specific complexity, WARN/FAIL severity, bounded affected-item volume, CMS/technology and access availability. Your entered budget does not change the automated estimate.</p>
                <label className="sm:col-span-2 text-xs text-muted-foreground">Notes <span className="opacity-60">optional</span><textarea name="message" maxLength={1500} rows={4} className="mt-2 w-full border border-border bg-transparent p-3 text-sm text-foreground outline-none focus:border-sky-500" placeholder="Anything I should know before reviewing the site?" /></label>
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground sm:col-span-2"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4" /><span>I agree that the selected audit details and contact information may be stored to process this service request. Ordinary scans remain unstored.</span></label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <button disabled={loading} className="inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}{loading ? 'Sending...' : 'Create request'}</button>
                    {!reference ? <button type="button" onClick={() => setOpen(false)} className="px-3 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground">Cancel</button> : null}
                </div>
            </form>
            {message ? <p role="status" className={`mt-5 text-sm ${reference ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{message}</p> : null}
            {statusUrl ? <a href={statusUrl} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-500 hover:underline">Open private status page <ExternalLink className="size-3" /></a> : null}
        </section>
    );
}
