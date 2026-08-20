'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function StatusToast({ type, message }: { type?: 'success' | 'error'; message?: string }) {
    const [visible, setVisible] = useState(Boolean(type && message));

    useEffect(() => {
        setVisible(Boolean(type && message));
        if (!type || !message) return;
        const timer = window.setTimeout(() => setVisible(false), 5000);
        return () => window.clearTimeout(timer);
    }, [type, message]);

    if (!visible || !type || !message) return null;

    return (
        <div className="fixed right-5 top-5 z-[100] w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#111]/95 p-4 text-white shadow-2xl backdrop-blur-xl" role="status" aria-live="polite">
            <div className="flex items-start gap-3">
                {type === 'success' ? <CheckCircle2 className="mt-0.5 size-5 text-emerald-400" /> : <AlertTriangle className="mt-0.5 size-5 text-amber-400" />}
                <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">{type === 'success' ? 'Saved' : 'Error'}</p>
                    <p className="mt-1 text-sm text-white/80">{message}</p>
                </div>
                <button type="button" onClick={() => setVisible(false)} className="rounded-lg p-1 text-white/35 hover:bg-white/5 hover:text-white" aria-label="Dismiss notification">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
