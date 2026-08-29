'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ProviderId = 'openai' | 'groq' | 'gemini' | 'openrouter';

type SaveIntegrationInput = {
    provider: ProviderId;
    model: string;
    apiKey: string;
    clearApiKey: boolean;
};

type SaveIntegrationResult = {
    ok: boolean;
    message: string;
};

type IntegrationAction = (input: SaveIntegrationInput) => Promise<SaveIntegrationResult>;

type ProviderDefinition = {
    id: ProviderId;
    name: string;
    note: string;
    billing: string;
    models: string[];
};

const providers: ProviderDefinition[] = [
    {
        id: 'openrouter',
        name: 'OpenRouter',
        note: 'Best zero-cost starting point for a small public text chat. openrouter/free automatically routes to currently available free models.',
        billing: 'Free router available - provider limits apply',
        models: ['openrouter/free'],
    },
    {
        id: 'groq',
        name: 'Groq',
        note: 'Very fast text inference and a good fit for short portfolio conversations.',
        billing: 'Developer/free-tier limits depend on the Groq account',
        models: ['llama-3.1-8b-instant'],
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        note: 'Flash and Flash-Lite models are designed for fast, cost-sensitive workloads.',
        billing: 'Free-tier availability and quotas depend on Google AI Studio and region',
        models: ['gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-2.5-flash-lite'],
    },
    {
        id: 'openai',
        name: 'OpenAI GPT',
        note: 'Use a smaller GPT model when you want OpenAI quality with lower token cost.',
        billing: 'OpenAI API usage requires API billing - it is not a free ChatGPT allowance',
        models: ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6'],
    },
];

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30';

export function AssistantApiIntegrations({
    action,
    initialProvider,
    initialModels,
    configured,
}: {
    action: IntegrationAction;
    initialProvider: ProviderId;
    initialModels: Record<ProviderId, string>;
    configured: Record<ProviderId, boolean>;
}) {
    const router = useRouter();
    const [provider, setProvider] = useState<ProviderId>(initialProvider);
    const [models, setModels] = useState(initialModels);
    const [apiKey, setApiKey] = useState('');
    const [clearApiKey, setClearApiKey] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | 'idle'>('idle');
    const [isPending, startTransition] = useTransition();

    const definition = useMemo(() => providers.find((item) => item.id === provider) ?? providers[0], [provider]);
    const model = models[provider];

    const save = () => {
        setMessage('');
        setMessageType('idle');
        startTransition(async () => {
            const result = await action({ provider, model, apiKey, clearApiKey });
            setMessage(result.message);
            setMessageType(result.ok ? 'success' : 'error');
            if (result.ok) {
                setApiKey('');
                setClearApiKey(false);
                router.refresh();
            }
        });
    };

    return (
        <section className="mb-8 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.025] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/55">AI integrations</p>
                    <h3 className="mt-2 text-xl font-semibold">Provider, model and API key</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
                        Choose the provider used first by the public assistant, select a lightweight text model and save its API key directly from the CMS. Stored keys are encrypted server-side and are never returned to the browser.
                    </p>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-xs ${configured[provider] ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-300'}`}>
                    {configured[provider] ? 'API configured' : 'API key required'}
                </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <label className="text-sm text-white/60">
                    Provider
                    <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)} className={inputClass}>
                        {providers.map((item) => <option key={item.id} value={item.id} className="bg-[#151515]">{item.name}</option>)}
                    </select>
                </label>

                <label className="text-sm text-white/60">
                    Text/chat model
                    <input
                        list={`assistant-models-${provider}`}
                        value={model}
                        onChange={(event) => setModels((current) => ({ ...current, [provider]: event.target.value }))}
                        className={inputClass}
                        placeholder="Enter provider model ID"
                    />
                    <datalist id={`assistant-models-${provider}`}>
                        {definition.models.map((item) => <option key={item} value={item} />)}
                    </datalist>
                    <span className="mt-1.5 block text-[11px] text-white/30">You can choose a suggestion or enter another valid model ID from the provider.</span>
                </label>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-5">
                <p className="text-sm text-white/65">{definition.note}</p>
                <p className="mt-1 text-xs text-white/35">{definition.billing}</p>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                    <label className="text-sm text-white/60">
                        API key
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={apiKey}
                            onChange={(event) => setApiKey(event.target.value)}
                            className={inputClass}
                            placeholder={configured[provider] ? 'Stored securely - leave blank to keep the current key' : 'Paste API key'}
                        />
                    </label>
                    <button
                        type="button"
                        disabled={isPending || !model.trim()}
                        onClick={save}
                        className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-50"
                    >
                        {isPending ? 'Saving integration…' : 'Save integration'}
                    </button>
                </div>

                <label className="mt-4 flex items-center gap-3 text-xs text-white/45">
                    <input type="checkbox" checked={clearApiKey} onChange={(event) => setClearApiKey(event.target.checked)} />
                    Remove the stored CMS API key for this provider. An environment-variable key can still be used as a fallback.
                </label>
            </div>

            {message && (
                <div role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${messageType === 'success' ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200' : 'border-red-400/20 bg-red-400/[0.07] text-red-200'}`}>
                    {message}
                </div>
            )}

            <p className="mt-5 text-[11px] leading-5 text-white/30">
                Recommended for the smallest chat cost: OpenRouter Free, Groq Llama 3.1 8B, or Gemini Flash-Lite. Provider quotas and model availability can change independently of this CMS.
            </p>
        </section>
    );
}
