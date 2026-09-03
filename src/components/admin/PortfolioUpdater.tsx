'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { installPortfolioUpdate } from '@/app/admin/(protected)/actions';

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
const transientCheckMessage = 'Update check was interrupted. Please try again.';

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

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function rejectedActionMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message && !/server action|failed to fetch|network/i.test(error.message)) return error.message;
    return fallback;
}

async function requestUpdateCheck() {
    const response = await fetch(`/api/admin/update-check?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Update check returned HTTP ${response.status}.`);
    return await response.json() as CheckResult;
}

export function PortfolioUpdater({ currentVersion, initialStatus }: { currentVersion: string; initialStatus: PortfolioUpdateStatus | null }) {
    const [status, setStatus] = useState<PortfolioUpdateStatus | null>(initialStatus);
    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [noticeVisible, setNoticeVisible] = useState(false);
    const [isChecking, startCheck] = useTransition();
    const [isStarting, startInstall] = useTransition();
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoCheckStarted = useRef(false);

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

    const checkWithRetry = useCallback(async (): Promise<CheckResult> => {
        let lastError: unknown;
        let lastResult: CheckResult | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const result = await requestUpdateCheck();
                if (result.state !== 'error') return result;
                lastResult = result;
            } catch (error) {
                lastError = error;
            }
            if (attempt === 0) await wait(650);
        }
        if (lastResult) return lastResult;
        return {
            ok: false,
            state: 'error',
            message: rejectedActionMessage(lastError, transientCheckMessage),
        };
    }, []);

    const runCheck = useCallback((notifyWhenCurrent: boolean) => {
        setCheckResult(null);
        startCheck(async () => {
            const result = await checkWithRetry();
            setCheckResult(result);
            if (notifyWhenCurrent || result.state === 'available' || result.state === 'error') showNotice();
        });
    }, [checkWithRetry, showNotice]);

    useEffect(() => {
        if (!isUpdating) return;
        const firstPoll = setTimeout(() => void pollStatus(), 0);
        const timer = setInterval(() => void pollStatus(), 2000);
        return () => {
            clearTimeout(firstPoll);
            clearInterval(timer);
        };
    }, [isUpdating, pollStatus]);

    useEffect(() => {
        if (autoCheckStarted.current || isUpdating) return;
        autoCheckStarted.current = true;
        const timer = setTimeout(() => runCheck(false), 750);
        return () => clearTimeout(timer);
    }, [isUpdating, runCheck]);

    useEffect(() => () => {
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
    }, []);

    const displayStatus = useMemo<PortfolioUpdateStatus>(() => {
        if (isChecking) return { state: 'checking', message: 'Checking GitHub for a newer Portfolio release…' };
        if (checkResult) return { state: checkResult.state, message: checkResult.message, targetVersion: checkResult.remoteVersion };
        return status || { state: 'ready', message: 'Updater is ready.' };
    }, [checkResult, isChecking, status]);

    const isCurrent = checkResult?.ok === true && checkResult.state === 'current';
    const canInstall = checkResult?.ok === true && checkResult.state === 'available' && !isUpdating && !isChecking;

    function handleCheck() { runCheck(true); }

    function handleInstall() {
        if (!canInstall) return;
        setCheckResult(null);
        startInstall(async () => {
            try {
                const result = await installPortfolioUpdate() as StartResult;
                setStatus({ state: result.state, message: result.message, updatedAt: new Date().toISOString() });
                if (result.state === 'current') setCheckResult({ ok: true, state: 'current', message: result.message, localVersion: currentVersion, remoteVersion: currentVersion });
            } catch (error) {
                setStatus({
                    state: 'error',
                    message: rejectedActionMessage(error, 'The update request was interrupted. Check updater status before trying again.'),
                    updatedAt: new Date().toISOString(),
                });
            } finally {
                showNotice();
            }
        });
    }

    const animated = ['checking', 'starting', 'running'].includes(displayStatus.state || '');
    const failed = displayStatus.state === 'error';
    const complete = displayStatus.state === 'success' || displayStatus.state === 'current';
    const installLabel = isUpdating ? 'Update running…' : isStarting ? 'Starting…' : checkResult?.state === 'available' ? 'Install update' : 'Check update first';

    return (
        <>
            <div className="h-full rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-5 sm:p-6">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Portfolio updates</p>
                <h3 className="mt-2 text-lg font-semibold sm:text-xl">GitHub updater</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Installed v{currentVersion}. The dashboard checks GitHub automatically and can deploy a newer main-branch version on N0C while preserving secrets and Passenger configuration.</p>

                <div className="mt-4 overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.03]">
                    <div className="flex items-start gap-3 p-4">
                        <span className="relative mt-0.5 flex size-3 shrink-0">
                            {animated && <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/25" />}
                            <span className={`relative inline-flex size-3 rounded-full ${failed ? 'bg-red-500' : complete ? 'bg-emerald-500' : animated ? 'bg-foreground' : 'bg-muted-foreground/40'}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/70">{statusLabel(displayStatus.state)}</span>
                                {displayStatus.targetVersion && <span className="text-[11px] text-muted-foreground">v{displayStatus.targetVersion}</span>}
                            </div>
                            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{displayStatus.message}</p>
                            {isUpdating && <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-foreground/55" /></div>}
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button type="button" onClick={handleCheck} disabled={isChecking || isUpdating} className="rounded-xl border border-foreground/15 px-4 py-2.5 text-sm transition hover:bg-foreground/[0.05] disabled:cursor-not-allowed disabled:opacity-40">{isChecking ? 'Checking…' : 'Check update'}</button>
                    {isCurrent ? <span aria-disabled="true" className="inline-flex items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Up to date</span> : <button type="button" onClick={handleInstall} disabled={!canInstall} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{installLabel}</button>}
                </div>
            </div>

            {noticeVisible && (
                <div className="fixed bottom-4 left-4 right-4 z-[100] rounded-2xl border border-foreground/15 bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(92vw,380px)]" role="status" aria-live="polite">
                    <div className="flex items-start gap-3">
                        <span className={`mt-1 size-2.5 shrink-0 rounded-full ${failed ? 'bg-red-500' : complete ? 'bg-emerald-500' : 'bg-foreground animate-pulse'}`} />
                        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{statusLabel(displayStatus.state)}</p><p className="mt-1 break-words text-sm text-foreground/80">{displayStatus.message}</p></div>
                        <button type="button" onClick={() => setNoticeVisible(false)} className="ml-auto text-sm text-muted-foreground transition hover:text-foreground" aria-label="Dismiss update notification">×</button>
                    </div>
                </div>
            )}
        </>
    );
}
