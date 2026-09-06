'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, Globe2, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { AudienceWorldMap } from './AudienceWorldMap';
import { cn } from '@/lib/utils';
import type { TrafficRange } from '@/lib/traffic-analytics';

type LiveCountry = {
    code: string;
    name: string;
    visitors: number;
};

type LivePage = {
    path: string;
    visitors: number;
    countries: LiveCountry[];
    lastSeenAt: string;
};

type TrafficPayload = {
    range: TrafficRange;
    summary: {
        liveVisitors: number;
        livePages: number;
        pageViews: number;
        visits: number;
        countries: number;
    };
    live: {
        visitors: number;
        pages: LivePage[];
        countries: LiveCountry[];
        windowMinutes: number;
    };
    chart: Array<{ key: string; label: string; pageViews: number; visits: number }>;
    countries: Array<{ code: string; name: string; pageViews: number; visits: number; liveVisitors: number }>;
    devices: Array<{ device: string; pageViews: number; visits: number }>;
    retention: { aggregateDays: number; sessionHours: number; ipHours: number };
    updatedAt: string;
};

const rangeOptions: Array<{ value: TrafficRange; label: string }> = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

function rangeText(range: TrafficRange) {
    return range === '30d' ? 'last 30 days' : 'last 7 days';
}

function deviceLabel(device: string) {
    if (device === 'desktop') return 'Desktop';
    if (device === 'mobile') return 'Mobile';
    if (device === 'tablet') return 'Tablet';
    return 'Unknown';
}

function DeviceIcon({ device }: { device: string }) {
    if (device === 'mobile') return <Smartphone className="size-4" />;
    if (device === 'tablet') return <Tablet className="size-4" />;
    return <Monitor className="size-4" />;
}

function pageLabel(path: string) {
    if (path === '/') return 'Home';
    if (path === 'Unknown page') return path;
    return path;
}

