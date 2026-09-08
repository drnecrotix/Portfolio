'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Fingerprint, KeyRound, Loader2, LockKeyhole, Radar, Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { FootprintFinding, FootprintScan } from '@/modules/digital-footprint/types';

type Stage = 'email' | 'code' | 'ready' | 'results';
type BrowserSignal = { label: string; value: string; exposure: 'low' | 'medium' | 'high' };

function riskColor(risk: string) {
    if (risk === 'critical') return 'text-rose-400 border-rose-400/25 bg-rose-400/5';
    if (risk === 'high') return 'text-orange-400 border-orange-400/25 bg-orange-400/5';
    if (risk === 'medium') return 'text-amber-400 border-amber-400/25 bg-amber-400/5';
    return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
}

function collectBrowserSignals(): BrowserSignal[] {
    if (typeof window === 'undefined') return [];
    const nav = navigator as Navigator & { deviceMemory?: number };
    return [
        { label: 'Browser identity', value: navigator.userAgent, exposure: 'high' },
        { label: 'Platform', value: navigator.platform || 'Unavailable', exposure: 'medium' },
        { label: 'Languages', value: navigator.languages.join(', ') || navigator.language, exposure: 'medium' },
        { label: 'Timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone, exposure: 'medium' },
        { label: 'Screen', value: `${window.screen.width} × ${window.screen.height} · ${window.devicePixelRatio}x`, exposure: 'medium' },
        { label: 'CPU threads', value: String(navigator.hardwareConcurrency || 'Unavailable'), exposure: 'low' },
        { label: 'Device memory', value: nav.deviceMemory ? `${nav.deviceMemory} GB approximation` : 'Unavailable', exposure: 'low' },
        { label: 'Cookies', value: navigator.cookieEnabled ? 'Enabled' : 'Disabled', exposure: 'low' },
        { label: 'Do Not Track', value: navigator.doNotTrack || 'Not set', exposure: 'low' },
    ];
}

async function sha1(value: string) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function DigitalFootprintClient() {
    const [stage, setStage] = useState<Stage>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [usernames, setUsernames] = useState('');
    const [consent, setConsent] = useState(false);
    const [company, setCompany] = useState('');
    const [token, setToken] = useState('');
    const [scan, setScan] = useState<FootprintScan | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'all' | FootprintFinding['category']>('all');
    const [browserSignals, setBrowserSignals] = useState<BrowserSignal[]>([]);
    const [password, setPassword] = useState('');
    const [passwordResult, setPasswordResult] = useState<string>('');

    useEffect(() => {
        const timer = window.setTimeout(() => setBrowserSignals(collectBrowserSignals()), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const findings = useMemo(() => scan?.findings.filter((item) => category === 'all' || item.category === category) || [], [category, scan]);
    const summary = useMemo(() => {
        const found = scan?.findings.filter((item) => item.status === 'found') || [];
        return {
            records: found.length,
            sources: new Set(found.map((item) => item.provider)).size,
            passwordBreaches: found.filter((item) => item.exposedFields?.some((field) => /password/i.test(field))).length,
            identifiers: [...new Set(found.flatMap((item) => item.exposedFields || []))],
        };
    }, [scan]);

    async function post(url: string, body: unknown, auth = false) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) throw new Error(String(payload.error || 'Request failed.'));
        return payload;
    }

    async function requestCode() {
        setLoading(true); setMessage('');
        try {
            await post('/api/digital-footprint/request-code', { email, consent, company });
            setStage('code'); setMessage('A six-digit verification code was sent to your email.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Verification could not start.'); }
        finally { setLoading(false); }
    }

    async function verify() {
        setLoading(true); setMessage('');
        try {
            const payload = await post('/api/digital-footprint/verify', { email, code });
            setToken(String(payload.token || '')); setStage('ready'); setMessage('Email ownership verified for 30 minutes.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Verification failed.'); }
        finally { setLoading(false); }
    }

    async function runScan() {
        setLoading(true); setMessage('Checking configured providers. This can take several seconds.');
        try {
            const list = usernames.split(',').map((value) => value.trim()).filter(Boolean);
            const payload = await post('/api/digital-footprint/scan', { usernames: list }, true) as { scan?: FootprintScan };
            if (!payload.scan) throw new Error('The scanner returned no report.');
            setScan(payload.scan); setStage('results'); setMessage('Scan complete. Results exist only in this browser tab.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Scan failed.'); }
        finally { setLoading(false); }
    }

    async function checkPassword() {
        if (!password) return;
        setPasswordResult('Checking locally...');
        try {
            const hash = await sha1(password);
            const response = await fetch(`/api/digital-footprint/password-range/${hash.slice(0, 5)}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Password provider unavailable.');
            const suffix = hash.slice(5);
            const match = (await response.text()).split('\n').find((line) => line.startsWith(`${suffix}:`));
            setPasswordResult(match ? `Exposed ${Number(match.split(':')[1] || 0).toLocaleString()} times. Change it anywhere it is still used.` : 'No match found in the checked corpus. This does not guarantee the password is safe.');
        } catch (error) { setPasswordResult(error instanceof Error ? error.message : 'Password check failed.'); }
        finally { setPassword(''); }
    }

    function exportReport() {
        if (!scan) return;
        const blob = new Blob([JSON.stringify({ scan, browserSignals }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `necrotixlab-footprint-${new Date().toISOString().slice(0, 10)}.json`; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function clearSession() {
        if (token) await fetch('/api/digital-footprint/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        setToken(''); setScan(null); setEmail(''); setCode(''); setUsernames(''); setStage('email'); setMessage('Verification and results cleared.');
    }

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-500">NecrotixLab · Security tool</p>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Digital Footprint</h1>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Verify your email, inspect the public traces connected to your identity and get practical steps to reduce your exposure. No scan results are stored.</p>
                </div>

                <section className="mt-10 rounded-[2rem] border border-border/70 bg-card/35 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
                        <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-sky-500" /><div><h2 className="font-semibold">Verified self-audit</h2><p className="text-xs text-muted-foreground">Email ownership is required before identity providers run.</p></div></div>
                        <span className="rounded-full border border-border px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{stage}</span>
                    </div>

                    {stage === 'email' && <div className="mt-6 grid gap-4">
                        <label><span className="text-xs font-semibold">Email address</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-border bg-background/70 px-4 py-3 outline-none focus:border-sky-500/60" /></label>
                        <label className="hidden" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
                        <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 accent-sky-500" /><span>I confirm that I control this email and authorize a short-lived self-audit against configured public and breach-intelligence providers.</span></label>
                        <button disabled={loading || !email || !consent} onClick={requestCode} className="inline-flex w-fit items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />} Send verification code</button>
                    </div>}

                    {stage === 'code' && <div className="mt-6 grid gap-4"><label><span className="text-xs font-semibold">Six-digit code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-2 w-full max-w-xs rounded-xl border border-border bg-background/70 px-4 py-3 font-mono text-xl tracking-[0.3em] outline-none focus:border-sky-500/60" /></label><button disabled={loading || code.length !== 6} onClick={verify} className="inline-flex w-fit items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Verify email</button></div>}

                    {(stage === 'ready' || stage === 'results') && <div className="mt-6 grid gap-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400">Verified: {email}</div><label><span className="text-xs font-semibold">Your public usernames <span className="font-normal text-muted-foreground">- optional, up to 3, comma-separated</span></span><input value={usernames} onChange={(event) => setUsernames(event.target.value)} placeholder="username, alternate_name" className="mt-2 w-full rounded-xl border border-border bg-background/70 px-4 py-3 outline-none focus:border-sky-500/60" /></label><div className="flex flex-wrap gap-3"><button disabled={loading} onClick={runScan} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />} {stage === 'results' ? 'Run again' : 'Start private scan'}</button><button onClick={clearSession} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold"><Trash2 className="size-4" /> Clear session</button></div></div>}
                    {message && <p className="mt-5 text-xs leading-5 text-muted-foreground" role="status">{message}</p>}
                </section>

                {scan && <section className="mt-8">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Exposure score" value={`${scan.riskScore}/100`} /><Metric label="Compromised / public records" value={String(summary.records)} /><Metric label="Unique sources" value={String(summary.sources)} /><Metric label="Records mentioning passwords" value={String(summary.passwordBreaches)} /></div>
                    {summary.identifiers.length > 0 && <div className="mt-4 rounded-2xl border border-border/70 bg-card/35 p-5"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Visible data types</p><div className="mt-3 flex flex-wrap gap-2">{summary.identifiers.map((field) => <span key={field} className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground">{field}</span>)}</div></div>}
                    <p className="mt-3 text-xs text-muted-foreground">{scan.providersAvailable} of {scan.providersChecked} providers were configured and available. Every returned field is shown - there is no premium result tier.</p>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['all', 'account', 'breach', 'domain', 'reputation'] as const).map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-xs capitalize ${category === item ? 'border-sky-500/50 bg-sky-500/10 text-sky-400' : 'border-border text-muted-foreground'}`}>{item}</button>)}</div><div className="flex gap-2"><button onClick={exportReport} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"><Download className="size-3.5" /> JSON</button><button onClick={() => window.print()} className="rounded-xl border border-border px-3 py-2 text-xs">Print / PDF</button></div></div>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">{scan.notice}</p>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">{findings.map((item) => <FindingCard key={item.id} item={item} />)}{findings.length === 0 && <div className="rounded-2xl border border-border p-8 text-sm text-muted-foreground">No findings in this category.</div>}</div>
                </section>}

                <section className="mt-10 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[2rem] border border-border/70 bg-card/35 p-5 sm:p-7"><div className="flex items-center gap-3"><Fingerprint className="size-5 text-violet-400" /><div><h2 className="font-semibold">Browser footprint</h2><p className="text-xs text-muted-foreground">Calculated locally and never submitted.</p></div></div><div className="mt-5 grid gap-2">{browserSignals.map((signal) => <div key={signal.label} className="rounded-xl border border-border/60 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold">{signal.label}</span><span className="font-mono text-[9px] uppercase text-muted-foreground">{signal.exposure}</span></div><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{signal.value}</p></div>)}</div></div>
                    <div className="rounded-[2rem] border border-border/70 bg-card/35 p-5 sm:p-7"><div className="flex items-center gap-3"><KeyRound className="size-5 text-amber-400" /><div><h2 className="font-semibold">Pwned password check</h2><p className="text-xs text-muted-foreground">SHA-1 is calculated locally; only a 5-character prefix is sent.</p></div></div><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="Enter a password to check locally" className="mt-5 w-full rounded-xl border border-border bg-background/70 px-4 py-3 outline-none focus:border-amber-500/60" /><button disabled={!password} onClick={checkPassword} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><Search className="size-4" /> Check exposure</button>{passwordResult && <p className="mt-4 rounded-xl border border-border/60 p-4 text-xs leading-5 text-muted-foreground">{passwordResult}</p>}</div>
                </section>

                <div className="mt-10 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs leading-5 text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" /><p>This tool reports defensive self-audit leads. It never retrieves or displays passwords, tokens, private messages or authentication secrets. Confirm every profile directly before acting on a match.</p></div>
            </div>
        </main>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-2xl border border-border/70 bg-card/35 p-5"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>;
}

function FindingCard({ item }: { item: FootprintFinding }) {
    return <article className={`rounded-2xl border p-5 ${riskColor(item.risk)}`}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-75">{item.category} · {item.provider}</p><h3 className="mt-2 font-semibold text-foreground">{item.title}</h3>{item.occurredAt && <p className="mt-1 font-mono text-[10px] text-muted-foreground">Observed / breached: {item.occurredAt}</p>}</div><span className="rounded-full border border-current/20 px-2 py-1 font-mono text-[9px] uppercase">{item.risk}</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.summary}</p>{item.exposedFields?.length ? <div className="mt-4 flex flex-wrap gap-1.5">{item.exposedFields.map((field, index) => <span key={`${field}-${index}`} className="rounded-full border border-border/70 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">{field}</span>)}</div> : null}<div className="mt-4 border-t border-current/10 pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider">Recommended action</p>{item.remediation.map((step) => <p key={step} className="mt-1 text-xs text-muted-foreground">- {step}</p>)}</div>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline">Review source <ExternalLink className="size-3" /></a>}</article>;
}
