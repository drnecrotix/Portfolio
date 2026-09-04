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

type AbStats = {
    absoluteDifference: number;
    ciLow: number;
    ciHigh: number;
    pValue: number;
    evidence: number;
};

const ANALYSIS_GUARDRAIL_PER_VARIANT = 50;
const supportEvents = ['engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open'] as const;

function percent(value: number) {
    return `${(value * 100).toFixed(Math.abs(value) >= 0.1 ? 1 : 2)}%`;
}

function percentagePoints(value: number) {
    const points = value * 100;
    return `${points >= 0 ? '+' : ''}${points.toFixed(2)} pp`;
}

function metricLabel(value: string) {
    return value.replaceAll('_', ' ');
}

function normalCdf(value: number) {
    const z = Math.abs(value);
    const t = 1 / (1 + 0.2316419 * z);
    const density = 0.3989422804014327 * Math.exp(-(z * z) / 2);
    const polynomial = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const probability = 1 - density * polynomial;
    return value >= 0 ? probability : 1 - probability;
}

function calculateAbStats(a: VariantSummary, b: VariantSummary): AbStats | null {
    if (a.exposure <= 0 || b.exposure <= 0) return null;

    const rateA = a.primary / a.exposure;
    const rateB = b.primary / b.exposure;
    const absoluteDifference = rateB - rateA;
    const unpooledVariance = (rateA * (1 - rateA)) / a.exposure + (rateB * (1 - rateB)) / b.exposure;
    const unpooledSe = Math.sqrt(Math.max(0, unpooledVariance));
    const pooled = (a.primary + b.primary) / (a.exposure + b.exposure);
    const pooledSe = Math.sqrt(Math.max(0, pooled * (1 - pooled) * (1 / a.exposure + 1 / b.exposure)));
    const z = pooledSe > 0 ? absoluteDifference / pooledSe : 0;
    const pValue = pooledSe > 0 ? Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z))))) : 1;

    return {
        absoluteDifference,
        ciLow: absoluteDifference - 1.96 * unpooledSe,
        ciHigh: absoluteDifference + 1.96 * unpooledSe,
        pValue,
        evidence: Math.max(0, Math.min(1, 1 - pValue)),
    };
}

function sampleState(a: VariantSummary, b: VariantSummary) {
    const minimum = Math.min(a.exposure, b.exposure);
    if (minimum < 20) return { label: 'Collecting data', note: 'Both variants need more exposure before the direction is useful.' };
    if (minimum < ANALYSIS_GUARDRAIL_PER_VARIANT) return { label: 'Developing signal', note: `Aim for at least ${ANALYSIS_GUARDRAIL_PER_VARIANT} exposures per variant before evaluating the statistical signal.` };
    return { label: 'Evaluation window', note: 'The sample guardrail is met. Check split balance, effect size and statistical signal together.' };
}

