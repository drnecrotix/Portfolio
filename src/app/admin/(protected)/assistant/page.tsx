import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import { StatusToast } from '@/components/admin/StatusToast';
import { updateAssistantSettings } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

export const dynamic = 'force-dynamic';

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [site, params] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { assistantSettings: true } }),
        searchParams,
    ]);
    const settings = normalizeAssistantSettings(site?.assistantSettings);
    const providerStatus = { groq: Boolean(process.env.GROQ_API_KEY), gemini: Boolean(process.env.GEMINI_API_KEY) };

    return (
        <div className="mx-auto max-w-5xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'AI Assistant settings saved.' : undefined)} />
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">AI Assistant</p>
                <h2 className="mt-2 text-4xl font-semibold">Assistant controls</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/45">Tune provider priority, models, response creativity and portfolio-specific instructions without exposing API keys in the CMS.</p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Groq</p><p className="mt-2 text-sm">{providerStatus.groq ? 'Configured' : 'API key missing'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-xs uppercase tracking-[0.2em] text-white/35">Gemini</p><p className="mt-2 text-sm">{providerStatus.gemini ? 'Configured' : 'API key missing'}</p></div>
            </div>

            <form action={updateAssistantSettings} className="space-y-6">
                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:grid-cols-2">
                    <label className="flex items-center gap-3 text-sm text-white/70 md:col-span-2"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4" /> Enable public AI Assistant</label>
                    <label className="text-sm text-white/60 md:col-span-2">Assistant name<input name="assistantName" defaultValue={settings.assistantName} className={input} /></label>
                    <label className="text-sm text-white/60">Provider priority<select name="providerOrder" defaultValue={settings.providerOrder.join(',')} className={input}><option value="groq,gemini">Groq → Gemini</option><option value="gemini,groq">Gemini → Groq</option><option value="groq">Groq only</option><option value="gemini">Gemini only</option></select></label>
                    <label className="text-sm text-white/60">Temperature<input type="number" name="temperature" min="0" max="2" step="0.1" defaultValue={settings.temperature} className={input} /></label>
                    <label className="text-sm text-white/60">Groq model<input name="groqModel" defaultValue={settings.groqModel} className={input} /></label>
                    <label className="text-sm text-white/60">Gemini model<input name="geminiModel" defaultValue={settings.geminiModel} className={input} /></label>
                    <label className="text-sm text-white/60">Maximum output tokens<input type="number" name="maxTokens" min="128" max="4000" step="64" defaultValue={settings.maxTokens} className={input} /></label>
                    <div />
                    <label className="text-sm text-white/60 md:col-span-2">Additional instructions<textarea name="extraInstructions" rows={8} defaultValue={settings.extraInstructions} className={input} placeholder="Example: Prefer short answers; mention open-source projects first; avoid discussing unpublished work." /></label>
                </section>
                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save AI Assistant</button>
            </form>
        </div>
    );
}
