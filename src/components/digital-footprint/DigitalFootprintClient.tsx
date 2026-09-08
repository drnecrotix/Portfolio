'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Clock3, Download, ExternalLink, Loader2, Radar, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type { FootprintFinding, FootprintScan } from '@/modules/digital-footprint/types';

function riskColor(risk: string) {
    if (risk === 'critical') return 'text-rose-400 border-rose-400/25 bg-rose-400/5';
    if (risk === 'high') return 'text-orange-400 border-orange-400/25 bg-orange-400/5';
    if (risk === 'medium') return 'text-amber-400 border-amber-400/25 bg-amber-400/5';
    return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
}

export function DigitalFootprintClient() {
    const [query, setQuery] = useState('');
    const [consent, setConsent] = useState(false);
    const [company, setCompany] = useState('');
    const [challengeToken, setChallengeToken] = useState('');
    const [challengeQuestion, setChallengeQuestion] = useState('');
    const [challengeAnswer, setChallengeAnswer] = useState('');
    const [botCheckEnabled, setBotCheckEnabled] = useState(true);
    const [scan, setScan] = useState<FootprintScan | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'all' | FootprintFinding['category']>('all');
    const [resultSearch, setResultSearch] = useState('');
    const [resultView, setResultView] = useState<'list' | 'timeline'>('list');
    const [selectedFinding, setSelectedFinding] = useState<FootprintFinding | null>(null);

    const findings = useMemo(() => {
        const needle = resultSearch.trim().toLowerCase();
        const rows = scan?.findings.filter((item) => (category === 'all' || item.category === category) && (!needle || `${item.title} ${item.provider} ${item.summary} ${(item.exposedFields || []).join(' ')}`.toLowerCase().includes(needle))) || [];
        return resultView === 'timeline' ? [...rows].sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || ''))) : rows;
    }, [category, resultSearch, resultView, scan]);
    const summary = useMemo(() => {
        const found = scan?.findings.filter((item) => item.status === 'found') || [];
        return {
            records: found.length,
            sources: new Set(found.map((item) => item.provider)).size,
            passwordBreaches: found.filter((item) => item.exposedFields?.some((field) => /password/i.test(field))).length,
            identifiers: [...new Set(found.flatMap((item) => item.exposedFields || []))],
        };
    }, [scan]);

    async function post(url: string, body: unknown) {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) throw new Error(String(payload.error || 'Request failed.'));
        return payload;
    }

    async function loadChallenge() {
        const response = await fetch('/api/digital-footprint/challenge', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (!response.ok) throw new Error(String(payload.error || 'Bot check unavailable.'));
        const enabled = payload.enabled !== false;
        setBotCheckEnabled(enabled);
        setChallengeToken(String(payload.token || ''));
        setChallengeQuestion(String(payload.question || ''));
        setChallengeAnswer('');
    }

    useEffect(() => {
        const timer = window.setTimeout(() => void loadChallenge().catch((error) => setMessage(error instanceof Error ? error.message : 'Bot check unavailable.')), 0);
        return () => window.clearTimeout(timer);
    }, []);

    async function runScan() {
        setLoading(true); setMessage('Checking configured providers. This can take several seconds.');
        try {
            const payload = await post('/api/digital-footprint/scan', { query, consent, company, challengeToken, challengeAnswer }) as { scan?: FootprintScan };
            if (!payload.scan) throw new Error('The scanner returned no report.');
            setScan(payload.scan); setMessage('Scan complete. Results exist only in this browser tab.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Scan failed.'); }
        finally { setLoading(false); void loadChallenge().catch(() => undefined); }
    }

    function exportReport() {
        if (!scan) return;
        const blob = new Blob([JSON.stringify({ scan }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `necrotixlab-footprint-${new Date().toISOString().slice(0, 10)}.json`; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function clearSession() {
        setScan(null); setQuery(''); setConsent(false); setMessage('Lookup and results cleared.');
        await loadChallenge().catch(() => undefined);
    }

    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 lg:pt-36">
            <div className="mx-auto max-w-6xl">
                <div className="max-w-3xl">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-500">NecrotixLab · Security tool</p>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Digital Footprint</h1>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Check an email address, phone number or username against supported public exposure sources and get practical steps to reduce risk. No scan results are stored.</p>
                </div>

                <section className="mt-10 rounded-[2rem] border border-border/70 bg-card/35 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
                        <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-sky-500" /><div><h2 className="font-semibold">Privacy exposure lookup</h2><p className="text-xs text-muted-foreground">No verification email, account or premium result tier.</p></div></div>
                        <span className="rounded-full border border-border px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">protected lookup</span>
                    </div>

                    <div className="mt-6 grid gap-4">
                        <label><span className="text-xs font-semibold">Email, phone number or username</span><div className="relative mt-2"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} type="text" autoComplete="off" placeholder="you@example.com, +359... or username" className="w-full rounded-xl border border-border bg-background/70 py-3 pl-11 pr-4 outline-none focus:border-sky-500/60" /></div><span className="mt-2 block text-[10px] text-muted-foreground">The identifier type is detected automatically.</span></label>
                        <label className="hidden" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
                        {botCheckEnabled ? (
                            <label><span className="text-xs font-semibold">Bot check: {challengeQuestion || 'Loading...'}</span><input value={challengeAnswer} onChange={(event) => setChallengeAnswer(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" autoComplete="off" className="mt-2 w-full max-w-xs rounded-xl border border-border bg-background/70 px-4 py-3 outline-none focus:border-sky-500/60" /></label>
                        ) : (
                            <p className="text-[10px] text-muted-foreground">Bot check is currently disabled by the site administrator.</p>
                        )}
                        <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 accent-sky-500" /><span>I am checking my own identifier or have permission to check it, and I authorize queries to the listed public providers.</span></label>
                        <div className="flex flex-wrap gap-3"><button disabled={loading || !query || !consent || (botCheckEnabled && (!challengeToken || !challengeAnswer))} onClick={runScan} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />} {scan ? 'Run again' : 'Start lookup'}</button><button onClick={clearSession} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold"><Trash2 className="size-4" /> Clear</button></div>
                    </div>
                    {message && <p className="mt-5 text-xs leading-5 text-muted-foreground" role="status">{message}</p>}
                </section>

                {scan && <section className="mt-8">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Exposure score" value={`${scan.riskScore}/100`} /><Metric label="Compromised / public records" value={String(summary.records)} /><Metric label="Unique sources" value={String(summary.sources)} /><Metric label="Records mentioning passwords" value={String(summary.passwordBreaches)} /></div>
                    {summary.identifiers.length > 0 && <div className="mt-4 rounded-2xl border border-border/70 bg-card/35 p-5"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Visible data types</p><div className="mt-3 flex flex-wrap gap-2">{summary.identifiers.map((field) => <span key={field} className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground">{field}</span>)}</div></div>}
                    <div className="mt-4 flex flex-wrap gap-2">{scan.providerStatuses.map((provider) => <span key={provider.id} className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground"><span className={`mr-1.5 inline-block size-1.5 rounded-full ${provider.status === 'available' ? 'bg-emerald-400' : provider.status === 'unavailable' ? 'bg-rose-400' : 'bg-zinc-500'}`} />{provider.label} - {provider.status}</span>)}</div>
                    <p className="mt-3 text-xs text-muted-foreground">Detected as <strong className="text-foreground">{scan.queryType}</strong>. {scan.providersAvailable} of {scan.providersChecked} providers were available. Every safe metadata field returned by the integrations is shown - there is no premium result tier. Powered in part by <a href="https://leakcheck.io/" target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:underline">LeakCheck</a>.</p>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['all', 'account', 'breach', 'domain', 'reputation'] as const).map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-xs capitalize ${category === item ? 'border-sky-500/50 bg-sky-500/10 text-sky-400' : 'border-border text-muted-foreground'}`}>{item}</button>)}</div><div className="flex gap-2"><button onClick={() => setResultView(resultView === 'list' ? 'timeline' : 'list')} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"><Clock3 className="size-3.5" /> {resultView === 'list' ? 'Timeline' : 'List'}</button><button onClick={exportReport} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"><Download className="size-3.5" /> JSON</button><button onClick={() => window.print()} className="rounded-xl border border-border px-3 py-2 text-xs">Print / PDF</button></div></div>
                    <div className="relative mt-4"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><input value={resultSearch} onChange={(event) => setResultSearch(event.target.value)} placeholder="Filter results..." className="w-full rounded-xl border border-border bg-card/35 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500/60" /></div>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">{scan.notice}</p>
                    {scan.relatedAccounts && scan.relatedAccounts.length > 0 ? (
                        <section className="mt-6 rounded-2xl border border-border/70 bg-card/25 p-4 sm:p-5">
                            <h3 className="text-sm font-semibold">Related accounts</h3>
                            <p className="mt-1 text-xs text-muted-foreground">Public profiles linked to the searched email, phone or username. Matches are leads — confirm ownership before acting.</p>
                            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                {scan.relatedAccounts.map((account) => {
                                    const label = account.displayName || (typeof account.exposedData?.['Display name'] === 'string' ? String(account.exposedData['Display name']) : undefined);
                                    const heading = label || `@${account.username}`;
                                    return (
                                    <li key={`${account.platform}-${account.username}`} className="rounded-xl border border-border/70 bg-background/50 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{account.platform} · via {account.linkedVia}</p>
                                                {account.url ? (
                                                    <a href={account.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 font-semibold hover:underline">
                                                        <span className="truncate">{heading}</span>
                                                        <ExternalLink className="size-3 shrink-0 opacity-70" />
                                                    </a>
                                                ) : (
                                                    <p className="mt-1 truncate font-semibold">{heading}</p>
                                                )}
                                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">@{account.username}</p>
                                            </div>
                                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{account.confidence}%</span>
                                        </div>
                                        {account.summary ? <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{account.summary}</p> : null}
                                        {account.exposedData && Object.keys(account.exposedData).length ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {Object.entries(account.exposedData).slice(0, 6).map(([k, v]) => (
                                                    <span key={k} className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{k}: {String(v)}</span>
                                                ))}
                                            </div>
                                        ) : null}
                                        {account.url ? (
                                            <a href={account.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline">
                                                Open {account.platform} profile <ExternalLink className="size-3" />
                                            </a>
                                        ) : null}
                                    </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ) : null}
                    <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card/25">{findings.map((item) => <FindingRow key={item.id} item={item} onOpen={() => setSelectedFinding(item)} />)}{findings.length === 0 && <div className="p-8 text-sm text-muted-foreground">No findings match this view.</div>}</div>
                </section>}

                <div className="mt-10 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs leading-5 text-muted-foreground"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" /><p>This tool reports defensive self-audit leads. It never retrieves or displays passwords, tokens, private messages or authentication secrets. Confirm every profile directly before acting on a match.</p></div>
            </div>
            {selectedFinding && <FindingDialog item={selectedFinding} onClose={() => setSelectedFinding(null)} />}
        </main>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return <div className="rounded-2xl border border-border/70 bg-card/35 p-5"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>;
}

function FindingRow({ item, onOpen }: { item: FootprintFinding; onOpen: () => void }) {
    return <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left last:border-b-0 hover:bg-foreground/[0.03]"><span className={`h-8 w-1 shrink-0 rounded-full ${riskColor(item.risk)}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate text-sm font-semibold">{item.title}</span><span className="font-mono text-[9px] uppercase text-muted-foreground">{item.provider}</span>{item.duplicateCount && item.duplicateCount > 1 ? <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] text-sky-400">{item.duplicateCount} sources</span> : null}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{item.occurredAt || item.category} - {(item.exposedFields || []).slice(0, 4).join(', ') || item.status}</p></div><span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase ${riskColor(item.risk)}`}>{item.risk}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>;
}

function FindingDialog({ item, onClose }: { item: FootprintFinding; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finding-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <article className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            {item.category} - {item.provider}
                        </p>
                        <h3 id="finding-title" className="mt-2 text-xl font-bold">{item.title}</h3>
                        {item.occurredAt ? <p className="mt-1 text-xs text-muted-foreground">{item.occurredAt}</p> : null}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
                        <X className="size-4" />
                    </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                {item.exposedData && Object.keys(item.exposedData).length ? (
                    <div className="mt-5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Exposed data</p>
                        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                            {Object.entries(item.exposedData).map(([key, value]) => (
                                <div key={key} className="rounded-xl border border-border/70 bg-card/40 px-3 py-2">
                                    <dt className="text-[10px] text-muted-foreground">{key}</dt>
                                    <dd className="mt-1 break-all text-sm font-medium">{String(value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ) : null}
                {item.exposedFields && item.exposedFields.length ? (
                    <div className="mt-5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Fields reported</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.exposedFields.map((field) => (
                                <span key={field} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{field}</span>
                            ))}
                        </div>
                    </div>
                ) : null}
                {item.remediation.length ? (
                    <div className="mt-5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Recommended actions</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                            {item.remediation.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:underline">
                        Open source <ExternalLink className="size-3.5" />
                    </a>
                ) : null}
            </article>
        </div>
    );
}
