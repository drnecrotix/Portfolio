'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, FlaskConical, Globe2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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

function percent(value: number, digits = Math.abs(value) >= 0.1 ? 1 : 2) {
    return `${(value * 100).toFixed(digits)}%`;
}

function percentagePoints(value: number) {
    const points = value * 100;
    return `${points >= 0 ? '+' : ''}${points.toFixed(2)} pp`;
}

function metricLabel(value: string) {
    return value.replaceAll('_', ' ');
}

function wilsonInterval(successes: number, total: number) {
    if (!total) return [0, 0] as const;
    const z = 1.96;
    const p = successes / total;
    const denominator = 1 + (z * z) / total;
    const center = (p + (z * z) / (2 * total)) / denominator;
    const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
    return [Math.max(0, center - margin), Math.min(1, center + margin)] as const;
}

function erf(value: number) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - polynomial * Math.exp(-x * x));
}

function twoProportionPValue(aSuccess: number, aTotal: number, bSuccess: number, bTotal: number) {
    if (!aTotal || !bTotal) return null;
    const pooled = (aSuccess + bSuccess) / (aTotal + bTotal);
    const variance = pooled * (1 - pooled) * (1 / aTotal + 1 / bTotal);
    if (variance <= 0) return null;
    const z = Math.abs((bSuccess / bTotal - aSuccess / aTotal) / Math.sqrt(variance));
    const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
    return Math.max(0, Math.min(1, 2 * (1 - cdf)));
}

function sampleState(aExposure: number, bExposure: number, pValue: number | null) {
    const total = aExposure + bExposure;
    const minimumArm = Math.min(aExposure, bExposure);
    if (minimumArm < 20) return { label: 'Collecting data', note: 'Both variants need more traffic before the comparison is useful.' };
    if (total < 120) return { label: 'Early signal', note: 'The direction is useful, but the sample is still small.' };
    if (pValue !== null && pValue < 0.05) return { label: 'Meaningful signal', note: 'The observed difference has stronger statistical evidence. Keep monitoring stability.' };
    return { label: 'Ready to evaluate', note: 'The sample is useful, but there is no strong difference yet.' };
}

