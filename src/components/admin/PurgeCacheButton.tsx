'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { purgeApplicationCache } from '@/app/admin/(protected)/actions';
import { cn } from '@/lib/utils';

export function PurgeCacheButton() {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

    function handlePurge() {
        setResult(null);
        startTransition(async () => {
            const response = await purgeApplicationCache();
            setResult(response);
        });
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handlePurge}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 px-4 py-2.5 text-sm font-medium transition hover:bg-foreground/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <RefreshCw className={cn('size-4', isPending && 'animate-spin')} />
                {isPending ? 'Purging cache…' : 'Purge public cache'}
            </button>
            {result ? (
                <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5', result.ok ? 'border-emerald-500/20 bg-emerald-500/[0.045] text-emerald-700 dark:text-emerald-300' : 'border-red-500/20 bg-red-500/[0.045] text-red-700 dark:text-red-300')} role="status" aria-live="polite">
                    {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
                    <span>{result.message}</span>
                </div>
            ) : null}
        </div>
    );
}
