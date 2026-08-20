'use client';

import { useMemo, useState } from 'react';
import type { AssistantResponseTemplate, AssistantSettings, CustomAssistantProvider } from '@/lib/assistant-settings';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

function nextId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AssistantConfigurator({ settings }: { settings: AssistantSettings }) {
    const [providers, setProviders] = useState<CustomAssistantProvider[]>(settings.customProviders);
    const [templates, setTemplates] = useState<AssistantResponseTemplate[]>(settings.responseTemplates);

    const serializedProviders = useMemo(() => JSON.stringify(providers), [providers]);
    const serializedTemplates = useMemo(() => JSON.stringify(templates), [templates]);

    const addProvider = () => setProviders((current) => [...current, {
        id: nextId('provider'),
        name: 'Custom AI',
        enabled: true,
        baseUrl: 'https://api.example.com/v1',
        model: '',
        apiKeyEnv: 'CUSTOM_AI_API_KEY',
        priority: 100 + current.length * 10,
        timeoutMs: 20000,
    }]);

    const addTemplate = () => setTemplates((current) => [...current, {
        id: nextId('template'),
        name: 'New response template',
        enabled: true,
        matchMode: 'contains',
        triggers: [],
        response: '',
    }]);

    return (
        <>
            <input type="hidden" name="customProviders" value={serializedProviders} readOnly />
            <input type="hidden" name="responseTemplates" value={serializedTemplates} readOnly />

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Identity & personality</p>
                    <p className="mt-2 text-sm text-white/40">These settings shape how the assistant introduces itself and how every AI provider is prompted.</p>
                </div>
                <label className="text-sm text-white/60">Assistant name<input name="assistantName" defaultValue={settings.assistantName} className={input} /></label>
                <label className="text-sm text-white/60">Role label<input name="roleLabel" defaultValue={settings.roleLabel} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Welcome message<textarea name="welcomeMessage" rows={3} defaultValue={settings.welcomeMessage} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Input placeholder<input name="inputPlaceholder" defaultValue={settings.inputPlaceholder} className={input} /></label>
                <label className="text-sm text-white/60">Personality<textarea name="personality" rows={5} defaultValue={settings.personality} className={input} /></label>
                <label className="text-sm text-white/60">Tone<textarea name="tone" rows={5} defaultValue={settings.tone} className={input} /></label>
                <label className="text-sm text-white/60">Response style<textarea name="responseStyle" rows={5} defaultValue={settings.responseStyle} className={input} /></label>
                <label className="text-sm text-white/60">Language policy<textarea name="languagePolicy" rows={5} defaultValue={settings.languagePolicy} className={input} /></label>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">AI integrations</p>
                        <h3 className="mt-2 text-xl font-semibold">Provider routing</h3>
                        <p className="mt-2 max-w-3xl text-sm text-white/40">Lower priority numbers are tried first. Custom integrations use an OpenAI-compatible chat-completions endpoint. Secrets stay in hosting environment variables and are never stored in the CMS.</p>
                    </div>
                    <button type="button" onClick={addProvider} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.05]">+ Add integration</button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 p-4">
                        <p className="text-sm font-medium">Groq</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                            <label className="text-xs text-white/45">Model<input name="groqModel" defaultValue={settings.groqModel} className={input} /></label>
                            <label className="text-xs text-white/45">Priority<input name="groqPriority" type="number" min="0" max="10000" defaultValue={settings.groqPriority} className={input} /></label>
                        </div>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                        <p className="text-sm font-medium">Gemini</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                            <label className="text-xs text-white/45">Model<input name="geminiModel" defaultValue={settings.geminiModel} className={input} /></label>
                            <label className="text-xs text-white/45">Priority<input name="geminiPriority" type="number" min="0" max="10000" defaultValue={settings.geminiPriority} className={input} /></label>
                        </div>
                    </div>
                </div>

                <div className="mt-5 space-y-4">
                    {providers.map((provider, index) => (
                        <div key={provider.id} className="rounded-xl border border-white/10 bg-black/10 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={provider.enabled} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} /> Enabled</label>
                                <button type="button" onClick={() => setProviders((list) => list.filter((_, i) => i !== index))} className="text-xs text-red-300">Remove</button>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <label className="text-xs text-white/45">Display name<input value={provider.name} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45 lg:col-span-2">API base URL<input value={provider.baseUrl} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, baseUrl: e.target.value } : item))} className={input} placeholder="https://provider.example/v1" /></label>
                                <label className="text-xs text-white/45">Model<input value={provider.model} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, model: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">API key env variable<input value={provider.apiKeyEnv} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, apiKeyEnv: e.target.value.toUpperCase() } : item))} className={input} placeholder="OPENROUTER_API_KEY" /></label>
                                <label className="text-xs text-white/45">Priority<input type="number" value={provider.priority} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, priority: Number(e.target.value) } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Timeout (ms)<input type="number" min="3000" max="60000" value={provider.timeoutMs} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, timeoutMs: Number(e.target.value) } : item))} className={input} /></label>
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No custom providers yet. Groq and Gemini continue to work as built-in integrations.</div>}
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Answer automation</p>
                        <h3 className="mt-2 text-xl font-semibold">Response templates</h3>
                        <p className="mt-2 max-w-3xl text-sm text-white/40">Templates are checked before any AI API call. They are useful for exact portfolio questions, contact details, collaboration requests, availability, FAQs and other answers you want fully controlled.</p>
                    </div>
                    <button type="button" onClick={addTemplate} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.05]">+ Add template</button>
                </div>
                <div className="mt-6 space-y-4">
                    {templates.map((template, index) => (
                        <div key={template.id} className="rounded-xl border border-white/10 p-5">
                            <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                                <label className="text-xs text-white/45">Template name<input value={template.name} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Match mode<select value={template.matchMode} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, matchMode: e.target.value as AssistantResponseTemplate['matchMode'] } : item))} className={input}><option value="contains">Contains phrase</option><option value="exact">Exact question</option><option value="keywords">All keywords</option></select></label>
                                <div className="flex gap-3 pb-3"><label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={template.enabled} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} /> Active</label><button type="button" onClick={() => setTemplates((list) => list.filter((_, i) => i !== index))} className="text-xs text-red-300">Remove</button></div>
                            </div>
                            <label className="mt-4 block text-xs text-white/45">Questions / triggers — one per line<textarea rows={4} value={template.triggers.join('\n')} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, triggers: e.target.value.split('\n') } : item))} className={input} placeholder={'who are you?\nwhat can you do?'} /></label>
                            <label className="mt-4 block text-xs text-white/45">Ready response<textarea rows={5} value={template.response} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, response: e.target.value } : item))} className={input} /></label>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No fixed-answer templates yet. Add one to answer selected questions without spending an AI API request.</div>}
                </div>
            </section>

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Generation & fallback behavior</p></div>
                <label className="text-sm text-white/60">Temperature<input type="number" name="temperature" min="0" max="2" step="0.1" defaultValue={settings.temperature} className={input} /></label>
                <label className="text-sm text-white/60">Maximum output tokens<input type="number" name="maxTokens" min="128" max="4000" step="64" defaultValue={settings.maxTokens} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Additional system instructions<textarea name="extraInstructions" rows={7} defaultValue={settings.extraInstructions} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Unknown-information response<textarea name="unknownAnswer" rows={3} defaultValue={settings.unknownAnswer} className={input} /></label>
                <label className="text-sm text-white/60">Disabled message<input name="disabledMessage" defaultValue={settings.disabledMessage} className={input} /><span className="mt-1 block text-xs text-white/30">Use {'{{name}}'} to insert the assistant name.</span></label>
                <label className="text-sm text-white/60">Unavailable message<input name="unavailableMessage" defaultValue={settings.unavailableMessage} className={input} /><span className="mt-1 block text-xs text-white/30">Example: {'{{name}}'} is temporarily unavailable.</span></label>
                <label className="text-sm text-white/60 md:col-span-2">Request error message<input name="requestErrorMessage" defaultValue={settings.requestErrorMessage} className={input} /></label>
            </section>
        </>
    );
}
