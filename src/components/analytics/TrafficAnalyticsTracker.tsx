'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function TrafficAnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/site-status') return;
        if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void fetch('/api/analytics/pageview', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{}',
                cache: 'no-store',
                keepalive: true,
                signal: controller.signal,
            }).catch(() => undefined);
        }, 120);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [pathname]);

    return null;
}
