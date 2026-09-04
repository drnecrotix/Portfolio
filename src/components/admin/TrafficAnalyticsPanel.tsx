'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Globe2, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { AudienceWorldMap } from './AudienceWorldMap';
import { cn } from '@/lib/utils';
import type { TrafficRange } from '@/lib/traffic-analytics';

type TrafficPayload = {
    range: TrafficRange;
    summary: { liveVisitors: number; pageViews: number; visits: number; countries: number };
    chart: Array<{ key: string; label: string; pageViews: number; visits: number }>;
    countries: Array<{ code: string; name: string; pageViews: number; visits: number }>;
    devices: Array<{ device: string; pageViews: number; visits: number }>;
    retention: { aggregateDays: number; sessionHours: number };
    updatedAt: string;
};

type ChartMode = 'timeline' | 'weekday';

const timelineRangeOptions: Array<{ value: TrafficRange; label: string }> = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

const weekdayRangeOptions: Array<{ value: TrafficRange; label: string }> = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

const weekdays = [
    { key: 'mon', short: 'Mon', long: 'Monday' },
    { key: 'tue', short: 'Tue', long: 'Tuesday' },
    { key: 'wed', short: 'Wed', long: 'Wednesday' },
    { key: 'thu', short: 'Thu', long: 'Thursday' },
    { key: 'fri', short: 'Fri', long: 'Friday' },
    { key: 'sat', short: 'Sat', long: 'Saturday' },
    { key: 'sun', short: 'Sun', long: 'Sunday' },
] as const;

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

function TimelineTrafficChart({ rows }: { rows: TrafficPayload['chart'] }) {
    const width = 1000;
    const height = 250;
    const paddingX = 34;
    const paddingY = 28;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;
    const maxValue = Math.max(1, ...rows.flatMap((row) => [row.pageViews, row.visits]));
    const points = (key: 'pageViews' | 'visits') => rows.map((row, index) => {
        const x = paddingX + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
        const y = paddingY + plotHeight - (row[key] / maxValue) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const labelIndexes = rows.length <= 4 ? rows.map((_, index) => index) : [0, Math.floor((rows.length - 1) / 2), rows.length - 1];

    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-sky-500" /> Pages opened</span>
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-violet-500" /> Visitor sessions</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pages opened and visitor sessions over time" className="h-auto w-full overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = paddingY + plotHeight * ratio;
                    return <line key={ratio} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="stroke-foreground/10" strokeWidth="1" />;
                })}
                <polyline points={points('pageViews')} fill="none" className="stroke-sky-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={points('visits')} fill="none" className="stroke-violet-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {labelIndexes.map((index) => {
                    const x = paddingX + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
                    return <text key={`${rows[index]?.key}-${index}`} x={x} y={height - 5} textAnchor={index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[20px]">{rows[index]?.label}</text>;
                })}
            </svg>
        </div>
    );
}

