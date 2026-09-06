'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    FlaskConical,
    Globe2,
    RefreshCw,
    ShieldCheck,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { TrafficAnalyticsPanel } from './TrafficAnalyticsPanel';
import { cn } from '@/lib/utils';

type Interval = [number, number];
type DecisionState = 'COLLECTING' | 'QUALITY_ISSUE' | 'FAVORS_A' | 'FAVORS_B' | 'INCONCLUSIVE';

type VariantSummary = {
    variant: 'A' | 'B';
    label: string;
    exposure: number;
    primary: number;
    conversionRate: number;
    interval: Interval;
    events: Record<string, number | undefined>;
};

type Comparison = {
    controlRate: number;
    variantRate: number;
    absoluteDelta: number;
    relativeLift: number | null;
    pValue: number | null;
    confidence: number | null;
    controlInterval: Interval;
    variantInterval: Interval;
    differenceInterval: Interval;
    significant: boolean;
    evidence: string;
};

type SampleRatio = {
    expectedA: number;
    expectedB: number;
    observedA: number;
    observedB: number;
    shareA: number;
    shareB: number;
    chiSquare: number | null;
    pValue: number | null;
    healthy: boolean;
};

type SecondaryMetric = {
    event: string;
    label: string;
    controlSuccesses: number;
    variantSuccesses: number;
    controlRate: number;
    variantRate: number;
    absoluteDelta: number;
    relativeLift: number | null;
    pValue: number | null;
    confidence: number | null;
    differenceInterval: Interval;
    significant: boolean;
    evidence: string;
};

type TrendRow = {
    key: string;
    label: string;
    exposureA: number;
    exposureB: number;
    primaryA: number;
    primaryB: number;
};

type ExperimentSummary = {
    id: string;
    name: string;
    hypothesis: string;
    scope: string;
    status: 'RUNNING' | 'PAUSED' | 'ENDED';
    primaryEvent: string;
    primaryLabel: string;
    minimumSamplePerVariant: number;
    expectedAllocation: { A: number; B: number };
    variants: VariantSummary[];
    comparison: Comparison;
    srm: SampleRatio;
    decision: {
        state: DecisionState;
        label: string;
        note: string;
        progress: number;
    };
    secondaryMetrics: SecondaryMetric[];
    trend: TrendRow[];
};

