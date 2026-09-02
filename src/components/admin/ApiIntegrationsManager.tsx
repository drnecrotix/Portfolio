'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, CircleDashed, PlugZap, RefreshCw, Save, ServerCog } from 'lucide-react';
import {
    saveApiIntegration,
    testApiIntegration,
    type ApiActionResult,
    type ApiIntegrationId,
} from '@/app/admin/(protected)/api-integrations/actions';

export type ApiIntegrationField = {
    key: string;
    label: string;
    envName: string;
    secret: boolean;
    configured: boolean;
    source: 'cms' | 'assistant' | 'environment' | 'site' | 'missing';
    help?: string;
};

export type ApiIntegrationCard = {
    id: ApiIntegrationId;
    name: string;
    category: string;
    description: string;
    usedBy: string[];
    docsHint: string;
    fields: ApiIntegrationField[];
    lastTest: {
        ok: boolean;
        testedAt: string;
        message: string;
        latencyMs?: number;
    } | null;
};

type Toast = { ok: boolean; message: string } | null;

function sourceLabel(source: ApiIntegrationField['source']) {
    if (source === 'cms') return 'API Integrations CMS';
    if (source === 'assistant') return 'AI Assistant CMS';
    if (source === 'environment') return 'Environment';
    if (source === 'site') return 'Site Settings';
    return 'Not configured';
}

function testStatus(card: ApiIntegrationCard, result?: ApiActionResult) {
    const test = result?.testedAt ? result : card.lastTest;
    if (test) return test.ok ? 'connected' : 'error';
    return card.fields.every((field) => field.configured) ? 'configured' : 'missing';
}

