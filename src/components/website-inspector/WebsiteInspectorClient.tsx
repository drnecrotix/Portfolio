'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ExternalLink, Loader2, Search, ShieldCheck } from 'lucide-react';
import type { WebsiteInspection, WebsiteInspectorCategory, WebsiteInspectorCheck } from '@/modules/website-inspector/types';
import { WebHealthNav } from '@/components/web-health/WebHealthUi';
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm';

const categories: Array<{ id: WebsiteInspectorCategory; label: string; code: string }> = [
    { id: 'delivery', label: 'Delivery', code: '01' },
    { id: 'security', label: 'Security headers', code: '02' },
    { id: 'seo', label: 'SEO & discovery', code: '03' },
    { id: 'privacy', label: 'Privacy signals', code: '04' },
    { id: 'performance', label: 'Response & caching', code: '05' },
    { id: 'wordpress', label: 'WordPress check', code: '06' },
];

function statusText(status: WebsiteInspectorCheck['status']) {
    if (status === 'pass') return 'text-emerald-600 dark:text-emerald-400';
    if (status === 'fail') return 'text-rose-600 dark:text-rose-400';
    if (status === 'warning') return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
}

function statusMark(status: WebsiteInspectorCheck['status']) {
    if (status === 'pass') return 'PASS';
    if (status === 'fail') return 'FAIL';
    if (status === 'warning') return 'WARN';
    return 'INFO';
}