type Payload = {
    summary: {
        running: number;
        totalExposures: number;
        decisionReady: number;
        qualityIssues: number;
        retentionDays: number;
        measurementStartedAt: string | null;
    };
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

function pValueLabel(value: number | null) {
    if (value === null) return 'Not available';
    if (value < 0.001) return '< 0.001';
    return value.toFixed(3);
}

function intervalLabel(interval: Interval, asDelta = false) {
    return `${asDelta ? percentagePoints(interval[0]) : percent(interval[0])} to ${asDelta ? percentagePoints(interval[1]) : percent(interval[1])}`;
}

function decisionTone(state: DecisionState) {
    if (state === 'FAVORS_B') return 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300';
    if (state === 'FAVORS_A') return 'border-rose-500/25 bg-rose-500/[0.07] text-rose-700 dark:text-rose-300';
    if (state === 'QUALITY_ISSUE') return 'border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300';
    return 'border-foreground/10 bg-foreground/[0.035] text-muted-foreground';
}

function DecisionIcon({ state }: { state: DecisionState }) {
    if (state === 'FAVORS_B') return <TrendingUp className="size-4" />;
    if (state === 'FAVORS_A') return <TrendingDown className="size-4" />;
    if (state === 'QUALITY_ISSUE') return <AlertTriangle className="size-4" />;
    if (state === 'INCONCLUSIVE') return <CheckCircle2 className="size-4" />;
    return <Activity className="size-4" />;
}

function ExperimentTrend({ rows }: { rows: TrendRow[] }) {
    const maxExposure = Math.max(1, ...rows.map((row) => Math.max(row.exposureA, row.exposureB)));
    return (
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Last 14 days</p>
                    <h4 className="mt-1 text-sm font-semibold">Exposure velocity</h4>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-foreground/75" /> A</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> B</span>
                </div>
            </div>
            <div className="mt-4 flex h-24 items-end gap-1.5">
                {rows.map((row, index) => {
                    const showLabel = index === 0 || index === rows.length - 1 || index % 4 === 0;
                    return (
                        <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" title={`${row.label} - A ${row.exposureA} exposures / ${row.primaryA} primary events, B ${row.exposureB} exposures / ${row.primaryB} primary events`}>
                            <div className="flex w-full flex-1 items-end justify-center gap-[2px]">
                                <div className="w-[42%] rounded-t-sm bg-foreground/70" style={{ height: `${row.exposureA ? Math.max(6, row.exposureA / maxExposure * 100) : 2}%` }} />
                                <div className="w-[42%] rounded-t-sm bg-emerald-500/80" style={{ height: `${row.exposureB ? Math.max(6, row.exposureB / maxExposure * 100) : 2}%` }} />
                            </div>
                            <span className="mt-1 h-3 truncate text-[8px] text-muted-foreground">{showLabel ? row.label : ''}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function VariantCard({ variant, primaryLabel }: { variant: VariantSummary; primaryLabel: string }) {
    return (
        <div className={cn('rounded-2xl border p-4', variant.variant === 'B' ? 'border-emerald-500/20 bg-emerald-500/[0.025]' : 'border-foreground/10 bg-foreground/[0.015]')}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={cn('rounded-md px-2 py-1 text-[10px] font-bold', variant.variant === 'B' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-foreground/[0.06]')}>Variant {variant.variant}</span>
                        {variant.variant === 'A' ? <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Control</span> : null}
                    </div>
                    <p className="mt-2 text-sm font-medium">{variant.label}</p>
                </div>
                <p className="text-right text-2xl font-semibold tabular-nums">{percent(variant.conversionRate)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-foreground/8 bg-background/40 px-3 py-2.5">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Exposed</p>
                    <p className="mt-1 font-mono font-semibold">{variant.exposure}</p>
                </div>
                <div className="rounded-xl border border-foreground/8 bg-background/40 px-3 py-2.5">
                    <p className="truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{primaryLabel}</p>
                    <p className="mt-1 font-mono font-semibold">{variant.primary}</p>
                </div>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-muted-foreground">95% CI {intervalLabel(variant.interval)}</p>
        </div>
    );
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
        const timer = window.setInterval(() => void refresh(), 10000);
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(timer);
        };
    }, [refresh]);

    const qualityExperiments = useMemo(
        () => data?.experiments.filter((experiment) => !experiment.srm.healthy && experiment.srm.observedA + experiment.srm.observedB >= 40) || [],
        [data],
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Experimentation</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">A/B tests</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Decision-focused experiments with unique browser-session measurement, sample-ratio checks, confidence intervals and secondary metrics.</p>
                </div>
                <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50">
                    <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                    Refresh
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
                    description="Live and period traffic analytics with pages, visits, countries, optional live city headers and device distribution."
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><div className="flex items-center justify-between text-muted-foreground"><p className="text-[10px] uppercase tracking-[0.14em]">Running</p><FlaskConical className="size-4" /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.summary.running ?? 0}</p></div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><div className="flex items-center justify-between text-muted-foreground"><p className="text-[10px] uppercase tracking-[0.14em]">Clean exposures</p><Users className="size-4" /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.summary.totalExposures ?? 0}</p></div>
                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><div className="flex items-center justify-between text-muted-foreground"><p className="text-[10px] uppercase tracking-[0.14em]">Decision ready</p><Target className="size-4" /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.summary.decisionReady ?? 0}</p></div>
                        <div className={cn('rounded-2xl border p-4', data?.summary.qualityIssues ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-emerald-500/20 bg-emerald-500/[0.045]')}><div className="flex items-center justify-between text-muted-foreground"><p className="text-[10px] uppercase tracking-[0.14em]">Data quality</p><ShieldCheck className="size-4" /></div><p className="mt-2 text-lg font-semibold">{data?.summary.qualityIssues ? `${data.summary.qualityIssues} issue${data.summary.qualityIssues === 1 ? '' : 's'}` : 'Healthy'}</p></div>
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] px-4 py-3 text-[11px] leading-5 text-muted-foreground sm:px-5">
                        <strong className="text-foreground">Methodology:</strong> unique browser-session events, configured 50/50 allocation, 95% confidence intervals, two-sided proportion tests and an SRM warning when split probability falls below 0.01. Statistical decisions use only the clean session-level measurement introduced in v1.2.24, not older raw event counters.
                        {data?.summary.measurementStartedAt ? <span className="ml-1">Clean sample started {new Date(data.summary.measurementStartedAt).toLocaleString()} and is retained for {data.summary.retentionDays} days.</span> : <span className="ml-1">Clean sample will begin after the first post-update experiment event.</span>}
                    </div>

                    {qualityExperiments.length ? (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                                <div>
                                    <p className="font-semibold">Sample ratio mismatch detected</p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Do not make a rollout decision from an experiment with an unexpected A/B allocation. Check assignment and exposure instrumentation first.</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {qualityExperiments.map((experiment) => <span key={experiment.id} className="rounded-lg border border-amber-500/20 bg-background/50 px-3 py-2 text-xs"><strong>{experiment.name}</strong> - A {percent(experiment.srm.shareA, 0)} / B {percent(experiment.srm.shareB, 0)}, p {pValueLabel(experiment.srm.pValue)}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
                    {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

                    <div className="space-y-4">
                        {data?.experiments.map((experiment) => {
                            const control = experiment.variants.find((variant) => variant.variant === 'A')!;
                            const treatment = experiment.variants.find((variant) => variant.variant === 'B')!;
                            const samplePercent = Math.round(experiment.decision.progress * 100);
                            const maxSample = Math.max(experiment.minimumSamplePerVariant, control.exposure, treatment.exposure);

                            return (
                                <article key={experiment.id} className="rounded-3xl border border-foreground/10 bg-background p-4 sm:p-5">
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 max-w-4xl">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FlaskConical className="size-4 text-muted-foreground" />
                                                <h2 className="text-lg font-semibold sm:text-xl">{experiment.name}</h2>
                                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">{experiment.status}</span>
                                                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]', decisionTone(experiment.decision.state))}><DecisionIcon state={experiment.decision.state} /> {experiment.decision.label}</span>
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{experiment.hypothesis}</p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">Scope: {experiment.scope} · ID: <span className="font-mono">{experiment.id}</span></p>
                                        </div>
                                        <div className="shrink-0 text-left xl:text-right">
                                            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Primary metric</p>
                                            <p className="mt-1 text-sm font-semibold">{experiment.primaryLabel}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] px-3 py-3">
                                            <div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Sample progress</span><span className="font-mono text-[10px]">{samplePercent}%</span></div>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(100, samplePercent)}%` }} /></div>
                                            <p className="mt-2 text-[10px] text-muted-foreground">A {control.exposure}/{experiment.minimumSamplePerVariant} · B {treatment.exposure}/{experiment.minimumSamplePerVariant}</p>
                                        </div>
                                        <div className={cn('rounded-xl border px-3 py-3', experiment.srm.healthy ? 'border-foreground/10 bg-foreground/[0.018]' : 'border-amber-500/25 bg-amber-500/[0.055]')}>
                                            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Traffic split / SRM</span>
                                            <p className="mt-1 font-mono text-sm font-semibold">A {percent(experiment.srm.shareA, 0)} · B {percent(experiment.srm.shareB, 0)}</p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">SRM p {pValueLabel(experiment.srm.pValue)}</p>
                                        </div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] px-3 py-3">
                                            <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Evidence</span>
                                            <p className="mt-1 text-sm font-semibold">{experiment.comparison.evidence}</p>
                                            <p className="mt-1 text-[10px] text-muted-foreground">p {pValueLabel(experiment.comparison.pValue)}</p>
                                        </div>
                                        <div className={cn('rounded-xl border px-3 py-3', decisionTone(experiment.decision.state))}>
                                            <span className="text-[9px] uppercase tracking-[0.12em] opacity-70">Decision</span>
                                            <p className="mt-1 text-sm font-semibold">{experiment.decision.label}</p>
                                            <p className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-75">{experiment.decision.note}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.52fr)_minmax(0,1fr)]">
                                        <VariantCard variant={control} primaryLabel={experiment.primaryLabel} />
                                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 text-center">
                                            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">B vs A</p>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div><p className="text-xl font-semibold tabular-nums">{percentagePoints(experiment.comparison.absoluteDelta)}</p><p className="mt-1 text-[9px] text-muted-foreground">absolute delta</p></div>
                                                <div><p className="text-xl font-semibold tabular-nums">{experiment.comparison.relativeLift === null ? '—' : percent(experiment.comparison.relativeLift)}</p><p className="mt-1 text-[9px] text-muted-foreground">relative lift</p></div>
                                            </div>
                                            <div className="mt-4 space-y-2 border-t border-foreground/10 pt-3 text-left text-[10px] text-muted-foreground">
                                                <p><strong className="text-foreground">95% delta CI:</strong> {intervalLabel(experiment.comparison.differenceInterval, true)}</p>
                                                <p><strong className="text-foreground">p-value:</strong> {pValueLabel(experiment.comparison.pValue)}</p>
                                                <p><strong className="text-foreground">Expected split:</strong> A {percent(experiment.expectedAllocation.A, 0)} / B {percent(experiment.expectedAllocation.B, 0)}</p>
                                            </div>
                                        </div>
                                        <VariantCard variant={treatment} primaryLabel={experiment.primaryLabel} />
                                    </div>

                                    <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                                        <ExperimentTrend rows={experiment.trend} />
                                        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4">
                                            <div className="flex items-end justify-between gap-3">
                                                <div><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Guardrails</p><h4 className="mt-1 text-sm font-semibold">Secondary metrics</h4></div>
                                                <span className="text-[9px] text-muted-foreground">Rates use exposed sessions as denominator</span>
                                            </div>
                                            <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
                                                <div className="grid min-w-[610px] grid-cols-[minmax(180px,1fr)_90px_90px_90px_100px] bg-foreground/[0.035] px-3 py-2 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                                                    <span>Metric</span><span className="text-right">A</span><span className="text-right">B</span><span className="text-right">Delta</span><span className="text-right">Evidence</span>
                                                </div>
                                                {experiment.secondaryMetrics.map((metric) => (
                                                    <div key={metric.event} className="grid min-w-[610px] grid-cols-[minmax(180px,1fr)_90px_90px_90px_100px] border-t border-foreground/8 px-3 py-2.5 text-xs">
                                                        <div className="min-w-0"><p className="truncate font-medium">{metric.label}</p><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{metric.event}</p></div>
                                                        <span className="text-right font-mono">{percent(metric.controlRate)}</span>
                                                        <span className="text-right font-mono">{percent(metric.variantRate)}</span>
                                                        <span className={cn('text-right font-mono', metric.absoluteDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : metric.absoluteDelta < 0 ? 'text-rose-600 dark:text-rose-400' : '')}>{percentagePoints(metric.absoluteDelta)}</span>
                                                        <span className="truncate text-right text-[10px] text-muted-foreground" title={`${metric.evidence}; p ${pValueLabel(metric.pValue)}`}>{metric.evidence}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={cn('mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between', experiment.srm.healthy ? 'border-foreground/10 bg-foreground/[0.018]' : 'border-amber-500/25 bg-amber-500/[0.055]')}>
                                        <div className="flex items-start gap-2"><DecisionIcon state={experiment.decision.state} /><p className="leading-5"><strong>{experiment.decision.label}.</strong> <span className="text-muted-foreground">{experiment.decision.note}</span></p></div>
                                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">sample scale {Math.min(control.exposure, treatment.exposure)}/{maxSample}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <p className="text-[10px] leading-5 text-muted-foreground">A/B results are decision support, not proof of causality beyond the configured randomized experiment. A statistically significant primary metric should still be checked against secondary metrics and data-quality warnings before a rollout decision.{data?.updatedAt ? ` Last refresh ${new Date(data.updatedAt).toLocaleTimeString()}.` : ''}</p>
                </>
            )}
        </div>
    );
}
