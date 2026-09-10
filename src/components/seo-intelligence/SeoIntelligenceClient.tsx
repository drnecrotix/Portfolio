'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';
import { WebHealthNav } from '@/components/web-health/WebHealthUi';
import type { SeoIntelligenceMode } from '@/modules/seo-intelligence/core';

type KeywordRow = { keyword: string; searchVolume: number; cpc: number; competition: number; competitionLevel: string };
type SerpRow = { rank: number; title: string; domain: string; url: string; isTarget: boolean };
type CompetitorRow = { domain: string; intersections: number; avgPosition: number; etv: number; keywords: number };
type BacklinkSummary = { target: string; rank: number; backlinks: number; referringDomains: number; referringPages: number; brokenBacklinks: number };
type SeoResult = { mode: SeoIntelligenceMode; rows?: KeywordRow[] | SerpRow[] | CompetitorRow[]; summary?: BacklinkSummary };

const modes: Array<{ id: SeoIntelligenceMode; label: string; placeholder: string; help: string }> = [
    { id: 'keywords', label: 'Keyword Research', placeholder: 'e.g. уеб дизайн', help: 'Long-tail keyword ideas with Bulgarian search-volume and CPC signals.' },
    { id: 'serp', label: 'SERP / Rank', placeholder: 'e.g. изработка на сайт', help: 'Live Google organic results for Bulgaria. Add a target domain to highlight its ranking.' },
    { id: 'competitors', label: 'Competitors', placeholder: 'e.g. example.bg', help: 'Organic-search competitors sharing ranking keywords with the target domain.' },
    { id: 'backlinks', label: 'Backlinks', placeholder: 'e.g. example.bg', help: 'A compact backlink-profile overview for a domain or subdomain.' },
];

const integer = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 2 });

export function SeoIntelligenceClient() {
    const [mode, setMode] = useState<SeoIntelligenceMode>('keywords');
    const [query, setQuery] = useState('');
    const [target, setTarget] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<SeoResult | null>(null);
    const current = useMemo(() => modes.find((item) => item.id === mode) ?? modes[0], [mode]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (loading || query.trim().length < 2) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await fetch('/api/seo-intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, query, target: mode === 'serp' ? target : '' }),
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
                <header className="max-w-4xl">
                    <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><span className="text-sky-500">NecrotixLab</span> / SEO Intelligence</div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-5xl">SEO Intelligence</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">Research Bulgarian search demand, live Google positions, organic competitors and backlink signals from one compact workspace. Default market: Bulgaria / Bulgarian.</p>
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
                            <label className="text-xs text-muted-foreground">{mode === 'keywords' || mode === 'serp' ? 'Keyword' : 'Domain'}
                                <input value={query} onChange={(event) => setQuery(event.target.value)} required minLength={2} maxLength={700} placeholder={current.placeholder} className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" />
                            </label>
                            {mode === 'serp' ? <label className="text-xs text-muted-foreground">Target domain <span className="opacity-60">optional</span>
                                <input value={target} onChange={(event) => setTarget(event.target.value)} maxLength={255} placeholder="necrotixlab.com" className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm text-foreground outline-none focus:border-sky-500" />
                            </label> : <div className="hidden sm:block" />}
                        </div>
                        <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 border border-foreground bg-foreground px-5 text-sm font-bold text-background transition hover:bg-transparent hover:text-foreground disabled:opacity-50">
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{loading ? 'Researching...' : 'Run research'}
                        </button>
                    </form>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground"><span>Market: Bulgaria (2100)</span><span>Language: Bulgarian (bg)</span><span>Paid API calls are rate-limited.</span><Link href="/services/pricing" className="font-semibold text-sky-500 hover:underline">Professional SEO services</Link></div>
                </section>

                {error ? <p role="alert" className="mt-6 border-l-2 border-rose-500 pl-4 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
                {result ? <Results result={result} /> : null}
            </div>
        </main>
    );
}

function Results({ result }: { result: SeoResult }) {
    if (result.mode === 'backlinks' && result.summary) {
        const summary = result.summary;
        const metrics = [
            ['Domain rank', summary.rank],
            ['Backlinks', summary.backlinks],
            ['Referring domains', summary.referringDomains],
            ['Referring pages', summary.referringPages],
            ['Broken backlinks', summary.brokenBacklinks],
        ];
        return <section className="mt-8"><h2 className="text-xl font-black">Backlink overview</h2><div className="mt-4 border-y border-border/80">{metrics.map(([label, value], index) => <div key={String(label)} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 ${index ? 'border-t border-border/60' : ''}`}><span className="text-sm text-muted-foreground">{label}</span><strong className="font-mono text-sm">{integer.format(Number(value))}</strong></div>)}</div></section>;
    }

    const rows = result.rows ?? [];
    if (!rows.length) return <p className="mt-8 text-sm text-muted-foreground">No matching results were returned for this query.</p>;

    if (result.mode === 'keywords') {
        return <section className="mt-8"><h2 className="text-xl font-black">Keyword opportunities</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Keyword</th><th className="py-3 pr-4 text-right">Volume</th><th className="py-3 pr-4 text-right">CPC (USD)</th><th className="py-3 text-right">Competition</th></tr></thead><tbody>{(rows as KeywordRow[]).map((row) => <tr key={row.keyword} className="border-b border-border/60"><td className="py-3 pr-4 font-medium">{row.keyword}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(row.searchVolume)}</td><td className="py-3 pr-4 text-right font-mono">${decimal.format(row.cpc)}</td><td className="py-3 text-right font-mono">{row.competitionLevel || decimal.format(row.competition)}</td></tr>)}</tbody></table></div></section>;
    }

    if (result.mode === 'serp') {
        return <section className="mt-8"><h2 className="text-xl font-black">Google organic results</h2><div className="mt-4 border-y border-border/80">{(rows as SerpRow[]).map((row, index) => <div key={`${row.rank}-${row.url}`} className={`grid gap-2 py-3 sm:grid-cols-[52px_minmax(150px,220px)_minmax(0,1fr)] ${index ? 'border-t border-border/60' : ''} ${row.isTarget ? 'bg-sky-500/[0.05]' : ''}`}><span className="font-mono text-xs font-bold">#{row.rank}</span><span className={`text-xs ${row.isTarget ? 'font-bold text-sky-500' : 'text-muted-foreground'}`}>{row.domain}</span><a href={row.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-medium hover:underline">{row.title || row.url}</a></div>)}</div></section>;
    }

    return <section className="mt-8"><h2 className="text-xl font-black">Organic competitors</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border"><th className="py-3 pr-4">Domain</th><th className="py-3 pr-4 text-right">Shared keywords</th><th className="py-3 pr-4 text-right">Avg. position</th><th className="py-3 pr-4 text-right">Organic keywords</th><th className="py-3 text-right">ETV</th></tr></thead><tbody>{(rows as CompetitorRow[]).map((row) => <tr key={row.domain} className="border-b border-border/60"><td className="py-3 pr-4 font-medium">{row.domain}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(row.intersections)}</td><td className="py-3 pr-4 text-right font-mono">{decimal.format(row.avgPosition)}</td><td className="py-3 pr-4 text-right font-mono">{integer.format(row.keywords)}</td><td className="py-3 text-right font-mono">{integer.format(row.etv)}</td></tr>)}</tbody></table></div></section>;
}
