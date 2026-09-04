'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { AudienceWorldMap } from './AudienceWorldMap';
import { cn } from '@/lib/utils';
import type { TrafficRange } from '@/lib/traffic-analytics';

type TrafficPayload = {
    range: TrafficRange;
    summary: {
        liveVisitors: number;
        pageViews: number;
        visits: number;
        countries: number;
    };
    chart: Array<{ key: string; label: string; pageViews: number; visits: number }>;
    countries: Array<{ code: string; name: string; pageViews: number; visits: number }>;
    devices: Array<{ device: string; pageViews: number; visits: number }>;
    retention: { aggregateDays: number; sessionHours: number };
    updatedAt: string;
};

const rangeOptions: Array<{ value: TrafficRange; label: string }> = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

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

function TrafficChart({ rows }: { rows: TrafficPayload['chart'] }) {
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

    const labelIndexes = rows.length <= 4
        ? rows.map((_, index) => index)
        : [0, Math.floor((rows.length - 1) / 2), rows.length - 1];

    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-sky-500" /> Page views</span>
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-violet-500" /> Visits</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Traffic over time" className="h-auto w-full overflow-visible">
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

export function TrafficAnalyticsPanel({
    showMap = false,
    title = 'Traffic',
    description = 'Short-retention, country and device level analytics.',
}: {
    showMap?: boolean;
    title?: string;
    description?: string;
}) {
    const [range, setRange] = useState<TrafficRange>('24h');
    const [data, setData] = useState<TrafficPayload | null>(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

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
        const timer = window.setInterval(() => void refresh(), 15000);
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearInterval(timer);
        };
    }, [refresh]);

    const topCountries = useMemo(() => data?.countries.filter((country) => country.code !== 'XX').slice(0, 8) || [], [data]);
    const unknownCountry = data?.countries.find((country) => country.code === 'XX');
    const totalDeviceViews = data?.devices.reduce((sum, device) => sum + device.pageViews, 0) || 0;

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
                        {rangeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setRange(option.value)}
                                className={cn('rounded-lg px-3 py-2 text-xs font-medium transition', range === option.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
                            >
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
                {[
                    ['Live now', data?.summary.liveVisitors ?? 0, <Activity key="live" className="size-4" />],
                    ['Visits', data?.summary.visits ?? 0, <Users key="visits" className="size-4" />],
                    ['Page views', data?.summary.pageViews ?? 0, <Monitor key="views" className="size-4" />],
                    ['Countries', data?.summary.countries ?? 0, <span key="countries" className="text-xs font-bold">ISO</span>],
                ].map(([label, value, icon]) => (
                    <div key={String(label)} className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                        <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[10px] uppercase tracking-[0.15em]">{label}</span>{icon}</div>
                        <p className="mt-3 text-2xl font-semibold tabular-nums">{String(value)}</p>
                    </div>
                ))}
            </div>

            <TrafficChart rows={data?.chart || []} />

            <div className={cn('mt-5 grid gap-4', showMap ? 'xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]' : 'lg:grid-cols-2')}>
                {showMap ? (
                    <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Audience map</p><h4 className="mt-1 font-semibold">Countries by page views</h4></div>
                            <span className="text-xs text-muted-foreground">No city data</span>
                        </div>
                        <AudienceWorldMap countries={data?.countries || []} />
                    </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Top countries</h4><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Views</span></div>
                        <div className="mt-3 space-y-2.5">
                            {topCountries.length ? topCountries.map((country) => {
                                const max = Math.max(1, topCountries[0]?.pageViews || 1);
                                return (
                                    <div key={country.code}>
                                        <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate">{country.name}</span><span className="font-mono text-muted-foreground">{country.pageViews}</span></div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, (country.pageViews / max) * 100)}%` }} /></div>
                                    </div>
                                );
                            }) : <p className="py-4 text-xs text-muted-foreground">No country data yet.</p>}
                            {unknownCountry?.pageViews ? <p className="pt-1 text-[10px] text-muted-foreground">Unknown country header: {unknownCountry.pageViews} views.</p> : null}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">Devices</h4><span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Share</span></div>
                        <div className="mt-3 space-y-3">
                            {data?.devices.length ? data.devices.map((device) => {
                                const share = totalDeviceViews > 0 ? device.pageViews / totalDeviceViews : 0;
                                return (
                                    <div key={device.device} className="flex items-center gap-3">
                                        <span className="rounded-lg border border-foreground/10 p-2 text-muted-foreground"><DeviceIcon device={device.device} /></span>
                                        <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-xs"><span>{deviceLabel(device.device)}</span><span className="font-mono text-muted-foreground">{(share * 100).toFixed(1)}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, share * 100)}%` }} /></div></div>
                                    </div>
                                );
                            }) : <p className="py-4 text-xs text-muted-foreground">No device data yet.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-5 border-t border-foreground/10 pt-4 text-[10px] leading-5 text-muted-foreground">
                Privacy retention: aggregated country/device traffic is kept for up to {data?.retention.aggregateDays ?? 31} days. Anonymous session hashes are removed after about {data?.retention.sessionHours ?? 24} hours. Raw IP addresses, city and precise location are not stored.
                {data?.updatedAt ? ` Last update ${new Date(data.updatedAt).toLocaleTimeString()}.` : ''}
            </p>
        </section>
    );
}
