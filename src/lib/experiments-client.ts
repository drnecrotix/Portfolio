'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ExperimentEvent, ExperimentId, ExperimentVariant } from '@/lib/experiments';

const PREFIX = 'necrotix:experiment:';

function storageKey(id: ExperimentId) {
    return `${PREFIX}${id}:variant`;
}

function eventKey(id: ExperimentId, variant: ExperimentVariant, event: ExperimentEvent) {
    return `${PREFIX}${id}:${variant}:${event}`;
}

function assignVariant(id: ExperimentId): ExperimentVariant {
    try {
        const existing = window.sessionStorage.getItem(storageKey(id));
        if (existing === 'A' || existing === 'B') return existing;
        const variant: ExperimentVariant = window.crypto?.getRandomValues
            ? (window.crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? 'A' : 'B')
            : (Math.random() < 0.5 ? 'A' : 'B');
        window.sessionStorage.setItem(storageKey(id), variant);
        return variant;
    } catch {
        return Math.random() < 0.5 ? 'A' : 'B';
    }
}

async function sendMetric(id: ExperimentId, variant: ExperimentVariant, event: ExperimentEvent) {
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

export function useExperiment(id: ExperimentId) {
    const [variant, setVariant] = useState<ExperimentVariant>('A');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const assigned = assignVariant(id);
        setVariant(assigned);
        setReady(true);

        try {
            const key = eventKey(id, assigned, 'exposure');
            if (window.sessionStorage.getItem(key)) return;
            window.sessionStorage.setItem(key, '1');
        } catch {
            // If storage is unavailable, counting an extra exposure is preferable to breaking the page.
        }
        void sendMetric(id, assigned, 'exposure');
    }, [id]);

    const track = useCallback((event: ExperimentEvent, once = true) => {
        if (!ready) return;
        if (once) {
            try {
                const key = eventKey(id, variant, event);
                if (window.sessionStorage.getItem(key)) return;
                window.sessionStorage.setItem(key, '1');
            } catch {
                // Continue without browser-side de-duplication when storage is unavailable.
            }
        }
        void sendMetric(id, variant, event);
    }, [id, ready, variant]);

    return { variant, ready, track };
}
