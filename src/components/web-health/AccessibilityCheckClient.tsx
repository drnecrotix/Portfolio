'use client';

import { useState, type FormEvent } from 'react';
import { Accessibility, Loader2 } from 'lucide-react';
import { HealthCheckRows, ScoreLine, WebHealthNav } from './WebHealthUi';
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm';
import type { AccessibilityReport } from '@/modules/web-health/types';

export function AccessibilityCheckClient() {
    const [url, setUrl] = useState('');
    const [report, setReport] = useState<AccessibilityReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function run(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || url.trim().length < 3) return;
        setLoading(true);
        setMessage('Inspecting static accessibility signals...');
        try {
            const response = await fetch('/api/accessibility-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            const payload = await response.json().catch(() => ({})) as { report?: AccessibilityReport; error?: string };
            if (!response.ok || !payload.report) throw new Error(payload.error || 'The page could not be checked.');
            setReport(payload.report);
            setMessage(`Accessibility sample completed in ${payload.report.responseTimeMs} ms.`);
        } catch (error) {
            setReport(null);
            setMessage(error instanceof Error ? error.message : 'The page could not be checked.');
        } finally {
            setLoading(false);
        }
    }

    const actionable = (report?.checks ?? []).filter((check) => check.status === 'warning' || check.status === 'fail').map((check) => ({ ...check, status: check.status as 'warning' | 'fail' }));

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl"><div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">NecrotixLab</span> / Web Health Suite / v1.2.61</div><h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Accessibility Check</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">A fast static HTML review for common accessibility signals. It is intentionally lightweight and does not pretend to replace keyboard, contrast or screen-reader testing.</p></header>
                <WebHealthNav active="accessibility" />

                <section className="mt-8 border-b border-border/80 pb-6">
                    <form onSubmit={run} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><label className="text-xs text-muted-foreground">Target URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-sky-500" /></label><button disabled={loading || url.trim().length < 3} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <Accessibility className="size-4" />}{loading ? 'Checking...' : 'Check accessibility'}</button></form>
                    <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">1 public HTML page · 512 KB cap · private networks blocked · no browser automation</p>
                    {message ? <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
                </section>

                {report ? <>
                    <ScoreLine score={report.score} right={<span>{report.stats.images} images · {report.stats.controls} controls · {report.stats.headings} headings</span>} />
                    <HealthCheckRows checks={report.checks} />
                    <ServiceRequestForm source="ACCESSIBILITY_CHECK" target={report.finalUrl} score={report.score} issues={actionable} snapshot={{ score: report.score, checkedAt: report.checkedAt, statusCode: report.statusCode, stats: report.stats, checks: report.checks }} />
                </> : <section className="mt-10 border-t border-border/80 pt-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Report area</p><p className="mt-3 text-sm text-muted-foreground">Enter a public HTML page to run the static accessibility review.</p></section>}

                <footer className="mt-12 border-t border-border/80 pt-5 text-xs leading-5 text-muted-foreground">Automated static checks cover only a subset of accessibility requirements. Manual keyboard, screen-reader, focus-order and visual contrast testing remains necessary. Results are not stored unless you explicitly create a service request.</footer>
            </div>
        </main>
    );
}