function VisitsChart({ rows }: { rows: TrafficPayload['chart'] }) {
    const maxVisits = Math.max(1, ...rows.map((row) => row.visits));
    const totalVisits = rows.reduce((sum, row) => sum + row.visits, 0);
    const busiest = rows.reduce((best, row) => row.visits > best.visits ? row : best, rows[0] || { key: '', label: 'No data', visits: 0, pageViews: 0 });

    return (
        <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Visits over time</p>
                    <h4 className="mt-1 font-semibold">Daily visits</h4>
                    <p className="mt-1 text-xs text-muted-foreground">A visit is a browsing session, not every page that was opened.</p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-2xl font-semibold tabular-nums">{totalVisits}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">visits in range</p>
                </div>
            </div>

            <div className="mt-5 flex h-44 items-end gap-1.5 sm:gap-2">
                {rows.map((row, index) => {
                    const height = row.visits ? Math.max(5, (row.visits / maxVisits) * 100) : 2;
                    const showLabel = rows.length <= 10 || index === 0 || index === rows.length - 1 || index % 5 === 0;
                    return (
                        <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" title={`${row.label}: ${row.visits} visits`}>
                            <div className="flex w-full flex-1 items-end justify-center">
                                <div className={cn('w-full max-w-8 rounded-t-md bg-emerald-500/80 transition-all', row.key === busiest.key && 'bg-emerald-400')} style={{ height: `${height}%` }} />
                            </div>
                            <span className="mt-2 h-4 truncate text-[9px] text-muted-foreground">{showLabel ? row.label : ''}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs text-muted-foreground">
                Busiest day: <strong className="text-foreground">{busiest.label}</strong> with <strong className="text-foreground">{busiest.visits}</strong> visits.
            </div>
        </div>
    );
}

export function TrafficAnalyticsPanel({
    showMap = false,
    title = 'Traffic overview',
    description = 'See who is online now, what they are viewing, total visits and where visitors come from.',
    refreshIntervalMs = 10000,
}: {
    showMap?: boolean;
    title?: string;
    description?: string;
    refreshIntervalMs?: number;
}) {
    const [range, setRange] = useState<TrafficRange>('7d');
    const [data, setData] = useState<TrafficPayload | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

    const refresh = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true);
        try {
            const response = await fetch(`/api/admin/traffic?range=${range}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Traffic request failed (${response.status})`);
            setData(await response.json());
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load traffic analytics.');
        } finally {
            if (manual) setRefreshing(false);
        }
    }, [range]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => void refresh());
        const timer = window.setInterval(() => void refresh(), Math.max(5000, refreshIntervalMs));
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(timer);
        };
    }, [refresh, refreshIntervalMs]);

    const countries = useMemo(
        () => data?.countries.filter((country) => country.code !== 'XX' && country.visits > 0) || [],
        [data],
    );
    const topCountries = countries.slice(0, 10);
    const selectedCountry = countries.find((country) => country.code === selectedCountryCode) || countries[0] || null;
    const knownLivePages = data?.live.pages.filter((page) => page.path !== 'Unknown page') || [];
    const unknownLivePage = data?.live.pages.find((page) => page.path === 'Unknown page');
    const liveVisitors = data?.live.visitors ?? 0;
    const period = rangeText(range);

    return (
        <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.018] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Analytics</p>
                    <h3 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-foreground/10 bg-background/60 p-1">
                        {rangeOptions.map((option) => (
                            <button key={option.value} type="button" onClick={() => setRange(option.value)} className={cn('rounded-lg px-3 py-2 text-xs font-medium transition', range === option.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => void refresh(true)} className="rounded-xl border border-foreground/10 p-2.5 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground" aria-label="Refresh traffic analytics">
                        <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {error ? <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div> : null}

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div aria-live="polite" className={cn('rounded-2xl border p-4 transition-colors duration-500', liveVisitors ? 'border-emerald-500/25 bg-emerald-500/[0.07]' : 'border-foreground/10 bg-background/50')}>
                    <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400"><span className="text-[10px] uppercase tracking-[0.15em]">Visitors online</span><Activity className="size-4" /></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{liveVisitors}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Active in the last {data?.live.windowMinutes ?? 5} minutes</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Pages active now</span><Monitor className="size-4" /></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{knownLivePages.length}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Different public pages currently being viewed</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Visits</span><Users className="size-4" /></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{data?.summary.visits ?? 0}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Total browsing visits in the {period}</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Countries</span><Globe2 className="size-4" /></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{data?.summary.countries ?? 0}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Countries that generated visits in the {period}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Live now</p>
                            <h4 className="mt-1 font-semibold">Pages being viewed</h4>
                            <p className="mt-1 text-xs text-muted-foreground">Automatically refreshed from active visitor heartbeats.</p>
                        </div>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{liveVisitors} online</span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {knownLivePages.length ? knownLivePages.slice(0, 10).map((page) => (
                            <div key={page.path} className="flex flex-col gap-2 rounded-xl border border-foreground/10 bg-background/55 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <Link href={page.path} target="_blank" className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium hover:underline">
                                        <span className="truncate">{pageLabel(page.path)}</span><ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                                    </Link>
                                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                        {page.countries.map((country) => `${country.name}${country.visitors > 1 ? ` (${country.visitors})` : ''}`).join(', ') || 'Country unavailable'}
                                    </p>
                                </div>
                                <div className="shrink-0 text-left sm:text-right"><span className="text-lg font-semibold tabular-nums">{page.visitors}</span><span className="ml-1 text-[10px] text-muted-foreground">{page.visitors === 1 ? 'visitor' : 'visitors'}</span></div>
                            </div>
                        )) : <p className="rounded-xl border border-dashed border-foreground/15 px-4 py-8 text-center text-xs text-muted-foreground">No active public pages right now.</p>}
                        {unknownLivePage?.visitors ? <p className="px-1 pt-1 text-[10px] text-muted-foreground">{unknownLivePage.visitors} older active session{unknownLivePage.visitors === 1 ? '' : 's'} do not have a page path yet and will become identifiable after their next heartbeat.</p> : null}
                    </div>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live audience</p>
                    <h4 className="mt-1 font-semibold">Visitors online by country</h4>
                    <div className="mt-4 space-y-2">
                        {data?.live.countries.length ? data.live.countries.map((country) => (
                            <div key={country.code} className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background/45 px-3 py-2.5 text-sm">
                                <span className="truncate">{country.name}</span><span className="font-mono text-xs text-muted-foreground">{country.visitors} online</span>
                            </div>
                        )) : <p className="py-6 text-center text-xs text-muted-foreground">No visitors online right now.</p>}
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <VisitsChart rows={data?.chart || []} />
            </div>

            <div className={cn('mt-5 grid gap-4', showMap && 'xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]')}>
                {showMap ? (
                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 sm:p-5">
                        <div className="mb-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Visual map</p>
                            <h4 className="mt-1 font-semibold">Where visits come from</h4>
                            <p className="mt-1 text-xs text-muted-foreground">The map is a visual aid. Exact visit counts are listed beside it.</p>
                        </div>
                        <AudienceWorldMap countries={data?.countries || []} selectedCode={selectedCountry?.code} />
                        {selectedCountry ? (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background/45 px-4 py-3 text-xs">
                                <span><strong>{selectedCountry.name}</strong></span>
                                <span className="text-muted-foreground"><strong className="text-foreground">{selectedCountry.visits}</strong> visits · <strong className="text-foreground">{selectedCountry.liveVisitors}</strong> online now</span>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 sm:p-5">
                    <div className="flex items-end justify-between gap-3">
                        <div><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Countries</p><h4 className="mt-1 font-semibold">Visits by country</h4></div>
                        <span className="text-[10px] text-muted-foreground">{period}</span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-foreground/10">
                        <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 bg-foreground/[0.035] px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            <span>Country</span><span className="text-right">Visits</span><span className="text-right">Online</span>
                        </div>
                        {topCountries.length ? topCountries.map((country) => (
                            <button key={country.code} type="button" onClick={() => setSelectedCountryCode(country.code)} className={cn('grid w-full grid-cols-[minmax(0,1fr)_80px_80px] gap-2 border-t border-foreground/8 px-3 py-2.5 text-left text-xs transition hover:bg-foreground/[0.03]', selectedCountry?.code === country.code && 'bg-foreground/[0.025]')}>
                                <span className="truncate">{country.name}</span><span className="text-right font-mono">{country.visits}</span><span className="text-right font-mono text-emerald-600 dark:text-emerald-400">{country.liveVisitors}</span>
                            </button>
                        )) : <p className="border-t border-foreground/8 px-4 py-8 text-center text-xs text-muted-foreground">No attributed country visits in this period yet.</p>}
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-2xl border border-foreground/10 bg-background/35 p-4">
                <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">Devices used for visits</h4><span className="text-[10px] text-muted-foreground">{period}</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {data?.devices.length ? data.devices.map((device) => (
                        <div key={device.device} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/45 px-3 py-3">
                            <span className="rounded-lg border border-foreground/10 p-2 text-muted-foreground"><DeviceIcon device={device.device} /></span>
                            <div><p className="text-xs font-medium">{deviceLabel(device.device)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{device.visits} visits</p></div>
                        </div>
                    )) : <p className="text-xs text-muted-foreground">No device data yet.</p>}
                </div>
            </div>

            <p className="mt-5 border-t border-foreground/10 pt-4 text-[10px] leading-5 text-muted-foreground">Live activity uses a short heartbeat and the current public path only. Country/device aggregates are kept for up to {data?.retention.aggregateDays ?? 31} days. Traffic session rows, including the raw client IP used only for country fallback, are removed after about {data?.retention.ipHours ?? 24} hours. City and precise location are not collected.{data?.updatedAt ? ` Last refresh ${new Date(data.updatedAt).toLocaleTimeString()}.` : ''}</p>
        </section>
    );
}
