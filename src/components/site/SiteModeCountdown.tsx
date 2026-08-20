'use client';

import { useEffect, useMemo, useState } from 'react';

function formatRemaining(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    return [
        days > 0 ? `${days}d` : null,
        `${String(hours).padStart(2, '0')}h`,
        `${String(minutes).padStart(2, '0')}m`,
        `${String(seconds).padStart(2, '0')}s`,
    ].filter(Boolean).join(' ');
}

export function SiteModeCountdown({ startsAt, endsAt, initialNow }: { startsAt?: string | null; endsAt: string; initialNow: number }) {
    const start = useMemo(() => startsAt ? new Date(startsAt).getTime() : null, [startsAt]);
    const end = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
    const [now, setNow] = useState(initialNow);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    if (!Number.isFinite(end)) return null;

    if (start && now < start) {
        return (
            <div className="mt-8 font-mono text-sm uppercase tracking-[0.16em] text-white/45">
                Starts in {formatRemaining(start - now)}
            </div>
        );
    }

    if (now >= end) return null;

    return (
        <div className="mt-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Time remaining</p>
            <p className="mt-2 font-mono text-xl tracking-[0.08em] text-white/70">{formatRemaining(end - now)}</p>
        </div>
    );
}
