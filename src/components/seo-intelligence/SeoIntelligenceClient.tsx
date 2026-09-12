'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';
import { WebHealthNav } from '@/components/web-health/WebHealthUi';
import { BackToLabLink } from '@/components/services/BackToLabLink';
import type { SeoIntelligenceMode, SeoScoreBreakdown } from '@/modules/seo-intelligence/core';

type Finding = { id: string; severity: 'fail' | 'warning' | 'info'; label: string; summary: string; recommendation?: string };
type OverviewPage = { url: string; statusCode: number; title: string; words: number; h1: number; internalLinks: number; externalLinks: number };
type KeywordRow = { keyword: string; occurrences: number; pages: number; coverage: number; relevance: string; cannibalization: boolean };
type CompetitorRow = { domain: string; isTarget: boolean; score: number; title: string; words: number; h1: number; schema: number; keywordOverlap: number };
type LinkRow = { url: string; internalLinks: number; externalLinks: number; genericAnchors: number; nofollowLinks: number };
type LinkSummary = { internalLinks: number; externalLinks: number; uniqueInternalTargets: number; externalDomains: number; brokenInternal: number; genericAnchors: number; nofollowLinks: number };
type SeoResult = {
    mode: SeoIntelligenceMode;
    provider: 'native';
    score?: number;
    breakdown?: SeoScoreBreakdown;
    findings?: Finding[];
    pages?: OverviewPage[];
    rows?: KeywordRow[] | CompetitorRow[] | LinkRow[];
    summary?: LinkSummary;
    brokenTargets?: string[];
    pagesAnalyzed?: number;
    cannibalizationCount?: number;
    scope?: string;
};

const modes: Array<{ id: SeoIntelligenceMode; label: string; help: string }> = [
    { id: 'overview', label: 'SEO Audit', help: 'Bounded technical, on-page, content, indexability and structured-data analysis.' },
    { id: 'keywords', label: 'Keyword Intelligence', help: 'Extracts prominent topics and phrases from the site and flags cross-page intent overlap.' },
    { id: 'competitors', label: 'Competitor Compare', help: 'Compares your homepage with up to three competitor domains you provide.' },
    { id: 'links', label: 'Link Intelligence', help: 'Inspects internal/outbound links, anchor quality and a bounded sample of broken internal targets.' },
];

const integer = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 0 });

