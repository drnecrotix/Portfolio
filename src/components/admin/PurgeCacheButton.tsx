'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
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
        <div>
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
                <p className={cn('mt-2 text-xs leading-5', result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-300')} role="status" aria-live="polite">
                    {result.message}
                </p>
            ) : null}
        </div>
    );
}
