'use client';

import { useState, type FormEvent } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { HealthCheckRows, ScoreLine, WebHealthNav } from './WebHealthUi';
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm';
import type { SiteCrawlReport } from '@/modules/web-health/types';

export function SiteCrawlClient() {
    const [url, setUrl] = useState('');
    const [report, setReport] = useState<SiteCrawlReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function run(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || url.trim().length < 3) return;
        setLoading(true);
        setMessage('Crawling a bounded same-origin sample...');
        try {
            const response = await fetch('/api/site-crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
            const payload = await response.json().catch(() => ({})) as { report?: SiteCrawlReport; error?: string };
            if (!response.ok || !payload.report) throw new Error(payload.error || 'The site could not be crawled.');
            setReport(payload.report);
            setMessage(`Crawl completed across ${payload.report.pages.length} page${payload.report.pages.length === 1 ? '' : 's'}.`);
        } catch (error) {
            setReport(null);
            setMessage(error instanceof Error ? error.message : 'The site could not be crawled.');
        } finally {
            setLoading(false);
        }
    }

    const actionable = (report?.checks ?? []).filter((check) => check.status === 'warning' || check.status === 'fail').map((check) => ({ ...check, status: check.status as 'warning' | 'fail' }));

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl"><div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">NecrotixLab</span> / Web Health Suite / v1.2.61</div><h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Site Crawl / Broken Links</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">A deliberately bounded same-origin crawl that samples internal pages, broken targets, redirects and title hygiene without turning the shared host into a large crawler.</p></header>
                <WebHealthNav active="crawl" />

                <section className="mt-8 border-b border-border/80 pb-6"><form onSubmit={run} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><label className="text-xs text-muted-foreground">Start URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="mt-2 w-full border-0 border-b border-border bg-transparent py-3 text-sm text-foreground outline-none focus:border-sky-500" /></label><button disabled={loading || url.trim().length < 3} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}{loading ? 'Crawling...' : 'Crawl site'}</button></form><p className="mt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">max 8 pages · same origin only · 256 KB/page · one active crawl per process</p>{message ? <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p> : null}</section>

                {report ? <>
                    <ScoreLine score={report.score} right={<span>{report.pages.length} pages · {report.brokenLinks.length} broken · {report.redirects.length} redirects</span>} />
                    <HealthCheckRows checks={report.checks} />
                    <section className="mt-8"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Crawled sample</p><div className="mt-3 border-y border-border/80">{report.pages.map((page, index) => <div key={`${page.url}-${index}`} className={`grid gap-2 py-3 sm:grid-cols-[70px_minmax(0,1fr)_90px] ${index ? 'border-t border-border/60' : ''}`}><span className={`font-mono text-[9px] font-bold ${page.statusCode >= 400 || page.statusCode === 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{page.statusCode || 'ERR'}</span><div className="min-w-0"><p className="break-all text-xs font-semibold">{page.url}</p><p className="mt-1 text-[11px] text-muted-foreground">{page.error || page.title || 'No page title detected'}</p></div><span className="font-mono text-[9px] text-muted-foreground">{page.linksFound} links</span></div>)}</div></section>
                    <ServiceRequestForm source="SITE_CRAWL" target={report.origin} score={report.score} issues={actionable} snapshot={{ score: report.score, checkedAt: report.checkedAt, pages: report.pages, brokenLinks: report.brokenLinks, redirects: report.redirects, checks: report.checks }} />
                </> : <section className="mt-10 border-t border-border/80 pt-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Report area</p><p className="mt-3 text-sm text-muted-foreground">Enter a public site to sample up to eight same-origin pages.</p></section>}

                <footer className="mt-12 border-t border-border/80 pt-5 text-xs leading-5 text-muted-foreground">This is not an exhaustive crawler. It does not probe hidden directories, authenticated areas, external sites, ports or vulnerabilities. Results are not stored unless you explicitly create a service request.</footer>
            </div>
        </main>
    );
}
