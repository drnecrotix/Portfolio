'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { checkForPortfolioUpdate, installPortfolioUpdate } from '@/app/admin/(protected)/actions';

export type PortfolioUpdateStatus = {
    state?: string;
    message?: string;
    updatedAt?: string;
    targetVersion?: string | null;
};

type CheckResult = {
    ok: boolean;
    state: 'current' | 'available' | 'error';
    message: string;
    localVersion?: string;
    remoteVersion?: string;
};

type StartResult = {
    ok: boolean;
    state: 'starting' | 'current' | 'error';
    message: string;
};

const activeStates = new Set(['starting', 'running']);

function statusLabel(state?: string) {
    switch (state) {
        case 'starting': return 'Starting';
        case 'running': return 'Updating';
        case 'success': return 'Completed';
        case 'error': return 'Failed';
        case 'available': return 'Update available';
        case 'current': return 'Up to date';
        case 'checking': return 'Checking';
        default: return 'Ready';
    }
}

export function PortfolioUpdater({ currentVersion, initialStatus }: { currentVersion: string; initialStatus: PortfolioUpdateStatus | null }) {
    const [status, setStatus] = useState<PortfolioUpdateStatus | null>(initialStatus);
    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [noticeVisible, setNoticeVisible] = useState(false);
    const [isChecking, startCheck] = useTransition();
    const [isStarting, startInstall] = useTransition();
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showNotice = useCallback(() => {
        setNoticeVisible(true);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNoticeVisible(false), 7000);
    }, []);

    const pollStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/update-status', { cache: 'no-store' });
            if (!response.ok) return;
            const payload = await response.json() as { status: PortfolioUpdateStatus | null };
            setStatus(payload.status);
            if (payload.status?.state === 'success' || payload.status?.state === 'error') showNotice();
        } catch {
            // Keep the last known status if Passenger is restarting between requests.
        }
    }, [showNotice]);

    const isUpdating = activeStates.has(status?.state || '') || isStarting;

    useEffect(() => {
        if (!isUpdating) return;
        const firstPoll = setTimeout(() => void pollStatus(), 0);
        const timer = setInterval(() => void pollStatus(), 2000);
        return () => {
            clearTimeout(firstPoll);
            clearInterval(timer);
        };
    }, [isUpdating, pollStatus]);

    useEffect(() => () => {
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
    }, []);

    const displayStatus = useMemo<PortfolioUpdateStatus>(() => {
        if (isChecking) return { state: 'checking', message: 'Checking GitHub for a newer Portfolio release…' };
        if (checkResult) return { state: checkResult.state, message: checkResult.message, targetVersion: checkResult.remoteVersion };
        return status || { state: 'ready', message: 'Updater is ready.' };
    }, [checkResult, isChecking, status]);

    const canInstall = checkResult?.ok === true && checkResult.state === 'available' && !isUpdating && !isChecking;

    function handleCheck() {
        setCheckResult(null);
        startCheck(async () => {
            const result = await checkForPortfolioUpdate() as CheckResult;
            setCheckResult(result);
            showNotice();
        });
    }

    function handleInstall() {
        if (!canInstall) return;
        setCheckResult(null);
        startInstall(async () => {
            const result = await installPortfolioUpdate() as StartResult;
            setStatus({ state: result.state, message: result.message, updatedAt: new Date().toISOString() });
            if (result.state === 'current') {
                setCheckResult({ ok: true, state: 'current', message: result.message, localVersion: currentVersion, remoteVersion: currentVersion });
            }
            showNotice();
        });
    }

    const animated = ['checking', 'starting', 'running'].includes(displayStatus.state || '');
    const failed = displayStatus.state === 'error';
    const complete = displayStatus.state === 'success' || displayStatus.state === 'current';
    const installLabel = isUpdating
        ? 'Update running…'
        : isStarting
            ? 'Starting…'
            : checkResult?.state === 'current'
                ? 'Up to date'
                : checkResult?.state === 'available'
                    ? 'Install update'
                    : 'Check update first';

    return (
        <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Portfolio updates</p>
                <h3 className="mt-2 text-xl font-semibold">GitHub updater</h3>
                <p className="mt-2 text-sm text-white/45">Installed v{currentVersion}. Checks the main branch version and can deploy it on N0C while preserving secrets and Passenger configuration.</p>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    <div className="flex items-start gap-3 p-4">
                        <span className="relative mt-0.5 flex size-3 shrink-0">
                            {animated && <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/35" />}
                            <span className={`relative inline-flex size-3 rounded-full ${failed ? 'bg-red-400' : complete ? 'bg-emerald-400' : animated ? 'bg-white' : 'bg-white/35'}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/65">{statusLabel(displayStatus.state)}</span>
                                {displayStatus.targetVersion && <span className="text-[11px] text-white/35">v{displayStatus.targetVersion}</span>}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-white/50">{displayStatus.message}</p>
                            {isUpdating && (
                                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white/55" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={handleCheck} disabled={isChecking || isUpdating} className="rounded-xl border border-white/15 px-4 py-2 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
                        {isChecking ? 'Checking…' : 'Check update'}
                    </button>
                    <button type="button" onClick={handleInstall} disabled={!canInstall} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40">
                        {installLabel}
                    </button>
                </div>
            </div>

            {noticeVisible && (
                <div className="fixed bottom-5 right-5 z-[100] w-[min(92vw,380px)] rounded-2xl border border-white/15 bg-[#111]/95 p-4 shadow-2xl backdrop-blur-xl" role="status" aria-live="polite">
                    <div className="flex items-start gap-3">
                        <span className={`mt-1 size-2.5 shrink-0 rounded-full ${failed ? 'bg-red-400' : complete ? 'bg-emerald-400' : 'bg-white animate-pulse'}`} />
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">{statusLabel(displayStatus.state)}</p>
                            <p className="mt-1 text-sm text-white/80">{displayStatus.message}</p>
                        </div>
                        <button type="button" onClick={() => setNoticeVisible(false)} className="ml-auto text-sm text-white/35 transition hover:text-white" aria-label="Dismiss update notification">×</button>
                    </div>
                </div>
            )}
        </>
    );
}