export function SeoIntelligenceClient() {
    const [mode, setMode] = useState<SeoIntelligenceMode>('overview');
    const [query, setQuery] = useState('');
    const [competitors, setCompetitors] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<SeoResult | null>(null);
    const current = useMemo(() => modes.find((item) => item.id === mode) ?? modes[0], [mode]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (loading || query.trim().length < 3) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const competitorDomains = competitors.split(/[,;\n]+/).map((value) => value.trim()).filter(Boolean).slice(0, 3);
            const response = await fetch('/api/seo-intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, query, competitors: mode === 'competitors' ? competitorDomains : [] }),
            });
            const payload = await response.json().catch(() => ({})) as { result?: SeoResult; error?: string };
            if (!response.ok || !payload.result) throw new Error(payload.error || 'SEO Intelligence request failed.');
            setResult(payload.result);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'SEO Intelligence request failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <BackToLabLink href="/services" label="Services" />
                <header className="max-w-4xl">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">NecrotixLab</span> / SEO Intelligence</div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">SEO Intelligence</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Run native SEO analysis directly from NecrotixLab. No external SEO provider, API key, credits or subscription is required.</p>
                    <WebHealthNav active="seo" />
                </header>

                <section className="mt-8 border-y border-border/80 py-5">
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="SEO Intelligence mode">
                        {modes.map((item) => (
                            <button key={item.id} type="button" onClick={() => { setMode(item.id); setResult(null); setError(''); }} className={`border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition ${mode === item.id ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">{current.help}</p>

                    <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-xs text-muted-foreground">Website URL or domain
                                <input value={query} onChange={(event) => setQuery(event.target.value)} required minLength={3} maxLength={2048} placeholder="example.bg" className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" />
                            </label>
                            {mode === 'competitors' ? <label className="text-xs text-muted-foreground">Competitor domains <span className="opacity-60">up to 3, comma separated</span>
                                <input value={competitors} onChange={(event) => setCompetitors(event.target.value)} required placeholder="competitor1.bg, competitor2.bg" className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" />
                            </label> : <div className="hidden sm:block" />}
                        </div>
                        <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{loading ? 'Analyzing...' : 'Run analysis'}
                        </button>
                    </form>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground"><span>Native mode</span><span>No API key</span><span>No credits</span><span>Bounded scans are rate-limited to protect server resources.</span><Link href="/services/pricing" className="font-semibold text-sky-500 hover:underline">Professional SEO services</Link></div>
                </section>

                {error ? <p role="alert" className="mt-6 border-l-2 border-rose-500 pl-4 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
                {result ? <Results result={result} /> : null}
            </div>
        </main>
    );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
    return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-border/60 py-3 first:border-t-0"><span className="text-sm text-muted-foreground">{label}</span><strong className="font-mono text-sm">{integer.format(value)}/100</strong></div>;
}

function Results({ result }: { result: SeoResult }) {
    if (result.mode === 'overview' && result.breakdown) {
        const breakdown = result.breakdown;
        const categories: Array<[string, number]> = [['Technical', breakdown.technical], ['On-page', breakdown.onPage], ['Content', breakdown.content], ['Internal links', breakdown.internalLinks], ['Indexability', breakdown.indexability], ['Structured data', breakdown.structuredData]];
        return <section className="mt-8 space-y-8"><div><div className="flex items-end gap-3"><strong className="font-mono text-5xl tracking-[-0.06em]">{result.score ?? 0}</strong><span className="pb-1 text-sm text-muted-foreground">/ 100 native SEO score</span></div><div className="mt-5 border-y border-border/80">{categories.map(([label, value]) => <ScoreRow key={label} label={label} value={value} />)}</div></div><div><h2 className="text-xl font-black">Findings</h2><div className="mt-4 border-y border-border/80">{(result.findings ?? []).map((finding, index) => <div key={finding.id} className={`grid gap-2 py-4 sm:grid-cols-[92px_minmax(0,1fr)] ${index ? 'border-t border-border/60' : ''}`}><span className={`font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${finding.severity === 'fail' ? 'text-rose-500' : finding.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'}`}>{finding.severity}</span><div><p className="text-sm font-bold">{finding.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.summary}</p>{finding.recommendation ? <p className="mt-1 text-xs leading-5">{finding.recommendation}</p> : null}</div></div>)}</div></div>{result.pages?.length ? <div><h2 className="text-xl font-black">Pages sampled</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Page</th><th className="py-3 pr-4 text-right">HTTP</th><th className="py-3 pr-4 text-right">Words</th><th className="py-3 pr-4 text-right">H1</th><th className="py-3 text-right">Links</th></tr></thead><tbody>{result.pages.map((page) => <tr key={page.url} className="border-b border-border/60"><td className="max-w-[420px] truncate py-3 pr-4" title={page.url}>{page.title || page.url}</td><td className="py-3 pr-4 text-right font-mono">{page.statusCode || '-'}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(page.words)}</td><td className="py-3 pr-4 text-right font-mono">{page.h1}</td><td className="py-3 text-right font-mono">{page.internalLinks + page.externalLinks}</td></tr>)}</tbody></table></div></div> : null}<p className="text-xs leading-5 text-muted-foreground">{result.scope}</p></section>;
    }

    const rows = result.rows ?? [];
    if (!rows.length) return <p className="mt-8 text-sm text-muted-foreground">No useful signals were extracted from the bounded sample.</p>;

    if (result.mode === 'keywords') {
        return <section className="mt-8"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-black">Keyword map</h2><span className="text-xs text-muted-foreground">{result.pagesAnalyzed ?? 0} pages analyzed · {result.cannibalizationCount ?? 0} overlap flags</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Keyword / phrase</th><th className="py-3 pr-4 text-right">Occurrences</th><th className="py-3 pr-4 text-right">Pages</th><th className="py-3 pr-4 text-right">Coverage</th><th className="py-3 text-right">Signal</th></tr></thead><tbody>{(rows as KeywordRow[]).map((row) => <tr key={row.keyword} className="border-b border-border/60"><td className="py-3 pr-4 font-medium">{row.keyword}{row.cannibalization ? <span className="ml-2 font-mono text-[9px] uppercase text-amber-500">overlap</span> : null}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(row.occurrences)}</td><td className="py-3 pr-4 text-right font-mono">{row.pages}</td><td className="py-3 pr-4 text-right font-mono">{row.coverage}%</td><td className="py-3 text-right font-mono">{row.relevance}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-muted-foreground">These are content-derived relevance signals, not Google search-volume or competition estimates.</p></section>;
    }

    if (result.mode === 'competitors') {
        return <section className="mt-8"><h2 className="text-xl font-black">User-supplied competitor comparison</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Domain</th><th className="py-3 pr-4 text-right">Native score</th><th className="py-3 pr-4 text-right">Words</th><th className="py-3 pr-4 text-right">H1</th><th className="py-3 pr-4 text-right">Schema</th><th className="py-3 text-right">Keyword overlap</th></tr></thead><tbody>{(rows as CompetitorRow[]).map((row) => <tr key={row.domain} className={`border-b border-border/60 ${row.isTarget ? 'bg-sky-500/[0.05]' : ''}`}><td className={`py-3 pr-4 font-medium ${row.isTarget ? 'text-sky-500' : ''}`}>{row.domain}{row.isTarget ? ' (target)' : ''}</td><td className="py-3 pr-4 text-right font-mono">{row.score}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(row.words)}</td><td className="py-3 pr-4 text-right font-mono">{row.h1}</td><td className="py-3 pr-4 text-right font-mono">{row.schema}</td><td className="py-3 text-right font-mono">{row.keywordOverlap}%</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Comparison is based on directly inspected homepage content and technical signals, not third-party traffic or ranking databases.</p></section>;
    }

    const summary = result.summary;
    const metrics: Array<[string, number]> = summary ? [['Internal links', summary.internalLinks], ['External links', summary.externalLinks], ['Unique internal targets', summary.uniqueInternalTargets], ['External domains', summary.externalDomains], ['Broken internal', summary.brokenInternal], ['Generic anchors', summary.genericAnchors], ['Nofollow links', summary.nofollowLinks]] : [];
    return <section className="mt-8 space-y-7"><div><h2 className="text-xl font-black">Link intelligence</h2><div className="mt-4 border-y border-border/80">{metrics.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-border/60 py-3 first:border-t-0"><span className="text-sm text-muted-foreground">{label}</span><strong className="font-mono text-sm">{integer.format(value)}</strong></div>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Page</th><th className="py-3 pr-4 text-right">Internal</th><th className="py-3 pr-4 text-right">External</th><th className="py-3 pr-4 text-right">Generic</th><th className="py-3 text-right">Nofollow</th></tr></thead><tbody>{(rows as LinkRow[]).map((row) => <tr key={row.url} className="border-b border-border/60"><td className="max-w-[420px] truncate py-3 pr-4" title={row.url}>{row.url}</td><td className="py-3 pr-4 text-right font-mono">{row.internalLinks}</td><td className="py-3 pr-4 text-right font-mono">{row.externalLinks}</td><td className="py-3 pr-4 text-right font-mono">{row.genericAnchors}</td><td className="py-3 text-right font-mono">{row.nofollowLinks}</td></tr>)}</tbody></table></div>{result.brokenTargets?.length ? <div><h3 className="text-sm font-bold">Confirmed broken internal targets</h3><div className="mt-2 space-y-1 font-mono text-xs text-rose-500">{result.brokenTargets.map((url) => <p key={url} className="break-all">{url}</p>)}</div></div> : null}<p className="text-xs leading-5 text-muted-foreground">This analyzes links visible in the bounded crawl. It is not a global backlink database.</p></section>;
}
