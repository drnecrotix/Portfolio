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

    const ranked: Array<{ id: IntegrationProvider; priority: number }> = [
        { id: 'openai', priority: settings.openaiPriority },
        { id: 'groq', priority: settings.groqPriority },
        { id: 'gemini', priority: settings.geminiPriority },
        { id: 'openrouter', priority: openRouter?.priority ?? 100 },
    ];
    const initialProvider = ranked.sort((a, b) => a.priority - b.priority)[0]?.id ?? 'openrouter';
    const quickReplyCount = settings.responseTemplates.filter((template) => template.enabled).length;

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'AI Assistant settings saved and applied.' : undefined)} />

            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">AI Assistant</p>
                    <h2 className="mt-2 text-4xl font-semibold">Chat setup</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">The assistant now follows one simple flow: prepared chat buttons return prepared answers instantly, while every other free-form question is sent to the single AI provider selected below.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full border px-3 py-1.5 ${settings.enabled ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{settings.enabled ? 'Chat enabled' : 'Chat disabled'}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/55">{quickReplyCount} quick replies</span>
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">1. Visitor chooses a button</p><p className="mt-2 text-sm leading-6 text-white/65">A prepared question is answered locally from the saved quick reply. No AI request is needed.</p></div>
                    <div><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">2. Visitor types something else</p><p className="mt-2 text-sm leading-6 text-white/65">The message is sent to the selected provider using its configured API key and model.</p></div>
                    <div><p className="text-[10px] uppercase tracking-[0.2em] text-white/35">3. Portfolio context only</p><p className="mt-2 text-sm leading-6 text-white/65">AI answers remain grounded in the public CMS portfolio context instead of inventing personal information.</p></div>
                </div>
            </section>

            <AssistantApiIntegrations action={saveAssistantIntegration} initialProvider={initialProvider} initialModels={initialModels} configured={configured} />

            <form action={updateAssistantSettings} className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                    <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4" /> Enable public AI Assistant</label>
                </section>
                <AssistantConfigurator settings={settings} />
                <div className="sticky bottom-5 z-20 flex justify-end rounded-2xl border border-white/10 bg-[#101010]/90 p-3 backdrop-blur-xl">
                    <button className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-2xl shadow-black/40">Save chat settings</button>
                </div>
            </form>
        </div>
    );
}
