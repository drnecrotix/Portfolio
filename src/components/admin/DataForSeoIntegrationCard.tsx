'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, CircleDashed, RefreshCw, Save } from 'lucide-react';
import {
    saveDataForSeoIntegration,
    testDataForSeoIntegration,
    type DataForSeoActionResult,
} from '@/app/admin/(protected)/api-integrations/dataforseo-actions';

type Source = 'cms' | 'environment' | 'missing';

type Props = {
    loginConfigured: boolean;
    passwordConfigured: boolean;
    loginSource: Source;
    passwordSource: Source;
    lastTest: {
        ok: boolean;
        testedAt: string;
        message: string;
        latencyMs?: number;
    } | null;
};

function sourceLabel(source: Source) {
    if (source === 'cms') return 'API Integrations CMS';
    if (source === 'environment') return 'Environment';
    return 'Not configured';
}

export function DataForSeoIntegrationCard({
    loginConfigured,
    passwordConfigured,
    loginSource,
    passwordSource,
    lastTest,
}: Props) {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [clearLogin, setClearLogin] = useState(false);
    const [clearPassword, setClearPassword] = useState(false);
    const [result, setResult] = useState<DataForSeoActionResult | null>(null);
    const [saving, startSaving] = useTransition();
    const [testing, startTesting] = useTransition();

    const effectiveTest = result?.testedAt ? result : lastTest;
    const configured = loginConfigured && passwordConfigured;
    const status = effectiveTest
        ? effectiveTest.ok ? 'connected' : 'error'
        : configured ? 'configured' : 'missing';

    const save = () => {
        startSaving(async () => {
            const next = await saveDataForSeoIntegration({ login, password, clearLogin, clearPassword });
            setResult(next);
            if (next.ok) {
                setLogin('');
                setPassword('');
                setClearLogin(false);
                setClearPassword(false);
                window.location.reload();
            }
        });
    };

    const test = () => {
        startTesting(async () => {
            const next = await testDataForSeoIntegration();
            setResult(next);
        });
    };

    const badge = status === 'connected'
        ? { label: 'Connected', Icon: CheckCircle2, className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
        : status === 'error'
            ? { label: 'Test failed', Icon: AlertCircle, className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' }
            : status === 'configured'
                ? { label: 'Configured', Icon: CheckCircle2, className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                : { label: 'Not configured', Icon: CircleDashed, className: 'border-border bg-muted/40 text-muted-foreground' };

    const BadgeIcon = badge.Icon;

    return (
        <section className="mx-auto max-w-7xl">
            <article className="rounded-2xl border border-border/70 bg-card/40 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SEO data provider</p>
                        <h2 className="mt-1 text-xl font-bold">DataForSEO</h2>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.className}`}>
                        <BadgeIcon className="size-3.5" /> {badge.label}
                    </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Powers SEO Intelligence keyword research, live SERP/rank checks, competitor discovery and backlink summaries. Credentials are stored encrypted and never returned to the browser.
                </p>

                <div className="mt-4 rounded-xl border border-border/60 bg-background/45 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Used by</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {['SEO Intelligence', 'Keyword Research', 'SERP / Rank', 'Competitors', 'Backlinks'].map((item) => (
                            <span key={item} className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{item}</span>
                        ))}
                    </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold">API login</span>
                            <span className="text-[10px] text-muted-foreground">{sourceLabel(loginSource)} · DATAFORSEO_LOGIN</span>
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            value={login}
                            placeholder={loginConfigured ? 'Configured - leave blank to keep' : 'DataForSEO API login'}
                            onChange={(event) => {
                                setLogin(event.target.value);
                                if (event.target.value) setClearLogin(false);
                            }}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                        />
                        {loginSource === 'cms' ? (
                            <button type="button" className="mt-1 text-[10px] font-semibold text-rose-500" onClick={() => { setClearLogin(true); setLogin(''); }}>
                                {clearLogin ? 'Will clear on save' : 'Clear stored login'}
                            </button>
                        ) : null}
                    </label>

                    <label className="block">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold">API password</span>
                            <span className="text-[10px] text-muted-foreground">{sourceLabel(passwordSource)} · DATAFORSEO_PASSWORD</span>
                        </div>
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            placeholder={passwordConfigured ? '•••••••• (leave blank to keep)' : 'DataForSEO API password'}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                if (event.target.value) setClearPassword(false);
                            }}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                        />
                        {passwordSource === 'cms' ? (
                            <button type="button" className="mt-1 text-[10px] font-semibold text-rose-500" onClick={() => { setClearPassword(true); setPassword(''); }}>
                                {clearPassword ? 'Will clear on save' : 'Clear stored password'}
                            </button>
                        ) : null}
                    </label>
                </div>

                <p className="mt-4 rounded-xl bg-muted/40 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                    Use the API login and API password from DataForSEO API Access. The password is different from the normal account password. Test connection uses DataForSEO&apos;s free account endpoint and does not consume paid SEO requests.
                </p>

                {effectiveTest ? (
                    <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${effectiveTest.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <div className="font-semibold">{effectiveTest.message}</div>
                        {effectiveTest.testedAt ? (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                                Tested {new Date(effectiveTest.testedAt).toLocaleString()}{typeof effectiveTest.latencyMs === 'number' ? ` · ${effectiveTest.latencyMs} ms` : ''}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={save} disabled={saving || testing} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background disabled:opacity-50">
                        <Save className="size-4" /> {saving ? 'Saving...' : 'Save credentials'}
                    </button>
                    <button type="button" onClick={test} disabled={saving || testing || !configured} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-50">
                        <RefreshCw className={`size-4 ${testing ? 'animate-spin' : ''}`} /> {testing ? 'Testing...' : 'Test connection'}
                    </button>
                </div>
            </article>
        </section>
    );
}
