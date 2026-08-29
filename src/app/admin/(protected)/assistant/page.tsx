import { prisma } from '@/lib/prisma';
import { hasStoredAssistantApiKey } from '@/lib/assistant-credentials';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import { StatusToast } from '@/components/admin/StatusToast';
import { AssistantApiIntegrations } from '@/components/admin/AssistantApiIntegrations';
import { AssistantConfigurator } from '@/components/admin/AssistantConfigurator';
import { saveAssistantIntegration, updateAssistantSettings } from './actions';

export const dynamic = 'force-dynamic';

type IntegrationProvider = 'openai' | 'groq' | 'gemini' | 'openrouter';

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [site, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { assistantSettings: true } }),
        searchParams,
    ]);
    const rawSettings = site?.assistantSettings;
    const settings = normalizeAssistantSettings(rawSettings);
    const openRouter = settings.customProviders.find((provider) => provider.id === 'openrouter');

    const configured: Record<IntegrationProvider, boolean> = {
        openai: hasStoredAssistantApiKey(rawSettings, 'openai') || Boolean(process.env.OPENAI_API_KEY),
        groq: hasStoredAssistantApiKey(rawSettings, 'groq') || Boolean(process.env.GROQ_API_KEY),
        gemini: hasStoredAssistantApiKey(rawSettings, 'gemini') || Boolean(process.env.GEMINI_API_KEY),
        openrouter: hasStoredAssistantApiKey(rawSettings, 'openrouter') || Boolean(process.env.OPENROUTER_API_KEY),
    };

    const initialModels: Record<IntegrationProvider, string> = {
        openai: settings.openaiModel,
        groq: settings.groqModel,
        gemini: settings.geminiModel,
        openrouter: openRouter?.model || 'openrouter/free',
    };

    const rankedProviders: Array<{ id: IntegrationProvider; priority: number }> = [
        { id: 'openai', priority: settings.openaiPriority },
        { id: 'groq', priority: settings.groqPriority },
        { id: 'gemini', priority: settings.geminiPriority },
        { id: 'openrouter', priority: openRouter?.priority ?? 10_000 },
    ];
    const initialProvider = rankedProviders.sort((a, b) => a.priority - b.priority)[0]?.id ?? 'openrouter';

    const providers = [
        { id: 'openai', name: 'OpenAI / GPT', configured: configured.openai, model: settings.openaiModel, priority: settings.openaiPriority },
        { id: 'groq', name: 'Groq', configured: configured.groq, model: settings.groqModel, priority: settings.groqPriority },
        { id: 'gemini', name: 'Gemini', configured: configured.gemini, model: settings.geminiModel, priority: settings.geminiPriority },
        ...(openRouter ? [{ id: 'openrouter', name: 'OpenRouter', configured: configured.openrouter, model: openRouter.model, priority: openRouter.priority }] : []),
        ...settings.customProviders.filter((provider) => provider.id !== 'openrouter').map((provider) => ({
            id: provider.id,
            name: provider.name,
            configured: hasStoredAssistantApiKey(rawSettings, provider.id) || Boolean(process.env[provider.apiKeyEnv]),
            model: provider.model,
            priority: provider.priority,
        })),
    ].sort((a, b) => a.priority - b.priority);

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'AI Assistant settings saved and applied.' : undefined)} />
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">AI Assistant</p>
                    <h2 className="mt-2 text-4xl font-semibold">Assistant studio</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Personalize the chat experience, choose lightweight text models and manage provider API keys directly from the CMS. CMS keys are encrypted server-side, while hosting environment variables remain supported as a fallback.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/55">
                    {settings.enabled ? <span className="text-emerald-300">● Public assistant enabled</span> : <span className="text-amber-300">● Public assistant disabled</span>}
                </div>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {providers.map((provider) => (
                    <div key={`${provider.id}-${provider.priority}`} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{provider.name}</p><span className="text-[10px] uppercase tracking-wider text-white/30">#{provider.priority}</span></div>
                        <p className={`mt-2 text-xs ${provider.configured ? 'text-emerald-300' : 'text-amber-300'}`}>{provider.configured ? 'API key configured' : 'API key missing'}</p>
                        <p className="mt-2 truncate text-xs text-white/30" title={provider.model}>{provider.model}</p>
                    </div>
                ))}
            </div>

            <AssistantApiIntegrations
                action={saveAssistantIntegration}
                initialProvider={initialProvider}
                initialModels={initialModels}
                configured={configured}
            />

            <form action={updateAssistantSettings} className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4" /> Enable public AI Assistant</label>
                </section>
                <AssistantConfigurator settings={settings} />
                <div className="sticky bottom-5 z-20 flex justify-end">
                    <button className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-2xl shadow-black/40">Save AI Assistant</button>
                </div>
            </form>
        </div>
    );
}
