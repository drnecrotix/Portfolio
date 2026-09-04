'use client';

import { useCallback, useRef } from 'react';
import type { ExperimentEvent, ExperimentId, ExperimentVariantMap } from '@/lib/experiments';

async function sendMetric(id: ExperimentId, variant: 'A' | 'B', event: ExperimentEvent) {
    try {
        await fetch('/api/experiments/event', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ experimentId: id, variant, event }),
            keepalive: true,
            cache: 'no-store',
        });
    } catch {
        // Experiment telemetry must never interfere with the public experience.
    }
}

export function useExperimentTelemetry(variants: ExperimentVariantMap) {
    const sent = useRef(new Set<string>());

    const track = useCallback((id: ExperimentId, event: ExperimentEvent, once = true) => {
        const variant = variants[id];
        const key = `${id}:${variant}:${event}`;
        if (once && sent.current.has(key)) return;
        if (once) sent.current.add(key);
        void sendMetric(id, variant, event);
    }, [variants]);

    return track;
}
