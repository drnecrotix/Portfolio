'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Gauge, Globe2, Loader2, Search, ShieldCheck, XCircle } from 'lucide-react';
import type { WebsiteInspection, WebsiteInspectorCategory, WebsiteInspectorCheck } from '@/modules/website-inspector/types';

const categories: Array<{ id: WebsiteInspectorCategory; label: string }> = [
    { id: 'delivery', label: 'Delivery' },
    { id: 'security', label: 'Security headers' },
    { id: 'seo', label: 'SEO basics' },
    { id: 'privacy', label: 'Privacy signals' },
    { id: 'performance', label: 'Response sample' },
];

function statusClasses(status: WebsiteInspectorCheck['status']) {
    if (status === 'pass') return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-600 dark:text-emerald-400';
    if (status === 'fail') return 'border-rose-500/20 bg-rose-500/[0.06] text-rose-600 dark:text-rose-400';
    if (status === 'warning') return 'border-amber-500/20 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400';
    return 'border-border/70 bg-foreground/[0.025] text-muted-foreground';
}

function StatusIcon({ status }: { status: WebsiteInspectorCheck['status'] }) {
    if (status === 'pass') return <CheckCircle2 className="size-4" />;
    if (status === 'fail') return <XCircle className="size-4" />;
    if (status === 'warning') return <AlertTriangle className="size-4" />;
    return <Gauge className="size-4" />;
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

    async function inspect(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || url.trim().length < 3) return;
        setLoading(true);
        setMessage('Inspecting one public page request…');
        try {
            const response = await fetch('/api/website-inspector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const payload = await response.json().catch(() => ({})) as { inspection?: WebsiteInspection; error?: string };
            if (!response.ok || !payload.inspection) throw new Error(payload.error || 'The website could not be inspected.');
            setInspection(payload.inspection);
            setMessage(`Inspection completed in ${payload.inspection.responseTimeMs} ms.`);
        } catch (error) {
            setInspection(null);
            setMessage(error instanceof Error ? error.message : 'The website could not be inspected.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-3xl">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-sky-500">NecrotixLab · Website tool</p>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Website Inspector</h1>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        A lightweight first-pass audit of one public page: delivery, security headers, SEO basics, privacy signals and response timing. No browser automation and no third-party scanning API.
                    </p>
                </header>

                <section className="mt-10 rounded-[2rem] border border-sky-500/20 bg-sky-500/[0.04] p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-500/15 pb-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center rounded-2xl border border-sky-500/25 bg-background"><Globe2 className="size-5 text-sky-500" /></span>
                            <div>
                                <h2 className="font-semibold">Inspect a public website</h2>
                                <p className="text-xs leading-5 text-muted-foreground">Single request · 512 KB cap · private networks blocked</p>
                            </div>
                        </div>
                        <span className="rounded-full border border-border/70 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">v1 lightweight</span>
                    </div>

                    <form onSubmit={inspect} className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Website URL</span>
                            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                autoComplete="url"
                                inputMode="url"
                                placeholder="https://example.com"
                                className="w-full rounded-xl border border-border bg-background/80 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-500/60"
                            />
                        </label>
                        <button type="submit" disabled={loading || url.trim().length < 3} className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                            {loading ? 'Inspecting…' : 'Inspect site'}
                        </button>
                    </form>
                    {message ? <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">{message}</p> : null}
                </section>

                {inspection ? (
                    <section className="mt-8 space-y-6">
                        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                            <div className="rounded-[2rem] border border-border/70 bg-card/35 p-6">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hygiene score</p>
                                <div className="mt-5 flex items-end gap-3">
                                    <span className="text-6xl font-black tracking-[-0.07em]">{inspection.score}</span>
                                    <span className="mb-1 rounded-full border border-border px-3 py-1 font-mono text-xs font-bold">Grade {inspection.grade}</span>
                                </div>
                                <p className="mt-3 text-xs leading-5 text-muted-foreground">A compact heuristic for the checks below - not a vulnerability rating or compliance certification.</p>
                            </div>

                            <div className="rounded-[2rem] border border-border/70 bg-card/35 p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Final page</p>
                                        <h2 className="mt-2 break-words text-xl font-bold">{inspection.page.title || new URL(inspection.finalUrl).hostname}</h2>
                                        <a href={inspection.finalUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-xs font-semibold text-sky-500 hover:underline">
                                            {inspection.finalUrl}<ExternalLink className="size-3 shrink-0" />
                                        </a>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px]">HTTP {inspection.statusCode}</span>
                                        <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px]">{inspection.responseTimeMs} ms</span>
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-3">
                                    <Metric label="Content" value={inspection.page.contentType?.split(';')[0] || 'Unknown'} />
                                    <Metric label="Language" value={inspection.page.language || 'Not declared'} />
                                    <Metric label="HTML sample" value={`${Math.max(1, Math.round(inspection.page.capturedBytes / 1024))} KB${inspection.page.truncated ? '+' : ''}`} />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {categories.map((category) => {
                                const checks = grouped.get(category.id) ?? [];
                                if (!checks.length) return null;
                                return (
                                    <article key={category.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card/25">
                                        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                                            <h3 className="text-sm font-bold">{category.label}</h3>
                                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{checks.length} checks</span>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                            {checks.map((check) => (
                                                <div key={check.id} className="flex gap-3 px-5 py-4">
                                                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border ${statusClasses(check.status)}`}><StatusIcon status={check.status} /></span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold">{check.label}</p>
                                                            <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide ${statusClasses(check.status)}`}>{check.status}</span>
                                                        </div>
                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.summary}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border/70 bg-card/25 p-5 text-xs leading-5 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <p>Website Inspector analyzes only the public response it receives. It does not log in, bypass access controls, crawl the whole domain, run exploit payloads or certify security, privacy, accessibility or regulatory compliance. Submitted URLs and reports are not stored by this tool.</p>
                </div>
            </div>
        </main>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold">{value}</p>
        </div>
    );
}
