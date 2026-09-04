'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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

function percent(value: number) {
    return `${(value * 100).toFixed(Math.abs(value) >= 0.1 ? 1 : 2)}%`;
}

function metricLabel(value: string) {
    return value.replaceAll('_', ' ');
}

function sampleState(total: number) {
    if (total < 40) return { label: 'Collecting data', note: 'Too early to interpret reliably.' };
    if (total < 120) return { label: 'Early signal', note: 'Useful direction, but keep collecting.' };
    return { label: 'Ready to evaluate', note: 'Compare the primary conversion and balance.' };
}

export function ExperimentsDashboard() {
    const [data, setData] = useState<Payload | null>(null);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    return (
        <div className="space-y-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Measurement</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Experiments</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                        Homepage variants now stay consistent for the current browser session, so one person is not randomly moved between A and B on every refresh. The variant cookie contains only the three A/B choices and no visitor identity.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void refresh(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50"
                >
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                    Refresh tests
                </button>
            </div>

            <TrafficAnalyticsPanel
                showMap
                title="Audience & traffic"
                description="Country and device analytics for public visits. No city or precise-location data is collected, and raw IP addresses are not stored."
            />

            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
                <span className="font-medium text-foreground">Experiment live mode:</span> counters refresh every 5 seconds. Exposure and conversion events are de-duplicated within the current page view. Session-stable variants make repeated homepage visits more comparable than the previous per-request assignment.
                {data?.updatedAt ? <span className="ml-2">Last update: {new Date(data.updatedAt).toLocaleTimeString()}</span> : null}
            </div>

            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
            {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

            <div className="space-y-5">
                {data?.experiments.map((experiment) => {
                    const a = experiment.variants.find((variant) => variant.variant === 'A')!;
                    const b = experiment.variants.find((variant) => variant.variant === 'B')!;
                    const totalExposure = a.exposure + b.exposure;
                    const state = sampleState(totalExposure);
                    const aShare = totalExposure > 0 ? a.exposure / totalExposure : 0.5;
                    const bShare = totalExposure > 0 ? b.exposure / totalExposure : 0.5;
                    const imbalance = totalExposure >= 20 && (aShare < 0.4 || aShare > 0.6);
                    const maxConversion = Math.max(a.conversionRate, b.conversionRate, 0.01);
                    const leader = a.conversionRate === b.conversionRate ? null : a.conversionRate > b.conversionRate ? 'A' : 'B';
                    const liftPositive = (experiment.lift ?? 0) >= 0;

                    return (
                        <article key={experiment.id} className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{experiment.id}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-semibold sm:text-2xl">{experiment.name}</h2>
                                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live</span>
                                        <span className="rounded-full border border-foreground/10 bg-foreground/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{state.label}</span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{experiment.hypothesis}</p>
                                </div>
                                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] px-4 py-3 lg:min-w-52">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current reading</p>
                                    <p className="mt-1 text-sm font-semibold">{leader ? `Variant ${leader} is ahead` : 'No clear leader yet'}</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{state.note}</p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                {[a, b].map((variant) => {
                                    const isLeader = leader === variant.variant;
                                    return (
                                        <div key={variant.variant} className={cn('rounded-2xl border p-4 sm:p-5', isLeader ? 'border-sky-500/25 bg-sky-500/[0.035]' : 'border-foreground/10 bg-foreground/[0.018]')}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div><span className="font-mono text-xs font-bold">Variant {variant.variant}</span><p className="mt-1 text-xs text-muted-foreground">{variant.label}</p></div>
                                                <span className="rounded-full border border-foreground/10 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">{variant.exposure} exposures</span>
                                            </div>
                                            <div className="mt-5 flex items-end justify-between gap-4">
                                                <div><p className="text-3xl font-semibold tabular-nums">{percent(variant.conversionRate)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{metricLabel(experiment.primaryEvent)} conversion</p></div>
                                                <p className="text-xs text-muted-foreground">{variant.primary} actions</p>
                                            </div>
                                            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-foreground/10"><div className={cn('h-full rounded-full', variant.variant === 'A' ? 'bg-violet-500' : 'bg-sky-500')} style={{ width: `${Math.max(2, (variant.conversionRate / maxConversion) * 100)}%` }} /></div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                                <div className="rounded-2xl border border-foreground/10 p-4">
                                    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">B vs A lift</p><p className="mt-1 font-mono text-xl font-bold">{experiment.lift === null ? '—' : `${experiment.lift >= 0 ? '+' : ''}${percent(experiment.lift)}`}</p></div>{experiment.lift === null ? null : liftPositive ? <TrendingUp className="size-5 text-emerald-500" /> : <TrendingDown className="size-5 text-rose-500" />}</div>
                                    <p className="mt-3 text-xs leading-5 text-muted-foreground">Lift compares the primary conversion rate of B against A. It is directional, not a statistical guarantee.</p>
                                </div>

                                <div className="rounded-2xl border border-foreground/10 p-4">
                                    <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Sample balance</p><span className="font-mono text-xs text-muted-foreground">A {(aShare * 100).toFixed(0)}% · B {(bShare * 100).toFixed(0)}%</span></div>
                                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-foreground/10"><div className="bg-violet-500" style={{ width: `${aShare * 100}%` }} /><div className="bg-sky-500" style={{ width: `${bShare * 100}%` }} /></div>
                                    {imbalance ? <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-600 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" />The split is outside 40/60. Keep collecting data and watch whether the balance normalises.</div> : <p className="mt-3 text-xs text-muted-foreground">Total exposures: {totalExposure}. The current split is within the expected range.</p>}
                                </div>
                            </div>

                            <div className="mt-5 border-t border-foreground/10 pt-4">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Supporting events - both variants combined</p>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                    {['engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open'].map((event) => (
                                        <div key={event} className="rounded-xl bg-foreground/[0.025] px-3 py-2.5"><p className="text-[10px] text-muted-foreground">{metricLabel(event)}</p><p className="mt-1 font-mono text-sm font-semibold">{(a.events[event] ?? 0) + (b.events[event] ?? 0)}</p></div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] px-5 py-4 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">How to read this page:</span> first check sample balance, then compare the primary conversion rate, and only then use lift as context. A few visits can produce dramatic percentages, so a high lift with a tiny sample should not be treated as a winner.
            </div>
        </div>
    );
}
