'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, Globe2, MapPin, Monitor, RefreshCw, Smartphone, Tablet, Users } from 'lucide-react';
import { AudienceWorldMap } from './AudienceWorldMap';
import { cn } from '@/lib/utils';
import type { TrafficRange } from '@/lib/traffic-analytics';

type LiveCountry = {
    code: string;
    name: string;
    visitors: number;
};

type LiveCity = {
    name: string;
    countryCode: string;
    countryName: string;
    visitors: number;
};

type StoredCity = {
    name: string;
    countryCode: string;
    countryName: string;
    pageViews: number;
    liveVisitors: number;
};

type LivePage = {
    path: string;
    visitors: number;
    countries: LiveCountry[];
    lastSeenAt: string;
};

type ActivityItem = {
    id: string;
    path: string;
    countryCode: string;
    countryName: string;
    city: string | null;
    device: string;
    operatingSystem: string;
    ipAddress: string | null;
    ipExpired: boolean;
    isLiveCurrent: boolean;
    occurredAt: string;
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
        cities: LiveCity[];
        windowMinutes: number;
    };
    chart: Array<{ key: string; label: string; pageViews: number; visits: number }>;
    countries: Array<{ code: string; name: string; pageViews: number; visits: number; liveVisitors: number }>;
    cities: StoredCity[];
    devices: Array<{
        device: string;
        pageViews: number;
        visits: number;
    }>;
    activity: {
        items: ActivityItem[];
        total: number;
        limit: number;
    };
    retention: {
        aggregateDays: number;
        pageActivityDays: number;
        sessionHours: number;
        ipHours: number;
        visitTimeoutMinutes: number;
    };
    updatedAt: string;
};

type LocationMode = 'countries' | 'cities';

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
    try {
        return path.split('/').map((segment) => decodeURIComponent(segment)).join('/');
    } catch {
        return path;
    }
}

