'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Globe2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { TrafficAnalyticsPanel } from './TrafficAnalyticsPanel';
import { cn } from '@/lib/utils';

type VariantSummary = {
    variant: 'A' | 'B';
    label: string;
    exposure: number;
    primary: number;
    conversionRate: number;
    events: Record<string, number | undefined>;
};

type ExperimentSummary = {
    id: string;
    name: string;
    hypothesis: string;
    primaryEvent: string;
    variants: VariantSummary[];
    lift: number | null;
};

type Payload = {
    experiments: ExperimentSummary[];
    updatedAt: string;
};

type ViewMode = 'tests' | 'audience';

function percent(value: number) {
    return `${(value * 100).toFixed(Math.abs(value) >= 0.1 ? 1 : 2)}%`;
}

function metricLabel(value: string) {
    return value.replaceAll('_', ' ');
}

function sampleState(total: number) {
    if (total < 40) return { label: 'Collecting data', note: 'Too early to interpret reliably.' };
    if (total < 120) return { label: 'Early signal', note: 'Useful direction, but keep collecting.' };
    return { label: 'Ready to evaluate', note: 'There is enough traffic for a more useful comparison.' };
}

export function ExperimentsDashboard() {
    const [data, setData] = useState<Payload | null>(null);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [view, setView] = useState<ViewMode>('tests');

    const refresh = useCallback(async (manual = false) => {
        if (manual) setIsRefreshing(true);
        try {
            const response = await fetch('/api/admin/experiments', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Request failed (${response.status})`);
            setData(await response.json());
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load experiment metrics.');
        } finally {
            if (manual) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => void refresh());
        const timer = window.setInterval(() => void refresh(), 5000);
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(timer);
        };
    }, [refresh]);

    const overview = useMemo(() => {
        const experiments = data?.experiments || [];
        let exposures = 0;
        let ready = 0;
        let imbalanced = 0;
        for (const experiment of experiments) {
            const a = experiment.variants.find((variant) => variant.variant === 'A');
            const b = experiment.variants.find((variant) => variant.variant === 'B');
            const total = (a?.exposure || 0) + (b?.exposure || 0);
            exposures += total;
            if (total >= 120) ready += 1;
            if (total >= 20 && a && (a.exposure / total < 0.4 || a.exposure / total > 0.6)) imbalanced += 1;
        }
        return { tests: experiments.length, exposures, ready, imbalanced };
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Measurement</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Experiments</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A/B tests and audience analytics are separated below so the page stays easier to scan. Homepage variants remain stable for the current browser session.</p>
                </div>
                <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50">
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                    Refresh tests
                </button>
            </div>

            <div className="inline-flex w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-1 sm:w-auto">
                <button type="button" onClick={() => setView('tests')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'tests' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><BarChart3 className="size-4" /> A/B tests</button>
                <button type="button" onClick={() => setView('audience')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'audience' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><Globe2 className="size-4" /> Audience</button>
            </div>

            {view === 'audience' ? (
                <TrafficAnalyticsPanel showMap title="Audience & traffic" description="Country and device analytics for public visits. No city or precise-location data is collected, and raw IP addresses are not stored." />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            ['Active tests', overview.tests],
                            ['Total exposures', overview.exposures],
                            ['Ready to evaluate', overview.ready],
                            ['Split warnings', overview.imbalanced],
                        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
                        <span className="font-medium text-foreground">Live test data:</span> counters refresh every 5 seconds. Use the primary conversion first, then sample size and lift. Detailed event counts are available inside each test without occupying the main view.
                        {data?.updatedAt ? <span className="ml-2">Last update: {new Date(data.updatedAt).toLocaleTimeString()}</span> : null}
                    </div>

                    {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
                    {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

                    <div className="space-y-4">
                        {data?.experiments.map((experiment) => {
                            const a = experiment.variants.find((variant) => variant.variant === 'A')!;
                            const b = experiment.variants.find((variant) => variant.variant === 'B')!;
                            const totalExposure = a.exposure + b.exposure;
                            const state = sampleState(totalExposure);
                            const aShare = totalExposure > 0 ? a.exposure / totalExposure : 0.5;
                            const bShare = totalExposure > 0 ? b.exposure / totalExposure : 0.5;
                            const imbalance = totalExposure >= 20 && (aShare < 0.4 || aShare > 0.6);
                            const leader = a.conversionRate === b.conversionRate ? null : a.conversionRate > b.conversionRate ? 'A' : 'B';
                            const liftPositive = (experiment.lift ?? 0) >= 0;

                            return (
                                <article key={experiment.id} className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="max-w-3xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-semibold sm:text-xl">{experiment.name}</h2>
                                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live</span>
                                                <span className="rounded-full border border-foreground/10 bg-foreground/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{state.label}</span>
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{experiment.hypothesis}</p>
                                        </div>
                                        <div className="text-left lg:text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Primary metric</p><p className="mt-1 text-sm font-medium capitalize">{metricLabel(experiment.primaryEvent)}</p></div>
                                    </div>

                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                        {[a, b].map((variant) => {
                                            const isLeader = leader === variant.variant;
                                            return (
                                                <div key={variant.variant} className={cn('rounded-2xl border p-4', isLeader ? 'border-sky-500/25 bg-sky-500/[0.035]' : 'border-foreground/10 bg-foreground/[0.018]')}>
                                                    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold">Variant {variant.variant}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{variant.label}</p></div>{isLeader ? <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-600 dark:text-sky-300">Ahead</span> : null}</div>
                                                    <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tabular-nums">{percent(variant.conversionRate)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-muted-foreground">conversion</p></div><div className="text-right text-xs text-muted-foreground"><p>{variant.primary} actions</p><p className="mt-1">{variant.exposure} exposures</p></div></div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Current signal</p><p className="mt-1 text-sm font-semibold">{leader ? `Variant ${leader} ahead` : 'No clear leader'}</p></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">B vs A lift</p><div className="mt-1 flex items-center gap-2 text-sm font-semibold">{experiment.lift === null ? 'Not available' : `${experiment.lift >= 0 ? '+' : ''}${percent(experiment.lift)}`}{experiment.lift === null ? null : liftPositive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-rose-500" />}</div></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Sample</p><p className="mt-1 text-sm font-semibold">{totalExposure} exposures</p><p className="mt-1 text-[10px] text-muted-foreground">A {(aShare * 100).toFixed(0)}% / B {(bShare * 100).toFixed(0)}%</p></div>
                                    </div>

                                    <details className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.012]">
                                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">Details and supporting events</summary>
                                        <div className="border-t border-foreground/10 p-4">
                                            {imbalance ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.045] px-3 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" />The A/B split is outside 40/60. Keep collecting data before making a decision.</div> : <p className="mb-4 text-xs text-muted-foreground">Sample split is within the expected range. {state.note}</p>}
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                                {['engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open'].map((event) => <div key={event} className="rounded-xl bg-foreground/[0.025] px-3 py-2.5"><p className="text-[10px] text-muted-foreground">{metricLabel(event)}</p><p className="mt-1 font-mono text-sm font-semibold">{(a.events[event] ?? 0) + (b.events[event] ?? 0)}</p></div>)}
                                            </div>
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] px-5 py-4 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">Interpretation:</span> a high lift with a tiny sample is only an early signal. Prefer a balanced sample and a stable primary conversion before choosing a winner.</div>
                </>
            )}
        </div>
    );
}
