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
    required?: boolean;
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

function requiredFieldsReady(card: ApiIntegrationCard) {
    return card.fields.filter((field) => field.required !== false).every((field) => field.configured);
}

function testStatus(card: ApiIntegrationCard, result?: ApiActionResult) {
    const test = result?.testedAt ? result : card.lastTest;
    if (test) return test.ok ? 'connected' : 'error';
    return requiredFieldsReady(card) ? 'configured' : 'missing';
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
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${content.className}`}>
            <Icon className="size-3.5" /> {content.label}
        </span>
    );
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
                    {card.usedBy.map((item) => (
                        <span key={item} className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{item}</span>
                    ))}
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {card.fields.map((field) => {
                    const pending = values[field.key] !== undefined;
                    const clearing = clearFields.includes(field.key);
                    return (
                        <label key={field.key} className="block">
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold">{field.label}</span>
                                <span className="text-[10px] text-muted-foreground">{sourceLabel(field.source)} · {field.envName}</span>
                            </div>
                            <input
                                type={field.secret ? 'password' : 'text'}
                                autoComplete="off"
                                placeholder={field.configured && field.secret ? '•••••••• (leave blank to keep)' : field.help || field.envName}
                                value={values[field.key] ?? ''}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    setValues((current) => {
                                        const copy = { ...current };
                                        if (!next) delete copy[field.key];
                                        else copy[field.key] = next;
                                        return copy;
                                    });
                                    setClearFields((current) => current.filter((key) => key !== field.key));
                                }}
                                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-foreground/40"
                            />
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                                {field.help ? <span>{field.help}</span> : null}
                                {field.configured && field.secret ? (
                                    <button
                                        type="button"
                                        className="font-semibold text-rose-500"
                                        onClick={() => {
                                            setClearFields((current) => current.includes(field.key) ? current : [...current, field.key]);
                                            setValues((current) => {
                                                const copy = { ...current };
                                                delete copy[field.key];
                                                return copy;
                                            });
                                        }}
                                    >
                                        {clearing ? 'Will clear on save' : 'Clear stored secret'}
                                    </button>
                                ) : null}
                                {pending ? <span className="text-amber-500">Unsaved change</span> : null}
                            </div>
                        </label>
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

const TAB_ORDER = [
    'Digital Footprint',
    'Email & verification',
    'Development data',
    'Coding metrics',
    'Commerce & payments',
    'AI provider',
    'Media & private file storage',
] as const;

export function ApiIntegrationsManager({ cards }: { cards: ApiIntegrationCard[] }) {
    const [results, setResults] = useState<Partial<Record<ApiIntegrationId, ApiActionResult>>>({});
    const [toast, setToast] = useState<Toast>(null);
    const [testingAll, startTestingAll] = useTransition();
    const categories = useMemo(() => {
        const present = new Set(cards.map((c) => c.category));
        const ordered = TAB_ORDER.filter((c) => present.has(c));
        const rest = [...present].filter((c) => !TAB_ORDER.includes(c as typeof TAB_ORDER[number])).sort();
        return [...ordered, ...rest];
    }, [cards]);
    const [activeTab, setActiveTab] = useState<string>('');
    const currentTab = activeTab && categories.includes(activeTab) ? activeTab : (categories[0] || '');
    const visibleCards = useMemo(() => cards.filter((c) => c.category === currentTab), [cards, currentTab]);
    const configuredCount = useMemo(() => cards.filter(requiredFieldsReady).length, [cards]);

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

            {categories.length > 1 ? (
                <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
                    {categories.map((cat) => {
                        const count = cards.filter((c) => c.category === cat).length;
                        const active = cat === currentTab;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveTab(cat)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? 'bg-foreground text-background' : 'border border-border bg-background text-muted-foreground hover:text-foreground'}`}
                            >
                                {cat} <span className="opacity-60">({count})</span>
                            </button>
                        );
                    })}
                </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
                {visibleCards.map((card) => (
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
