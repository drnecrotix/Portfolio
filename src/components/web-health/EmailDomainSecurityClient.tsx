'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { HealthCheckRows, ScoreLine, WebHealthNav } from './WebHealthUi';
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm';
import type { EmailDomainReport } from '@/modules/web-health/types';

export function EmailDomainSecurityClient() {
    const [domain, setDomain] = useState('');
    const [selector, setSelector] = useState('');
    const [report, setReport] = useState<EmailDomainReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function run(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || domain.trim().length < 3) return;
        setLoading(true);
        setMessage('Checking public DNS mail records...');
        try {
            const response = await fetch('/api/email-domain-security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, selector }) });
            const payload = await response.json().catch(() => ({})) as { report?: EmailDomainReport; error?: string };
            if (!response.ok || !payload.report) throw new Error(payload.error || 'The domain could not be checked.');
            setReport(payload.report);
            setMessage('DNS check completed.');
        } catch (error) {
            setReport(null);
            setMessage(error instanceof Error ? error.message : 'The domain could not be checked.');
        } finally {
            setLoading(false);
        }
    }

    const actionable = (report?.checks ?? [])
        .filter((check) => check.status === 'warning' || check.status === 'fail')
        .map((check) => ({ ...check, status: check.status as 'warning' | 'fail' }));

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl"><div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">NecrotixLab</span> / Web Health Suite / v1.2.59</div><h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Email Domain Security</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Inspect public DNS signals used for mail delivery and spoofing protection: MX, SPF, DMARC, selector-specific DKIM, MTA-STS, TLS-RPT, CAA and BIMI.</p></header>
                <WebHealthNav active="email" />

                <section className="mt-8 border-b border-border/80 pb-6">
                    <form onSubmit={run} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                        <label className="text-xs text-muted-foreground">Domain<input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                        <label className="text-xs text-muted-foreground">DKIM selector <span className="opacity-60">optional</span><input value={selector} onChange={(event) => setSelector(event.target.value)} placeholder="default / selector1" className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-sky-500" /></label>
                        <button disabled={loading || domain.trim().length < 3} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}{loading ? 'Checking...' : 'Check domain'}</button>
                    </form>
                    <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">public DNS only · no mail sent · no credentials · DKIM requires a selector</p>
                    {message ? <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
                </section>

                {report ? <>
                    <ScoreLine score={report.score} right={<span>{report.domain} · {report.records.mx.length} MX record{report.records.mx.length === 1 ? '' : 's'}</span>} />
                    <HealthCheckRows checks={report.checks} />
                    <ServiceRequestForm source="EMAIL_DOMAIN_SECURITY" target={report.domain} score={report.score} issues={actionable} snapshot={{ checkedAt: report.checkedAt, records: report.records }} />
                </> : <section className="mt-10 border-t border-border/80 pt-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Report area</p><p className="mt-3 text-sm text-muted-foreground">Enter a domain to inspect its public mail-security posture.</p></section>}

                <footer className="mt-12 border-t border-border/80 pt-5 text-xs leading-5 text-muted-foreground">This tool reads public DNS records only. Results are configuration signals, not a guarantee that mail is deliverable or immune to spoofing. Scan results are not stored unless you explicitly create a service request.</footer>
            </div>
        </main>
    );
}
