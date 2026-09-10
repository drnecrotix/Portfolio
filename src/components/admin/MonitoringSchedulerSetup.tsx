'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function MonitoringSchedulerSetup({
    command,
    maskedToken,
    source,
}: {
    command: string;
    maskedToken: string;
    source: 'environment' | 'derived';
}) {
    const [copied, setCopied] = useState(false);

    async function copyCommand() {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    }

    return (
        <section className="mb-7 border-y border-emerald-300/15 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">Scheduler ready</p>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                        {source === 'environment'
                            ? 'Using the dedicated MONITORING_CRON_SECRET from the production environment.'
                            : 'Using a dedicated HMAC scheduler token derived from the server credential. The underlying AUTH/integration secret is never exposed.'}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-white/35">Token {maskedToken}</p>
                </div>
                <button type="button" onClick={copyCommand} className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:border-white/30 hover:text-white">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy PlanetHoster cron command'}
                </button>
            </div>
            <pre className="mt-4 overflow-x-auto border-t border-white/10 pt-4 font-mono text-[10px] leading-5 text-white/45">{command.replace(/Bearer\s+\S+/, `Bearer ${maskedToken}`)}</pre>
            {source === 'derived' ? <p className="mt-3 text-[11px] leading-5 text-amber-100/55">If the server AUTH/integration secret is rotated, copy the cron command again because the derived scheduler token will change.</p> : null}
        </section>
    );
}
