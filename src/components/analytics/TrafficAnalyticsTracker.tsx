'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LIVE_HEARTBEAT_MS = 60_000;

export function TrafficAnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/site-status') return;
        if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;

        const controller = new AbortController();

        const send = (heartbeat: boolean) => {
            if (document.visibilityState === 'hidden' && heartbeat) return;
            void fetch('/api/analytics/pageview', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ path: pathname, heartbeat }),
                cache: 'no-store',
                keepalive: true,
                signal: controller.signal,
            }).catch(() => undefined);
        };

        const initialTimer = window.setTimeout(() => send(false), 120);
        const heartbeatTimer = window.setInterval(() => send(true), LIVE_HEARTBEAT_MS);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') send(true);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearTimeout(initialTimer);
            window.clearInterval(heartbeatTimer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            controller.abort();
        };
    }, [pathname]);

    return null;
}