function pValueLabel(value: number | null | undefined) {
    if (value === null || value === undefined) return 'Not available';
    if (value < 0.001) return '< 0.001';
    return value.toFixed(3);
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
        let evaluable = 0;
        let strongSignals = 0;
        let imbalanced = 0;

        for (const experiment of experiments) {
            const a = experiment.variants.find((variant) => variant.variant === 'A');
            const b = experiment.variants.find((variant) => variant.variant === 'B');
            if (!a || !b) continue;
            const total = a.exposure + b.exposure;
            const aShare = total ? a.exposure / total : 0.5;
            const splitWarning = total >= 20 && (aShare < 0.4 || aShare > 0.6);
            const stats = calculateAbStats(a, b);
            exposures += total;
            if (Math.min(a.exposure, b.exposure) >= ANALYSIS_GUARDRAIL_PER_VARIANT) evaluable += 1;
            if (stats && stats.pValue < 0.05 && Math.min(a.exposure, b.exposure) >= ANALYSIS_GUARDRAIL_PER_VARIANT && !splitWarning) strongSignals += 1;
            if (splitWarning) imbalanced += 1;
        }

        return { tests: experiments.length, exposures, evaluable, strongSignals, imbalanced };
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Measurement</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Experiments</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A/B tests and audience analytics are separated into focused views. The test view now combines conversion, effect size, sample balance and a statistical signal instead of relying on lift alone.</p>
                </div>
                {view === 'tests' ? (
                    <button type="button" onClick={() => void refresh(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.035] px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.065] disabled:opacity-50">
                        <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
                        Refresh tests
                    </button>
                ) : null}
            </div>

            <div className="inline-flex w-full rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-1 sm:w-auto">
                <button type="button" onClick={() => setView('tests')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'tests' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><FlaskConical className="size-4" /> A/B tests</button>
                <button type="button" onClick={() => setView('audience')} className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none', view === 'audience' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}><Globe2 className="size-4" /> Audience & traffic</button>
            </div>

            {view === 'audience' ? (
                <TrafficAnalyticsPanel
                    showMap
                    initialRange="7d"
                    title="Audience & traffic"
                    description="Interactive country, device and traffic analytics. Country attribution prefers hosting headers and falls back to a short-lived request IP lookup when those headers are unavailable. City and precise location are not collected."
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {[
                            ['Active tests', overview.tests],
                            ['Total exposures', overview.exposures],
                            ['Guardrail met', overview.evaluable],
                            ['Strong signals', overview.strongSignals],
                            ['Split warnings', overview.imbalanced],
                        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-5">
                        <span className="font-medium text-foreground">Analysis order:</span> primary conversion → absolute difference → sample balance → statistical signal. Relative lift is context, not the decision by itself. The statistical values are approximate two-proportion comparisons and are most useful after the sample guardrail is met.
                        {data?.updatedAt ? <span className="ml-2">Last update: {new Date(data.updatedAt).toLocaleTimeString()}</span> : null}
                    </div>

                    {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 dark:text-red-300">{error}</div> : null}
                    {!data && !error ? <div className="rounded-2xl border border-foreground/10 p-8 text-sm text-muted-foreground">Loading experiment data…</div> : null}

                    <div className="space-y-4">
                        {data?.experiments.map((experiment) => {
                            const a = experiment.variants.find((variant) => variant.variant === 'A')!;
                            const b = experiment.variants.find((variant) => variant.variant === 'B')!;
                            const totalExposure = a.exposure + b.exposure;
                            const state = sampleState(a, b);
                            const aShare = totalExposure > 0 ? a.exposure / totalExposure : 0.5;
                            const bShare = totalExposure > 0 ? b.exposure / totalExposure : 0.5;
                            const imbalance = totalExposure >= 20 && (aShare < 0.4 || aShare > 0.6);
                            const leader = a.conversionRate === b.conversionRate ? null : a.conversionRate > b.conversionRate ? 'A' : 'B';
                            const stats = calculateAbStats(a, b);
                            const liftPositive = (experiment.lift ?? 0) >= 0;
                            const guardrailMet = Math.min(a.exposure, b.exposure) >= ANALYSIS_GUARDRAIL_PER_VARIANT;
                            const strongSignal = Boolean(stats && stats.pValue < 0.05 && guardrailMet && !imbalance);

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
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5 text-left lg:text-right"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Primary metric</p><p className="mt-1 text-sm font-medium capitalize">{metricLabel(experiment.primaryEvent)}</p></div>
                                    </div>

                                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                        {[a, b].map((variant) => {
                                            const isA = variant.variant === 'A';
                                            const isLeader = leader === variant.variant;
                                            return (
                                                <div key={variant.variant} className={cn('rounded-2xl border p-4 sm:p-5', isA ? 'border-violet-500/25 bg-violet-500/[0.075]' : 'border-sky-500/25 bg-sky-500/[0.075]')}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2"><span className={cn('rounded-md px-2 py-1 font-mono text-[11px] font-bold', isA ? 'bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'bg-sky-500/15 text-sky-700 dark:text-sky-200')}>Variant {variant.variant}</span>{isLeader ? <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', isA ? 'bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'bg-sky-500/15 text-sky-700 dark:text-sky-200')}>Ahead</span> : null}</div>
                                                            <p className="mt-2 text-xs leading-5 text-foreground/70">{variant.label}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-5 flex items-end justify-between gap-4">
                                                        <div><p className="text-3xl font-semibold tabular-nums text-foreground">{percent(variant.conversionRate)}</p><p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-foreground/60">Primary conversion</p></div>
                                                        <div className="text-right text-xs text-foreground/65"><p><strong className="text-foreground">{variant.primary}</strong> actions</p><p className="mt-1"><strong className="text-foreground">{variant.exposure}</strong> exposures</p></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Absolute difference</p><p className="mt-1 text-sm font-semibold">{stats ? percentagePoints(stats.absoluteDifference) : 'Not available'}</p><p className="mt-1 text-[10px] text-muted-foreground">B conversion minus A</p></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Relative lift B vs A</p><div className="mt-1 flex items-center gap-2 text-sm font-semibold">{experiment.lift === null ? 'Not available' : `${experiment.lift >= 0 ? '+' : ''}${percent(experiment.lift)}`}{experiment.lift === null ? null : liftPositive ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-rose-500" />}</div></div>
                                        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.018] p-3"><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Statistical signal</p><p className="mt-1 text-sm font-semibold">{stats ? `${(stats.evidence * 100).toFixed(1)}% evidence` : 'Not available'}</p><p className="mt-1 text-[10px] text-muted-foreground">two-sided p = {pValueLabel(stats?.pValue)}</p></div>
                                        <div className={cn('rounded-xl border p-3', strongSignal ? 'border-emerald-500/25 bg-emerald-500/[0.055]' : 'border-foreground/10 bg-foreground/[0.018]')}><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Decision status</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold">{strongSignal ? <><CheckCircle2 className="size-4 text-emerald-500" /> Strong signal</> : leader ? `Variant ${leader} currently ahead` : 'No clear leader'}</p><p className="mt-1 text-[10px] text-muted-foreground">{guardrailMet ? 'Sample guardrail met' : `Need ${Math.max(0, ANALYSIS_GUARDRAIL_PER_VARIANT - Math.min(a.exposure, b.exposure))} more on the smaller variant`}</p></div>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.012] p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Sample balance</p><p className="mt-1 text-xs text-muted-foreground">A {(aShare * 100).toFixed(0)}% · B {(bShare * 100).toFixed(0)}% · {totalExposure} total exposures</p></div><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', imbalance ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>{imbalance ? 'Outside 40/60' : 'Balanced'}</span></div>
                                        <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-foreground/10"><div className="bg-violet-500" style={{ width: `${aShare * 100}%` }} /><div className="bg-sky-500" style={{ width: `${bShare * 100}%` }} /></div>
                                    </div>

                                    <details className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.012]">
                                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">Advanced details and supporting events</summary>
                                        <div className="border-t border-foreground/10 p-4">
                                            {imbalance ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.045] px-3 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-4 shrink-0" />The A/B split is outside 40/60. Keep collecting data before making a decision.</div> : <p className="mb-4 text-xs text-muted-foreground">{state.note}</p>}

                                            <div className="grid gap-3 lg:grid-cols-2">
                                                <div className="rounded-xl border border-foreground/10 bg-background/45 p-4">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">95% interval for B − A</p>
                                                    <p className="mt-2 font-mono text-sm font-semibold">{stats ? `${percentagePoints(stats.ciLow)} to ${percentagePoints(stats.ciHigh)}` : 'Not available'}</p>
                                                    <p className="mt-2 text-xs leading-5 text-muted-foreground">If this interval still crosses 0 percentage points, the observed difference is not yet stable enough to separate from random variation at the conventional 95% level.</p>
                                                </div>
                                                <div className="rounded-xl border border-foreground/10 bg-background/45 p-4">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Analysis guardrails</p>
                                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground"><p>• At least {ANALYSIS_GUARDRAIL_PER_VARIANT} exposures per variant</p><p>• A/B allocation ideally within 40/60</p><p>• Two-sided p &lt; 0.05 for a strong statistical signal</p><p>• Effect size must still be meaningful for the design decision</p></div>
                                                </div>
                                            </div>

                                            <div className="mt-4 overflow-hidden rounded-xl border border-foreground/10">
                                                <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] bg-foreground/[0.025] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><span>Supporting event</span><span className="text-right text-violet-600 dark:text-violet-300">A</span><span className="text-right text-sky-600 dark:text-sky-300">B</span></div>
                                                {supportEvents.map((event) => <div key={event} className="grid grid-cols-[minmax(0,1fr)_80px_80px] border-t border-foreground/10 px-3 py-2.5 text-xs"><span className="capitalize text-muted-foreground">{metricLabel(event)}</span><span className="text-right font-mono">{a.events[event] ?? 0}</span><span className="text-right font-mono">{b.events[event] ?? 0}</span></div>)}
                                            </div>
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.045] px-5 py-4 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">Interpretation:</span> statistical significance does not automatically mean a design should be changed. Use the signal together with the size of the conversion difference, balanced exposure and the actual UX goal.</div>
                </>
            )}
        </div>
    );
}