function StatusBadge({ status }: { status: ReturnType<typeof testStatus> }) {
    const content = status === 'connected'
        ? { label: 'Connected', icon: CheckCircle2, className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
        : status === 'error'
            ? { label: 'Test failed', icon: AlertCircle, className: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400' }
            : status === 'configured'
                ? { label: 'Configured', icon: PlugZap, className: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                : { label: 'Not configured', icon: CircleDashed, className: 'border-border bg-muted/40 text-muted-foreground' };
    const Icon = content.icon;
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${content.className}`}><Icon className="size-3.5" />{content.label}</span>;
}

function IntegrationCard({ card, testResult, onTestResult, onToast }: {
    card: ApiIntegrationCard;
    testResult?: ApiActionResult;
    onTestResult: (id: ApiIntegrationId, result: ApiActionResult) => void;
    onToast: (toast: Toast) => void;
}) {
    const router = useRouter();
    const [values, setValues] = useState<Record<string, string>>({});
    const [clearFields, setClearFields] = useState<string[]>([]);
    const [saving, startSaving] = useTransition();
    const [testing, startTesting] = useTransition();
    const status = testStatus(card, testResult);
    const lastTest = testResult?.testedAt ? testResult : card.lastTest;
    const lastTestTime = lastTest?.testedAt ? new Date(lastTest.testedAt).toLocaleString() : null;

    const save = () => {
        startSaving(async () => {
            const result = await saveApiIntegration({ id: card.id, values, clearFields });
            onToast(result);
            if (result.ok) {
                setValues({});
                setClearFields([]);
                router.refresh();
            }
        });
    };

    const test = () => {
        startTesting(async () => {
            const result = await testApiIntegration(card.id);
            onTestResult(card.id, result);
            onToast(result);
            router.refresh();
        });
    };

    return (
        <article className="rounded-2xl border border-border/70 bg-card/40 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{card.category}</p>
                    <h2 className="mt-1 text-xl font-bold">{card.name}</h2>
                </div>
                <StatusBadge status={status} />
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>

            <div className="mt-4 rounded-xl border border-border/60 bg-background/45 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Used by</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {card.usedBy.map((item) => <span key={item} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">{item}</span>)}
                </div>
            </div>

            <div className="mt-5 space-y-4">
                {card.fields.map((field) => {
                    const removeSelected = clearFields.includes(field.key);
                    return (
                        <div key={field.key}>
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor={`${card.id}-${field.key}`} className="text-xs font-semibold">{field.label}</label>
                                <span className="text-[10px] text-muted-foreground">Source: {sourceLabel(field.source)}</span>
                            </div>
                            <input
                                id={`${card.id}-${field.key}`}
                                type={field.secret ? 'password' : 'text'}
                                autoComplete="off"
                                value={values[field.key] ?? ''}
                                disabled={removeSelected}
                                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                                placeholder={field.configured ? 'Configured - leave blank to keep current value' : field.envName}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40 disabled:opacity-45"
                            />
                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span>{field.help || `Environment fallback: ${field.envName}`}</span>
                                {field.source === 'cms' ? (
                                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                                        <input
                                            type="checkbox"
                                            checked={removeSelected}
                                            onChange={(event) => setClearFields((current) => event.target.checked ? [...current, field.key] : current.filter((item) => item !== field.key))}
                                        />
                                        Remove CMS override
                                    </label>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="mt-4 rounded-xl bg-muted/40 px-3 py-2.5 text-xs leading-5 text-muted-foreground">{card.docsHint}</p>

            {lastTest ? (
                <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${lastTest.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="font-semibold">{lastTest.message}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                        {lastTestTime ? `Tested ${lastTestTime}` : 'Test completed'} {typeof lastTest.latencyMs === 'number' ? `· ${lastTest.latencyMs} ms` : ''}
                    </div>
                </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={saving || testing} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background disabled:opacity-50">
                    <Save className="size-4" /> {saving ? 'Saving...' : 'Save credentials'}
                </button>
                <button type="button" onClick={test} disabled={saving || testing} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-50">
                    <RefreshCw className={`size-4 ${testing ? 'animate-spin' : ''}`} /> {testing ? 'Testing...' : 'Test connection'}
                </button>
            </div>
        </article>
    );
}

export function ApiIntegrationsManager({ cards }: { cards: ApiIntegrationCard[] }) {
    const [results, setResults] = useState<Partial<Record<ApiIntegrationId, ApiActionResult>>>({});
    const [toast, setToast] = useState<Toast>(null);
    const [testingAll, startTestingAll] = useTransition();
    const configuredCount = useMemo(() => cards.filter((card) => card.fields.every((field) => field.configured)).length, [cards]);

    const setTestResult = (id: ApiIntegrationId, result: ApiActionResult) => {
        setResults((current) => ({ ...current, [id]: result }));
    };

    const testAll = () => {
        startTestingAll(async () => {
            for (const card of cards) {
                const result = await testApiIntegration(card.id);
                setTestResult(card.id, result);
            }
            setToast({ ok: true, message: 'Finished testing all API integrations.' });
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background"><ServerCog className="size-5" /></div>
                    <div>
                        <div className="text-sm font-bold">{configuredCount} of {cards.length} integrations have all required fields configured</div>
                        <div className="text-xs text-muted-foreground">Priority: API Integrations CMS → AI Assistant CMS where applicable → environment variables. GitHub can also infer the profile from Site Settings.</div>
                    </div>
                </div>
                <button type="button" onClick={testAll} disabled={testingAll} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold disabled:opacity-50">
                    <RefreshCw className={`size-4 ${testingAll ? 'animate-spin' : ''}`} /> {testingAll ? 'Testing all...' : 'Test all'}
                </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {cards.map((card) => (
                    <IntegrationCard key={card.id} card={card} testResult={results[card.id]} onTestResult={setTestResult} onToast={setToast} />
                ))}
            </div>

            {toast ? (
                <div aria-live="polite" className={`fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${toast.ok ? 'border-emerald-500/25 bg-background/95' : 'border-red-500/30 bg-background/95'}`}>
                    <div className="flex items-start gap-2">
                        {toast.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />}
                        <div className="pr-3">{toast.message}</div>
                        <button type="button" className="text-xs text-muted-foreground" onClick={() => setToast(null)}>×</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