function activityTime(value: string) {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function MetricCard({
    label,
    value,
    note,
    icon,
    live = false,
}: {
    label: string;
    value: number;
    note: string;
    icon: ReactNode;
    live?: boolean;
}) {
    const liveActive = live && value > 0;
    const liveOffline = live && value === 0;

    return (
        <div className={cn(
            'min-w-0 rounded-xl border px-3.5 py-3 transition-colors',
            liveActive && 'border-emerald-500/25 bg-emerald-500/[0.065]',
            liveOffline && 'border-red-500/25 bg-red-500/[0.055]',
            !live && 'border-foreground/10 bg-background/50',
        )}>
            <div className={cn(
                'flex items-center justify-between gap-3',
                liveActive && 'text-emerald-600 dark:text-emerald-400',
                liveOffline && 'text-red-600 dark:text-red-400',
                !live && 'text-muted-foreground',
            )}>
                <span className="truncate text-[9px] font-medium uppercase tracking-[0.15em]">{label}</span>
                {icon}
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-3">
                <p className={cn('text-2xl font-semibold tabular-nums', liveOffline && 'text-red-600 dark:text-red-400')}>{value}</p>
                <p className="min-w-0 truncate text-right text-[9px] text-muted-foreground">{note}</p>
            </div>
        </div>
    );
}

function VisitsChart({ rows }: { rows: TrafficPayload['chart'] }) {
    const maxVisits = Math.max(1, ...rows.map((row) => row.visits));
    const totalVisits = rows.reduce((sum, row) => sum + row.visits, 0);
    const busiest = rows.reduce(
        (best, row) => row.visits > best.visits ? row : best,
        rows[0] || { key: '', label: 'No data', visits: 0, pageViews: 0 },
    );

    return (
        <div className="h-full rounded-2xl border border-foreground/10 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Visits over time</p>
                    <h4 className="mt-1 text-sm font-semibold">Daily visits</h4>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">Browsing sessions, not individual page opens.</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xl font-semibold tabular-nums">{totalVisits}</p>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">in range</p>
                </div>
            </div>

            <div className="mt-4 flex h-[132px] items-end gap-1 sm:gap-1.5">
                {rows.map((row, index) => {
                    const height = row.visits ? Math.max(5, (row.visits / maxVisits) * 100) : 2;
                    const showLabel = rows.length <= 10 || index === 0 || index === rows.length - 1 || index % 5 === 0;
                    return (
                        <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" title={`${row.label}: ${row.visits} visits`}>
                            <div className="flex w-full flex-1 items-end justify-center">
                                <div
                                    className={cn('w-full max-w-7 rounded-t bg-emerald-500/75 transition-all', row.key === busiest.key && 'bg-emerald-400')}
                                    style={{ height: `${height}%` }}
                                />
                            </div>
                            <span className="mt-1.5 h-3 truncate text-[8px] text-muted-foreground">{showLabel ? row.label : ''}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3 text-[10px] text-muted-foreground">
                <span>Peak day</span>
                <span className="truncate text-right"><strong className="text-foreground">{busiest.label}</strong> · {busiest.visits} visits</span>
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
    const [locationMode, setLocationMode] = useState<LocationMode>('countries');

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
    const selectedCountry = countries.find((country) => country.code === selectedCountryCode) || countries[0] || null;
    const knownLivePages = data?.live.pages.filter((page) => page.path !== 'Unknown page') || [];
    const unknownLivePage = data?.live.pages.find((page) => page.path === 'Unknown page');
    const cities = data?.cities || [];
    const liveVisitors = data?.live.visitors ?? 0;
    const period = rangeText(range);
    const visibleDescription = showMap
        ? 'Live visitors, retained page activity, visit trends, countries, cities, devices, operating systems and short-lived IP context in one focused view.'
        : description;

    const locationPanel = (
        <div className="min-w-0 rounded-2xl border border-foreground/10 bg-background/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Locations</p>
                    <h4 className="mt-1 text-sm font-semibold">Audience locations</h4>
                </div>
                <div className="inline-flex rounded-lg border border-foreground/10 bg-background/60 p-0.5">
                    <button
                        type="button"
                        onClick={() => setLocationMode('countries')}
                        className={cn('rounded-md px-2.5 py-1.5 text-[10px] font-medium transition', locationMode === 'countries' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Countries {countries.length ? `(${countries.length})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={() => setLocationMode('cities')}
                        className={cn('rounded-md px-2.5 py-1.5 text-[10px] font-medium transition', locationMode === 'cities' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Cities {cities.length ? `(${cities.length})` : ''}
                    </button>
                </div>
            </div>

            {locationMode === 'countries' ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-foreground/10">
                    <div className="grid grid-cols-[minmax(0,1fr)_68px_64px] gap-2 bg-foreground/[0.035] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                        <span>Country</span><span className="text-right">Visits</span><span className="text-right">Online</span>
                    </div>
                    <div className="admin-contained-scroll max-h-[250px] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                        {countries.length ? countries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                onClick={() => setSelectedCountryCode(country.code)}
                                className={cn(
                                    'grid w-full grid-cols-[minmax(0,1fr)_68px_64px] gap-2 border-t border-foreground/[0.08] px-3 py-2 text-left text-[11px] transition hover:bg-foreground/[0.035]',
                                    selectedCountry?.code === country.code && 'bg-foreground/[0.03]',
                                )}
                            >
                                <span className="truncate">{country.name}</span>
                                <span className="text-right font-mono">{country.visits}</span>
                                <span className="text-right font-mono text-emerald-600 dark:text-emerald-400">{country.liveVisitors}</span>
                            </button>
                        )) : <p className="border-t border-foreground/[0.08] px-4 py-8 text-center text-xs text-muted-foreground">No attributed country visits in this period yet.</p>}
                    </div>
                </div>
            ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-foreground/10">
                    <div className="grid grid-cols-[minmax(0,1fr)_70px_62px] gap-2 bg-foreground/[0.035] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                        <span>City</span><span className="text-right">Views</span><span className="text-right">Online</span>
                    </div>
                    <div className="admin-contained-scroll max-h-[250px] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                        {cities.length ? cities.map((city) => (
                            <div key={`${city.countryCode}:${city.name}`} className="grid grid-cols-[minmax(0,1fr)_70px_62px] gap-2 border-t border-foreground/[0.08] px-3 py-2 text-[11px]">
                                <div className="min-w-0">
                                    <p className="truncate">{city.name}</p>
                                    <p className="truncate text-[9px] text-muted-foreground">{city.countryName}</p>
                                </div>
                                <span className="self-center text-right font-mono">{city.pageViews}</span>
                                <span className="self-center text-right font-mono text-emerald-600 dark:text-emerald-400">{city.liveVisitors}</span>
                            </div>
                        )) : (
                            <div className="border-t border-foreground/[0.08] px-4 py-7 text-center">
                                <MapPin className="mx-auto size-4 text-muted-foreground" />
                                <p className="mt-2 text-xs font-medium">No city activity in this period yet.</p>
                                <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-muted-foreground">City comes from hosting/CDN headers when available, otherwise from a short-lived IP location lookup. Precise coordinates are not stored.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
                {locationMode === 'countries' ? `${period} · visit totals plus live visitors` : `${period} · retained page activity plus live visitors`}
            </p>
        </div>
    );

    const devicesPanel = (
        <div className="min-w-0 rounded-2xl border border-foreground/10 bg-background/40 p-4">
            <div className="flex items-center justify-between gap-3">
                <div><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Devices</p><h4 className="mt-1 text-sm font-semibold">Visits by device</h4></div>
                <span className="text-[9px] text-muted-foreground">{period}</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-foreground/10">
                <div className="grid grid-cols-[minmax(120px,1fr)_80px] gap-3 bg-foreground/[0.035] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Device</span><span className="text-right">Visits</span>
                </div>
                {data?.devices.length ? data.devices.map((device) => (
                    <div key={device.device} className="grid grid-cols-[minmax(120px,1fr)_80px] items-center gap-3 border-t border-foreground/[0.08] px-3 py-2.5 text-[10px]">
                        <span className="inline-flex min-w-0 items-center gap-2"><DeviceIcon device={device.device} /><span className="truncate text-xs">{deviceLabel(device.device)}</span></span>
                        <span className="text-right font-mono text-xs font-semibold tabular-nums">{device.visits}</span>
                    </div>
                )) : <p className="border-t border-foreground/[0.08] py-6 text-center text-xs text-muted-foreground">No device data yet.</p>}
            </div>
            <p className="mt-2 text-[9px] leading-4 text-muted-foreground">Broad device classes and visit totals for {period}.</p>
        </div>
    );

    const activityPanel = (
        <div className="mt-4 min-w-0 rounded-2xl border border-foreground/10 bg-background/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Retained activity</p>
                    <h4 className="mt-1 text-sm font-semibold">Recent page activity</h4>
                    <p className="mt-1 text-[10px] text-muted-foreground">Public page paths, location, device, OS and short-lived IP context. Rows marked LIVE are the current page for that active visitor session. Query strings and full user-agent strings are not stored.</p>
                </div>
                <span className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 text-[9px] text-muted-foreground">
                    {data?.activity.items.length ?? 0} of {data?.activity.total ?? 0}
                </span>
            </div>

            <div className="admin-contained-scroll mt-3 max-h-[360px] overflow-auto overscroll-contain rounded-xl border border-foreground/10 [scrollbar-gutter:stable]">
                <div className="min-w-[950px]">
                    <div className="sticky top-0 z-10 grid grid-cols-[105px_minmax(220px,1.55fr)_minmax(170px,1fr)_105px_115px_minmax(135px,0.9fr)] gap-3 bg-background/95 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
                        <span>Time</span><span>Page / URL</span><span>Location</span><span>Device</span><span>OS</span><span>IP address</span>
                    </div>
                    {data?.activity.items.length ? data.activity.items.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                'grid grid-cols-[105px_minmax(220px,1.55fr)_minmax(170px,1fr)_105px_115px_minmax(135px,0.9fr)] items-center gap-3 border-t border-foreground/[0.08] px-3 py-2.5 text-[10px] transition-colors',
                                item.isLiveCurrent && 'bg-emerald-500/[0.045]',
                            )}
                        >
                            <span className="whitespace-nowrap text-muted-foreground">{activityTime(item.occurredAt)}</span>
                            <div className="flex min-w-0 items-center gap-2">
                                <Link href={item.path} target="_blank" rel="noreferrer" className="inline-flex min-w-0 flex-1 items-center gap-1.5 hover:underline">
                                    <span className="truncate font-mono text-[10px]">{item.path}</span><ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                                </Link>
                                {item.isLiveCurrent ? (
                                    <span
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400"
                                        title="Current page for this live visitor session"
                                    >
                                        <span className="size-1.5 rounded-full bg-emerald-500" /> Live
                                    </span>
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate">{item.city || 'City unavailable'}</p>
                                <p className="truncate text-[9px] text-muted-foreground">{item.countryName}</p>
                            </div>
                            <span className="inline-flex min-w-0 items-center gap-1.5"><DeviceIcon device={item.device} /><span className="truncate">{deviceLabel(item.device)}</span></span>
                            <span className="truncate text-[10px]" title={item.operatingSystem}>{item.operatingSystem}</span>
                            <span
                                className={cn(
                                    'truncate font-mono text-[9px]',
                                    item.ipAddress ? 'text-foreground' : 'text-muted-foreground',
                                    item.isLiveCurrent && item.ipAddress && 'font-semibold text-emerald-700 dark:text-emerald-300',
                                )}
                                title={item.ipAddress || undefined}
                            >
                                {item.ipAddress || (item.ipExpired ? 'Expired' : 'Unavailable')}
                            </span>
                        </div>
                    )) : <p className="border-t border-foreground/[0.08] px-4 py-8 text-center text-xs text-muted-foreground">No retained page activity in this period yet.</p>}
                </div>
            </div>
            {(data?.activity.total ?? 0) > (data?.activity.limit ?? 150) ? (
                <p className="mt-2 text-[9px] leading-4 text-muted-foreground">Showing the latest {data?.activity.limit} entries to keep the dashboard responsive. Aggregate totals still include the full selected period.</p>
            ) : null}
        </div>
    );

    return (
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Analytics</p>
                    <h3 className="mt-1.5 text-xl font-semibold">{title}</h3>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{visibleDescription}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-foreground/10 bg-background/60 p-0.5">
                        {rangeOptions.map((option) => (
                            <button key={option.value} type="button" onClick={() => setRange(option.value)} className={cn('rounded-md px-3 py-1.5 text-[10px] font-medium transition', range === option.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => void refresh(true)} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground" aria-label="Refresh traffic analytics">
                        <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {error ? <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-600 dark:text-red-300">{error}</div> : null}

            <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <MetricCard label="Visitors online" value={liveVisitors} note={`${data?.live.windowMinutes ?? 5} min window`} icon={<Activity className="size-3.5" />} live />
                <MetricCard label="Pages active now" value={knownLivePages.length} note="public pages" icon={<Monitor className="size-3.5" />} />
                <MetricCard label="Visits" value={data?.summary.visits ?? 0} note={period} icon={<Users className="size-3.5" />} />
                <MetricCard label="Countries" value={data?.summary.countries ?? 0} note={period} icon={<Globe2 className="size-3.5" />} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                <div className="min-w-0 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Live now</p>
                            <h4 className="mt-1 text-sm font-semibold">Pages being viewed</h4>
                            <p className="mt-1 truncate text-[10px] text-muted-foreground">Refreshes automatically from active visitor heartbeats.</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">{liveVisitors} online</span>
                    </div>

                    <div className="admin-contained-scroll mt-3 max-h-[232px] space-y-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
                        {knownLivePages.length ? knownLivePages.map((page) => (
                            <div key={page.path} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background/55 px-3 py-2">
                                <div className="min-w-0">
                                    <Link href={page.path} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium hover:underline">
                                        <span className="truncate">{pageLabel(page.path)}</span><ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                                    </Link>
                                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                                        {page.countries.map((country) => `${country.name}${country.visitors > 1 ? ` (${country.visitors})` : ''}`).join(', ') || 'Country unavailable'}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right"><span className="text-base font-semibold tabular-nums">{page.visitors}</span><span className="ml-1 text-[9px] text-muted-foreground">{page.visitors === 1 ? 'visitor' : 'visitors'}</span></div>
                            </div>
                        )) : <p className="rounded-xl border border-dashed border-foreground/15 px-4 py-7 text-center text-xs text-muted-foreground">No active public pages right now.</p>}
                    </div>
                    {unknownLivePage?.visitors ? <p className="mt-2 text-[9px] leading-4 text-muted-foreground">{unknownLivePage.visitors} older live session{unknownLivePage.visitors === 1 ? '' : 's'} will gain a page path after the next heartbeat.</p> : null}
                </div>

                <VisitsChart rows={data?.chart || []} />
            </div>

            {activityPanel}

            {showMap ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                    <div className="min-w-0 rounded-2xl border border-foreground/10 bg-background/40 p-4">
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                            <div><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Visual map</p><h4 className="mt-1 text-sm font-semibold">Where visits come from</h4></div>
                            {selectedCountry ? <span className="text-[9px] text-muted-foreground"><strong className="text-foreground">{selectedCountry.name}</strong> · {selectedCountry.visits} visits · {selectedCountry.liveVisitors} online</span> : null}
                        </div>
                        <AudienceWorldMap countries={data?.countries || []} selectedCode={selectedCountry?.code} />
                    </div>
                    <div className="min-w-0 space-y-4">
                        {locationPanel}
                        {devicesPanel}
                    </div>
                </div>
            ) : (
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                    {locationPanel}
                    {devicesPanel}
                </div>
            )}

            <p className="mt-4 border-t border-foreground/10 pt-3 text-[9px] leading-4 text-muted-foreground">
                A visit restarts after about {data?.retention.visitTimeoutMinutes ?? 30} minutes of inactivity. Page activity is retained for up to {data?.retention.pageActivityDays ?? 31} days, while raw IP context expires after about {data?.retention.ipHours ?? 24} hours. City is taken from infrastructure headers where available or resolved through the short-lived IP fallback; precise coordinates are not stored. OS is reduced to a coarse label from the browser user-agent and the full user-agent string is not retained. Country/device aggregates are retained for up to {data?.retention.aggregateDays ?? 31} days.{data?.updatedAt ? ` Last refresh ${new Date(data.updatedAt).toLocaleTimeString()}.` : ''}
            </p>
        </section>
    );
}
