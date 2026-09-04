'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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
    return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function metricLabel(value: string) {
    return value.replaceAll('_', ' ');
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
                        Privacy-friendly A/B tests. Variants are assigned independently for each homepage request; no experiment cookie, localStorage entry, sessionStorage entry or visitor ID is created. The database stores aggregate counters only.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void refresh(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50"
                >
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs text-muted-foreground sm:px-5">
                <span className="font-medium text-foreground">Live mode:</span> auto-refresh every 5 seconds. Each homepage render is one experiment exposure opportunity and each event is de-duplicated within that page view.
                {data?.updatedAt ? <span className="ml-2">Last update: {new Date(data.updatedAt).toLocaleTimeString()}</span> : null}
            </div>

            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}

            {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

            <div className="grid gap-5 xl:grid-cols-3">
                {data?.experiments.map((experiment) => {
                    const a = experiment.variants.find((variant) => variant.variant === 'A')!;
                    const b = experiment.variants.find((variant) => variant.variant === 'B')!;
                    const liftPositive = (experiment.lift ?? 0) >= 0;
                    const totalExposure = a.exposure + b.exposure;
                    return (
                        <article key={experiment.id} className="rounded-3xl border border-foreground/10 bg-background p-5 shadow-sm sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{experiment.id}</p>
                                    <h2 className="mt-2 text-xl font-semibold">{experiment.name}</h2>
                                </div>
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live</span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{experiment.hypothesis}</p>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {[a, b].map((variant) => (
                                    <div key={variant.variant} className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold">Variant {variant.variant}</span>
                                            <span className="font-mono text-[10px] text-muted-foreground">n={variant.exposure}</span>
                                        </div>
                                        <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{variant.label}</p>
                                        <p className="mt-3 text-2xl font-semibold tabular-nums">{percent(variant.conversionRate)}</p>
                                        <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{metricLabel(experiment.primaryEvent)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 px-4 py-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">B vs A lift</p>
                                    <p className="mt-1 font-mono text-lg font-bold">{experiment.lift === null ? '—' : `${experiment.lift >= 0 ? '+' : ''}${percent(experiment.lift)}`}</p>
                                </div>
                                {experiment.lift === null ? null : liftPositive ? <TrendingUp className="size-5 text-emerald-500" /> : <TrendingDown className="size-5 text-rose-500" />}
                            </div>

                            <div className="mt-4 border-t border-foreground/10 pt-4">
                                <div className="flex justify-between text-xs text-muted-foreground"><span>Total exposures</span><span className="font-mono text-foreground">{totalExposure}</span></div>
                                <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
                                    {['engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open'].map((event) => (
                                        <div key={event} className="flex justify-between gap-2"><span>{metricLabel(event)}</span><span className="font-mono text-foreground/75">{(a.events[event] ?? 0) + (b.events[event] ?? 0)}</span></div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] px-5 py-4 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Interpretation:</span> do not choose a winner from a handful of visits. Let each variant collect a meaningful sample and compare the primary conversion rate, not only the raw event count.
            </div>
        </div>
    );
}