function WeekdayTrafficChart({ rows }: { rows: TrafficPayload['chart'] }) {
    const buckets = useMemo(() => {
        const result = weekdays.map((day) => ({ ...day, pageViews: 0, visits: 0, samples: 0 }));
        for (const row of rows) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(row.key)) continue;
            const date = new Date(`${row.key}T00:00:00Z`);
            const index = (date.getUTCDay() + 6) % 7;
            result[index].pageViews += row.pageViews;
            result[index].visits += row.visits;
            result[index].samples += 1;
        }
        return result.map((item) => ({
            ...item,
            averageViews: item.samples ? item.pageViews / item.samples : 0,
            averageVisits: item.samples ? item.visits / item.samples : 0,
        }));
    }, [rows]);

    const peak = buckets.reduce((best, item) => item.averageViews > best.averageViews ? item : best, buckets[0]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const selected = buckets.find((item) => item.key === selectedKey) || peak;
    const maxValue = Math.max(1, ...buckets.flatMap((item) => [item.averageViews, item.averageVisits]));
    const totalViews = buckets.reduce((sum, item) => sum + item.pageViews, 0);
    const totalVisits = buckets.reduce((sum, item) => sum + item.visits, 0);
    const pagesPerSession = totalVisits ? totalViews / totalVisits : 0;

    return (
        <div className="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Weekday pattern</p>
                    <h4 className="mt-1 font-semibold">Average activity by weekday</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Select a day to compare average page opens and anonymous browsing sessions.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-sky-500" /> Pages opened</span>
                    <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-violet-500" /> Sessions</span>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3">
                {buckets.map((item) => {
                    const active = selected.key === item.key;
                    return (
                        <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} onFocus={() => setSelectedKey(item.key)} onMouseEnter={() => setSelectedKey(item.key)} className={cn('rounded-xl border px-1.5 pb-2 pt-3 transition duration-300 sm:px-2', active ? 'border-sky-500/30 bg-sky-500/[0.05]' : 'border-transparent hover:border-foreground/10 hover:bg-background/50')}>
                            <div className="mx-auto flex h-28 items-end justify-center gap-1 sm:h-36 sm:gap-1.5">
                                <span className="w-2.5 rounded-t bg-sky-500 transition-[height] duration-500 sm:w-3.5" style={{ height: `${item.averageViews ? Math.max(7, (item.averageViews / maxValue) * 100) : 2}%` }} />
                                <span className="w-2.5 rounded-t bg-violet-500 transition-[height] duration-500 sm:w-3.5" style={{ height: `${item.averageVisits ? Math.max(7, (item.averageVisits / maxValue) * 100) : 2}%` }} />
                            </div>
                            <span className={cn('mt-2 block text-[10px] font-semibold sm:text-xs', active ? 'text-foreground' : 'text-muted-foreground')}>{item.short}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-foreground/10 bg-background/55 p-4 sm:col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Selected day</p>
                    <p className="mt-2 text-lg font-semibold">{selected.long}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{selected.averageViews.toFixed(1)}</strong> avg page opens</span>
                        <span><strong className="text-foreground">{selected.averageVisits.toFixed(1)}</strong> avg sessions</span>
                        <span><strong className="text-foreground">{selected.visits ? (selected.pageViews / selected.visits).toFixed(2) : '0.00'}</strong> pages/session</span>
                    </div>
                </div>
                <div className="rounded-xl border border-foreground/10 bg-background/45 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Busiest weekday</p><p className="mt-2 font-semibold">{peak.long}</p><p className="mt-1 text-xs text-muted-foreground">{peak.averageViews.toFixed(1)} avg page opens</p></div>
                <div className="rounded-xl border border-foreground/10 bg-background/45 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Session depth</p><p className="mt-2 font-semibold">{pagesPerSession.toFixed(2)}</p><p className="mt-1 text-xs text-muted-foreground">pages per session</p></div>
            </div>
        </div>
    );
}

export function TrafficAnalyticsPanel({
    showMap = false,
    title = 'Traffic',
    description = 'Short-retention, country and device level analytics.',
    chartMode = 'timeline',
    refreshIntervalMs = 15000,
}: {
    showMap?: boolean;
    title?: string;
    description?: string;
    chartMode?: ChartMode;
    refreshIntervalMs?: number;
}) {
    const [range, setRange] = useState<TrafficRange>(chartMode === 'weekday' ? '7d' : '24h');
    const [data, setData] = useState<TrafficPayload | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
    const rangeOptions = chartMode === 'weekday' ? weekdayRangeOptions : timelineRangeOptions;

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
        const timer = window.setInterval(() => void refresh(), Math.max(3000, refreshIntervalMs));
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(timer);
        };
    }, [refresh, refreshIntervalMs]);

    const topCountries = useMemo(() => data?.countries.filter((country) => country.code !== 'XX').slice(0, 8) || [], [data]);
    const unknownCountry = data?.countries.find((country) => country.code === 'XX');
    const selectedCountry = topCountries.find((country) => country.code === selectedCountryCode) || topCountries[0] || null;
    const totalDeviceViews = data?.devices.reduce((sum, device) => sum + device.pageViews, 0) || 0;
    const selectedCountryShare = selectedCountry && data?.summary.pageViews ? selectedCountry.pageViews / data.summary.pageViews : 0;
    const liveVisitors = data?.summary.liveVisitors ?? 0;
    const hasLiveVisitors = liveVisitors > 0;

    return (
        <section className="rounded-3xl border border-foreground/10 bg-foreground/[0.018] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Analytics</p>
                    <h3 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-foreground/10 bg-background/60 p-1">
                        {rangeOptions.map((option) => <button key={option.value} type="button" onClick={() => setRange(option.value)} className={cn('rounded-lg px-3 py-2 text-xs font-medium transition', range === option.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>{option.label}</button>)}
                    </div>
                    <button type="button" onClick={() => void refresh(true)} className="rounded-xl border border-foreground/10 p-2.5 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground" aria-label="Refresh traffic analytics"><RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /></button>
                </div>
            </div>

            {error ? <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div> : null}

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div aria-live="polite" className={cn('rounded-2xl border p-4 transition-colors duration-500', hasLiveVisitors ? 'border-emerald-500/25 bg-emerald-500/[0.07]' : 'border-rose-500/20 bg-rose-500/[0.045]')}>
                    <div className={cn('flex items-center justify-between gap-3', hasLiveVisitors ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}><span className="text-[10px] uppercase tracking-[0.15em]">Live now</span><span className="relative flex size-4 items-center justify-center"><span className={cn('absolute size-3 rounded-full opacity-30 animate-[pulse_1.1s_ease-in-out_infinite]', hasLiveVisitors ? 'bg-emerald-500' : 'bg-rose-500')} /><Activity className="relative size-4" /></span></div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">{liveVisitors}</p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Active visitors in the last 5 minutes</p>
                </div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4"><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Visitor sessions</span><Users className="size-4" /></div><p className="mt-3 text-2xl font-semibold tabular-nums">{data?.summary.visits ?? 0}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Anonymous browsing sessions in this period</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4"><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Pages opened</span><Monitor className="size-4" /></div><p className="mt-3 text-2xl font-semibold tabular-nums">{data?.summary.pageViews ?? 0}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Total public page loads in this period</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4"><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">Countries</span><Globe2 className="size-4" /></div><p className="mt-3 text-2xl font-semibold tabular-nums">{data?.summary.countries ?? 0}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Countries attributed by hosting headers</p></div>
            </div>

            {chartMode === 'weekday' ? <WeekdayTrafficChart rows={data?.chart || []} /> : <TimelineTrafficChart rows={data?.chart || []} />}

            <div className={cn('mt-5 grid gap-4', showMap && 'xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]')}>
                {showMap ? (
                    <div>
                        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Audience map</p><h4 className="mt-1 font-semibold">Countries by pages opened</h4></div><span className="text-xs text-muted-foreground">Country level only</span></div>
                        <AudienceWorldMap countries={data?.countries || []} selectedCode={selectedCountry?.code} />
                        {selectedCountry ? (
                            <div className="mt-3 rounded-xl border border-foreground/10 bg-background/45 p-4">
                                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Selected country</p><p className="mt-1 font-semibold">{selectedCountry.name}</p></div><p className="font-mono text-xs text-muted-foreground">{(selectedCountryShare * 100).toFixed(1)}% of page opens</p></div>
                                <div className="mt-3 flex gap-5 text-xs text-muted-foreground"><span><strong className="text-foreground">{selectedCountry.pageViews}</strong> pages opened</span><span><strong className="text-foreground">{selectedCountry.visits}</strong> sessions</span></div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className={cn('grid gap-4 sm:grid-cols-2', showMap && 'xl:grid-cols-1')}>
                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Top countries</h4><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pages / sessions</span></div>
                        <div className="mt-3 space-y-2.5">
                            {topCountries.length ? topCountries.map((country) => {
                                const max = Math.max(1, topCountries[0]?.pageViews || 1);
                                const active = selectedCountry?.code === country.code;
                                return (
                                    <button key={country.code} type="button" onClick={() => setSelectedCountryCode(country.code)} className={cn('block w-full rounded-xl border px-3 py-2.5 text-left transition', active ? 'border-sky-500/25 bg-sky-500/[0.04]' : 'border-transparent hover:border-foreground/10 hover:bg-foreground/[0.025]')}>
                                        <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{country.name}</span><span className="font-mono text-muted-foreground">{country.pageViews} / {country.visits}</span></div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, (country.pageViews / max) * 100)}%` }} /></div>
                                    </button>
                                );
                            }) : <p className="py-4 text-xs leading-5 text-muted-foreground">Country attribution is not available yet. The app checks common CDN and hosting country headers without storing raw IP addresses.</p>}
                            {unknownCountry?.pageViews ? <p className="pt-1 text-[10px] leading-5 text-amber-600 dark:text-amber-300">Unattributed traffic: {unknownCountry.pageViews} pages opened / {unknownCountry.visits} sessions. The hosting request did not include a recognised country header.</p> : null}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Devices</h4><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Page share</span></div>
                        <div className="mt-3 space-y-3">
                            {data?.devices.length ? data.devices.map((device) => {
                                const share = totalDeviceViews > 0 ? device.pageViews / totalDeviceViews : 0;
                                return <div key={device.device} className="flex items-center gap-3"><span className="rounded-lg border border-foreground/10 p-2 text-muted-foreground"><DeviceIcon device={device.device} /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span>{deviceLabel(device.device)}</span><span className="font-mono text-muted-foreground">{(share * 100).toFixed(1)}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, share * 100)}%` }} /></div></div></div>;
                            }) : <p className="py-4 text-xs text-muted-foreground">No device data yet.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-5 border-t border-foreground/10 pt-4 text-[10px] leading-5 text-muted-foreground">Privacy retention: aggregated country/device traffic is kept for up to {data?.retention.aggregateDays ?? 31} days. Anonymous session hashes are removed after about {data?.retention.sessionHours ?? 24} hours. Raw IP addresses, city and precise location are not stored.{data?.updatedAt ? ` Last refresh ${new Date(data.updatedAt).toLocaleTimeString()}.` : ''}</p>
        </section>
    );
}