function evidenceLabel(pValue: number | null, aExposure: number, bExposure: number) {
    if (Math.min(aExposure, bExposure) < 20 || pValue === null) return 'Not enough data';
    if (pValue < 0.01) return 'Strong evidence';
    if (pValue < 0.05) return 'Likely difference';
    if (pValue < 0.15) return 'Directional signal';
    return 'No clear difference';
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
        const warnings: Array<{ id: string; name: string; aShare: number; bShare: number }> = [];

        for (const experiment of experiments) {
            const a = experiment.variants.find((variant) => variant.variant === 'A');
            const b = experiment.variants.find((variant) => variant.variant === 'B');
            const total = (a?.exposure || 0) + (b?.exposure || 0);
            exposures += total;
            if (total >= 120 && Math.min(a?.exposure || 0, b?.exposure || 0) >= 20) ready += 1;
            if (total >= 20 && a && b) {
                const aShare = a.exposure / total;
                const bShare = b.exposure / total;
                if (aShare < 0.4 || aShare > 0.6) warnings.push({ id: experiment.id, name: experiment.name, aShare, bShare });
            }
        }

        return { tests: experiments.length, exposures, ready, warnings };
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Measurement</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Experiments</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A/B test performance and audience analytics are separated into focused views. Each test shows the primary result first, then statistical context and supporting events.</p>
                </div>
                <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50">
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                    Refresh tests
                </button>
            </div>

            <div className="inline-flex w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-1 sm:w-auto">
                <button type="button" onClick={() => setView('tests')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'tests' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><BarChart3 className="size-4" /> A/B tests</button>
                <button type="button" onClick={() => setView('audience')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'audience' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><Globe2 className="size-4" /> Audience & traffic</button>
            </div>

            {view === 'audience' ? (
                <TrafficAnalyticsPanel
                    showMap
                    refreshIntervalMs={5000}
                    title="Audience & traffic"
                    description="Interactive traffic, country and device analytics. Country headers are used first; if they are missing, a short-lived raw client IP is used only to resolve the country. No city or precise location is collected."
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Active tests</p><p className="mt-2 text-2xl font-semibold tabular-nums">{overview.tests}</p></div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total exposures</p><p className="mt-2 text-2xl font-semibold tabular-nums">{overview.exposures}</p></div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Ready to evaluate</p><p className="mt-2 text-2xl font-semibold tabular-nums">{overview.ready}</p></div>
                        <div className={cn('rounded-2xl border p-4', overview.warnings.length ? 'border-amber-500/25 bg-amber-500/[0.055]' : 'border-emerald-500/20 bg-emerald-500/[0.045]')}><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Split health</p><p className="mt-2 text-lg font-semibold">{overview.warnings.length ? `${overview.warnings.length} need attention` : 'Balanced'}</p></div>
                    </div>

                    {overview.warnings.length ? (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.055] p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                                <div>
                                    <p className="font-semibold">A/B split warning</p>
                                    <p className="mt-1 text-xs leading-5 text-foreground/70">These tests are outside the expected 40/60 range. The affected tests are listed here so you do not need to open every card to find the source.</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {overview.warnings.map((warning) => <span key={warning.id} className="rounded-lg border border-amber-500/20 bg-background/45 px-3 py-2 text-xs"><strong>{warning.name}</strong> · A {(warning.aShare * 100).toFixed(0)}% / B {(warning.bShare * 100).toFixed(0)}%</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
                        <span className="font-medium text-foreground">How to read a test:</span> compare conversion rate first, then the confidence interval and sample balance. Relative lift is useful context, but it can look dramatic when the sample is small.
                        {data?.updatedAt ? <span className="ml-2">Last update: {new Date(data.updatedAt).toLocaleTimeString()}</span> : null}
                    </div>

                    {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
                    {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

                    <div className="space-y-4">
                        {data?.experiments.map((experiment) => {
                            const a = experiment.variants.find((variant) => variant.variant === 'A')!;
                            const b = experiment.variants.find((variant) => variant.variant === 'B')!;
                            const totalExposure = a.exposure + b.exposure;
                            const aShare = totalExposure > 0 ? a.exposure / totalExposure : 0.5;
                            const bShare = totalExposure > 0 ? b.exposure / totalExposure : 0.5;
                            const imbalance = totalExposure >= 20 && (aShare < 0.4 || aShare > 0.6);
                            const pValue = twoProportionPValue(a.primary, a.exposure, b.primary, b.exposure);
                            const state = sampleState(a.exposure, b.exposure, pValue);
                            const leader = a.conversionRate === b.conversionRate ? null : a.conversionRate > b.conversionRate ? 'A' : 'B';
                            const liftPositive = (experiment.lift ?? 0) >= 0;
                            const absoluteDelta = b.conversionRate - a.conversionRate;
                            const confidence = pValue === null ? null : 1 - pValue;
                            const aInterval = wilsonInterval(a.primary, a.exposure);
                            const bInterval = wilsonInterval(b.primary, b.exposure);
                            const evidence = evidenceLabel(pValue, a.exposure, b.exposure);

                            return (
                                <article key={experiment.id} className="rounded-3xl border border-foreground/10 bg-background p-5 sm:p-6">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="max-w-3xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FlaskConical className="size-4 text-muted-foreground" />
                                                <h2 className="text-lg font-semibold sm:text-xl">{experiment.name}</h2>
                                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live</span>
                                                <span className="rounded-full border border-foreground/10 bg-foreground/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{state.label}</span>
                                                {imbalance ? <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Split A {(aShare * 100).toFixed(0)} / B {(bShare * 100).toFixed(0)}</span> : null}
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{experiment.hypothesis}</p>
                                        </div>
                                        <div className="text-left lg:text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Primary metric</p><p className="mt-1 text-sm font-medium capitalize">{metricLabel(experiment.primaryEvent)}</p></div>
                                    </div>

                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                        {[a, b].map((variant) => {
                                            const isA = variant.variant === 'A';
                                            const isLeader = leader === variant.variant;
                                            const interval = isA ? aInterval : bInterval;
                                            return (
                                                <div key={variant.variant} className={cn('rounded-2xl border p-4 sm:p-5', isA ? 'border-violet-500/25 bg-violet-500/[0.06]' : 'border-sky-500/25 bg-sky-500/[0.06]')}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div><p className={cn('font-mono text-xs font-bold', isA ? 'text-violet-700 dark:text-violet-300' : 'text-sky-700 dark:text-sky-300')}>Variant {variant.variant}</p><p className="mt-1 text-xs leading-5 text-foreground/70">{variant.label}</p></div>
                                                        {isLeader ? <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', isA ? 'bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'bg-sky-500/15 text-sky-700 dark:text-sky-200')}>Ahead</span> : null}
                                                    </div>
                                                    <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tabular-nums text-foreground">{percent(variant.conversionRate)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-foreground/60">conversion rate</p></div><div className="text-right text-xs text-foreground/65"><p><strong className="text-foreground">{variant.primary}</strong> conversions</p><p className="mt-1"><strong className="text-foreground">{variant.exposure}</strong> exposures</p></div></div>
                                                    <div className="mt-4 border-t border-foreground/10 pt-3 text-xs text-foreground/65"><span className="font-medium text-foreground">95% interval:</span> {percent(interval[0])} - {percent(interval[1])}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Absolute difference</p><p className="mt-1 text-sm font-semibold">{percentagePoints(absoluteDelta)}</p><p className="mt-1 text-[10px] text-muted-foreground">B minus A conversion</p></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Relative lift</p><div className="mt-1 flex items-center gap-2 text-sm font-semibold">{experiment.lift === null ? 'Not available' : `${experiment.lift >= 0 ? '+' : ''}${percent(experiment.lift)}`}{experiment.lift === null ? null : liftPositive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-rose-500" />}</div><p className="mt-1 text-[10px] text-muted-foreground">B compared with A</p></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Evidence</p><p className="mt-1 text-sm font-semibold">{evidence}</p><p className="mt-1 text-[10px] text-muted-foreground">{confidence === null ? 'Waiting for usable samples' : `${percent(confidence, 1)} descriptive confidence`}</p></div>
                                        <div className={cn('rounded-xl border p-3', imbalance ? 'border-amber-500/25 bg-amber-500/[0.05]' : 'border-emerald-500/20 bg-emerald-500/[0.035]')}><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Sample balance</p><p className="mt-1 text-sm font-semibold">A {(aShare * 100).toFixed(0)}% / B {(bShare * 100).toFixed(0)}%</p><p className="mt-1 text-[10px] text-muted-foreground">{imbalance ? 'Outside expected 40/60 range' : 'Within expected range'}</p></div>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.012] px-4 py-3 text-xs leading-5 text-muted-foreground">
                                        {imbalance ? <span className="inline-flex items-start gap-2 text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" />This test is the source of a split warning. Avoid choosing a winner until the allocation moves closer to 50/50.</span> : <span className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />{state.note}</span>}
                                    </div>

                                    <details className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.012]">
                                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">Supporting events and method</summary>
                                        <div className="border-t border-foreground/10 p-4">
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                                {['engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open'].map((event) => <div key={event} className="rounded-xl bg-foreground/[0.025] px-3 py-2.5"><p className="text-[10px] text-muted-foreground">{metricLabel(event)}</p><p className="mt-1 font-mono text-sm font-semibold">{(a.events[event] ?? 0) + (b.events[event] ?? 0)}</p></div>)}
                                            </div>
                                            <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Intervals use a 95% Wilson interval. Evidence uses an approximate two-proportion z-test. These are decision aids, not an automatic stopping rule; traffic quality, sample balance and stability over time still matter.</p>
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