export function WebsiteInspectorClient() {
    const [url, setUrl] = useState('');
    const [inspection, setInspection] = useState<WebsiteInspection | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const grouped = useMemo(() => {
        const map = new Map<WebsiteInspectorCategory, WebsiteInspectorCheck[]>();
        for (const category of categories) map.set(category.id, []);
        for (const check of inspection?.checks ?? []) map.get(check.category)?.push(check);
        return map;
    }, [inspection]);

    const totals = useMemo(() => {
        const checks = inspection?.checks ?? [];
        return {
            pass: checks.filter((check) => check.status === 'pass').length,
            warning: checks.filter((check) => check.status === 'warning').length,
            fail: checks.filter((check) => check.status === 'fail').length,
            info: checks.filter((check) => check.status === 'info').length,
        };
    }, [inspection]);

    const actionable = useMemo(() => (inspection?.checks ?? [])
        .filter((check) => check.status === 'warning' || check.status === 'fail')
        .map((check) => ({ id: check.id, label: check.label, status: check.status as 'warning' | 'fail', summary: check.summary, recommendation: check.recommendation })), [inspection]);

    async function inspect(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || url.trim().length < 3) return;
        setLoading(true);
        setMessage('Inspecting the public page and bounded companion probes...');
        try {
            const response = await fetch('/api/website-inspector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const payload = await response.json().catch(() => ({})) as { inspection?: WebsiteInspection; error?: string };
            if (!response.ok || !payload.inspection) throw new Error(payload.error || 'The website could not be inspected.');
            setInspection(payload.inspection);
            setMessage(`Inspection completed in ${payload.inspection.responseTimeMs} ms for the primary page request.`);
        } catch (error) {
            setInspection(null);
            setMessage(error instanceof Error ? error.message : 'The website could not be inspected.');
        } finally {
            setLoading(false);
        }
    }

    const detectedCms = inspection?.page.wordpress?.detected ? 'WordPress' : inspection?.page.technologies.includes('Next.js') ? 'Next.js' : inspection?.page.technologies.includes('Shopify') ? 'Shopify' : 'Unknown';

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-4xl">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                        <span className="text-sky-500">NecrotixLab</span><span aria-hidden="true">/</span><span>Website Inspector</span><span aria-hidden="true">/</span><span>v1.2.61</span>
                    </div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">Website Inspector</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">A lightweight technical inspection of one public page with bounded companion probes for TLS, redirects, security headers, SEO discovery, privacy, caching, technology hints and WordPress signals.</p>
                </header>
                <WebHealthNav active="website" />

                <section className="mt-8 border-b border-border/80 pb-6">
                    <form onSubmit={inspect} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <label className="block min-w-0"><span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Target URL</span><span className="relative block"><Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={url} onChange={(event) => setUrl(event.target.value)} autoComplete="url" inputMode="url" placeholder="https://example.com" className="w-full border-0 border-b border-border bg-transparent py-3 pl-7 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/55 focus:border-sky-500" /></span></label>
                        <button type="submit" disabled={loading || url.trim().length < 3} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background">{loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{loading ? 'Inspecting...' : 'Inspect site'}</button>
                    </form>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><span>1 primary page</span><span>bounded public probes</span><span>512 KB HTML cap</span><span>3.5 s probe timeout</span><span>private networks blocked</span></div>
                    {message ? <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">{message}</p> : null}
                </section>

                {inspection ? (
                    <section className="mt-10">
                        <div className="grid border-t border-border/80 md:grid-cols-[150px_minmax(0,1fr)_260px]">
                            <div className="border-b border-border/80 py-6 md:border-b-0 md:border-r md:pr-6"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hygiene score</p><div className="mt-2 flex items-baseline gap-2"><span className="text-5xl font-black tracking-[-0.07em]">{inspection.score}</span><span className="font-mono text-xs font-bold text-muted-foreground">/100</span></div><p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">Grade {inspection.grade}</p></div>
                            <div className="min-w-0 border-b border-border/80 py-6 md:border-b-0 md:border-r md:px-6"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Final page</p><h2 className="mt-2 break-words text-xl font-bold tracking-[-0.02em]">{inspection.page.title || new URL(inspection.finalUrl).hostname}</h2><a href={inspection.finalUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all font-mono text-[10px] font-semibold text-sky-500 hover:underline">{inspection.finalUrl}<ExternalLink className="size-3 shrink-0" /></a></div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-6 md:pl-6"><Metric label="HTTP" value={String(inspection.statusCode)} /><Metric label="Response" value={`${inspection.responseTimeMs} ms`} /><Metric label="Language" value={inspection.page.language || 'Not declared'} /><Metric label="HTML" value={`${Math.max(1, Math.round(inspection.page.capturedBytes / 1024))} KB${inspection.page.truncated ? '+' : ''}`} /></div>
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border/80 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em]"><span className="text-emerald-600 dark:text-emerald-400">{totals.pass} pass</span><span className="text-amber-600 dark:text-amber-400">{totals.warning} warn</span><span className="text-rose-600 dark:text-rose-400">{totals.fail} fail</span><span className="text-muted-foreground">{totals.info} info</span><span className="ml-auto normal-case tracking-normal text-muted-foreground">Heuristic summary, not a vulnerability rating.</span></div>

                        <div>{categories.map((category) => { const checks = grouped.get(category.id) ?? []; if (!checks.length) return null; return <section key={category.id} className="grid border-b border-border/80 lg:grid-cols-[200px_minmax(0,1fr)]"><header className="py-5 lg:border-r lg:border-border/80 lg:pr-6"><div className="flex items-baseline gap-3"><span className="font-mono text-[9px] font-bold text-sky-500">{category.code}</span><h3 className="text-sm font-bold">{category.label}</h3></div><p className="mt-1 pl-7 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{checks.length} checks</p></header><div className="border-t border-border/60 lg:border-t-0 lg:pl-6">{checks.map((check, index) => <div key={check.id} className={`grid gap-2 py-4 sm:grid-cols-[64px_minmax(150px,220px)_minmax(0,1fr)] sm:gap-4 ${index > 0 ? 'border-t border-border/60' : ''}`}><span className={`font-mono text-[9px] font-black tracking-[0.12em] ${statusText(check.status)}`}>{statusMark(check.status)}</span><p className="text-sm font-semibold">{check.label}</p><div className="min-w-0"><p className="text-xs leading-5 text-muted-foreground">{check.summary}</p>{check.recommendation ? <p className="mt-1.5 text-xs leading-5 text-foreground/80"><span className="mr-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-sky-500">Fix</span>{check.recommendation}</p> : null}</div></div>)}</div></section>; })}</div>

                        <ServiceRequestForm key={inspection.checkedAt} source="WEBSITE_INSPECTOR" target={inspection.finalUrl} score={inspection.score} issues={actionable} defaultCms={detectedCms} snapshot={{ score: inspection.score, checkedAt: inspection.checkedAt, grade: inspection.grade, statusCode: inspection.statusCode, technologies: inspection.page.technologies, wordpress: inspection.page.wordpress }} />
                    </section>
                ) : <section className="mt-12 border-t border-border/80 pt-5"><p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Report area</p><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Enter a public website above. Results will appear here as the same compact technical report, with additional checks added as rows instead of dashboard cards.</p></section>}

                <footer className="mt-12 border-t border-border/80 pt-5 text-xs leading-5 text-muted-foreground"><p className="max-w-4xl">Website Inspector analyzes public responses only. It does not log in, bypass access controls, enumerate WordPress users, brute-force paths, run exploit payloads, perform port scans or certify security, privacy, accessibility or regulatory compliance. Ordinary scan results are not stored; selected findings are stored only when you explicitly create a service request.</p></footer>
            </div>
        </main>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="min-w-0"><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>;
}
