'use client';

import { useMemo, useState } from 'react';
import {
    assistantTemplateLibrary,
    type AssistantResponseTemplate,
    type AssistantSettings,
    type CustomAssistantProvider,
} from '@/lib/assistant-settings';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

function nextId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function clonePreset(template: AssistantResponseTemplate): AssistantResponseTemplate { return { ...template, id: nextId('template'), triggers: [...template.triggers] }; }

export function AssistantConfigurator({ settings }: { settings: AssistantSettings }) {
    const [providers, setProviders] = useState<CustomAssistantProvider[]>(settings.customProviders);
    const [templates, setTemplates] = useState<AssistantResponseTemplate[]>(settings.responseTemplates);
    const serializedProviders = useMemo(() => JSON.stringify(providers), [providers]);
    const serializedTemplates = useMemo(() => JSON.stringify(templates), [templates]);

    const addProvider = () => setProviders((current) => [...current, {
        id: nextId('provider'), name: 'Custom AI', enabled: true, baseUrl: 'https://api.example.com/v1', model: '',
        apiKeyEnv: 'CUSTOM_AI_API_KEY', priority: 100 + current.length * 10, timeoutMs: 20000,
    }]);
    const addTemplate = () => setTemplates((current) => [...current, { id: nextId('template'), name: 'New response template', enabled: true, matchMode: 'contains', triggers: [], response: '' }]);
    const addPreset = (preset: AssistantResponseTemplate) => setTemplates((current) => [...current, clonePreset(preset)]);
    const addAllPresets = () => setTemplates((current) => {
        const existingNames = new Set(current.map((item) => item.name));
        return [...current, ...assistantTemplateLibrary.filter((preset) => !existingNames.has(preset.name)).map(clonePreset)];
    });

    return (
        <>
            <input type="hidden" name="customProviders" value={serializedProviders} readOnly />
            <input type="hidden" name="responseTemplates" value={serializedTemplates} readOnly />

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Identity & chat window</p>
                    <h3 className="mt-2 text-xl font-semibold">Make the assistant feel like part of the portfolio</h3>
                    <p className="mt-2 text-sm text-white/40">These values control the visible chat header, first message, composer and suggested questions — not only the hidden system prompt.</p>
                </div>
                <label className="text-sm text-white/60">Assistant name<input name="assistantName" defaultValue={settings.assistantName} className={input} /></label>
                <label className="text-sm text-white/60">Role label<input name="roleLabel" defaultValue={settings.roleLabel} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Header subtitle<input name="headerSubtitle" defaultValue={settings.headerSubtitle} className={input} placeholder="Ask me about this portfolio" /></label>
                <label className="text-sm text-white/60 md:col-span-2">Welcome message<textarea name="welcomeMessage" rows={6} defaultValue={settings.welcomeMessage} className={input} /><span className="mt-1 block text-xs text-white/30">Supports Markdown, {'{{name}}'} and {'{{role}}'}.</span></label>
                <label className="text-sm text-white/60">Input placeholder<input name="inputPlaceholder" defaultValue={settings.inputPlaceholder} className={input} /></label>
                <label className="text-sm text-white/60">Input hint<input name="inputHint" defaultValue={settings.inputHint} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Suggested questions — one per line<textarea name="suggestedQuestions" rows={5} defaultValue={settings.suggestedQuestions.join('\n')} className={input} /></label>
                <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/10 p-5">
                    <label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" name="proactiveEnabled" defaultChecked={settings.proactiveEnabled} /> Enable proactive follow-up message</label>
                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
                        <label className="text-xs text-white/45">Message<textarea name="proactiveMessage" rows={4} defaultValue={settings.proactiveMessage} className={input} /></label>
                        <label className="text-xs text-white/45">Delay in seconds<input name="proactiveDelaySeconds" type="number" min="5" max="300" defaultValue={settings.proactiveDelaySeconds} className={input} /></label>
                    </div>
                    <p className="mt-3 text-xs text-white/30">Shown only if the visitor has opened the chat and has not sent a message yet.</p>
                </div>
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
                        <p className="mt-2 max-w-3xl text-sm text-white/40">OpenAI GPT, Groq, Gemini and custom OpenAI-compatible providers are tried by priority. Secrets stay in hosting environment variables.</p>
                    </div>
                    <button type="button" onClick={addProvider} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.05]">+ Add integration</button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">OpenAI / GPT</p><span className="text-[10px] uppercase tracking-wider text-white/30">OPENAI_API_KEY</span></div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]"><label className="text-xs text-white/45">Model<input name="openaiModel" defaultValue={settings.openaiModel} className={input} /></label><label className="text-xs text-white/45">Priority<input name="openaiPriority" type="number" min="0" max="10000" defaultValue={settings.openaiPriority} className={input} /></label></div>
                        <p className="mt-3 text-[11px] leading-5 text-white/30">Uses the official OpenAI Chat Completions API. Add the secret as OPENAI_API_KEY in the hosting environment.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4"><p className="text-sm font-medium">Groq</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]"><label className="text-xs text-white/45">Model<input name="groqModel" defaultValue={settings.groqModel} className={input} /></label><label className="text-xs text-white/45">Priority<input name="groqPriority" type="number" min="0" max="10000" defaultValue={settings.groqPriority} className={input} /></label></div></div>
                    <div className="rounded-xl border border-white/10 p-4"><p className="text-sm font-medium">Gemini</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]"><label className="text-xs text-white/45">Model<input name="geminiModel" defaultValue={settings.geminiModel} className={input} /></label><label className="text-xs text-white/45">Priority<input name="geminiPriority" type="number" min="0" max="10000" defaultValue={settings.geminiPriority} className={input} /></label></div></div>
                </div>

                <div className="mt-5 space-y-4">
                    {providers.map((provider, index) => (
                        <div key={provider.id} className="rounded-xl border border-white/10 bg-black/10 p-5">
                            <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={provider.enabled} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} /> Enabled</label><button type="button" onClick={() => setProviders((list) => list.filter((_, i) => i !== index))} className="text-xs text-red-300">Remove</button></div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <label className="text-xs text-white/45">Display name<input value={provider.name} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45 lg:col-span-2">API base URL<input value={provider.baseUrl} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, baseUrl: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Model<input value={provider.model} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, model: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">API key env variable<input value={provider.apiKeyEnv} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, apiKeyEnv: e.target.value.toUpperCase() } : item))} className={input} placeholder="OPENROUTER_API_KEY" /></label>
                                <label className="text-xs text-white/45">Priority<input type="number" value={provider.priority} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, priority: Number(e.target.value) } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Timeout (ms)<input type="number" min="3000" max="60000" value={provider.timeoutMs} onChange={(e) => setProviders((list) => list.map((item, i) => i === index ? { ...item, timeoutMs: Number(e.target.value) } : item))} className={input} /></label>
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No custom providers yet. OpenAI GPT, Groq and Gemini remain available as built-in integrations.</div>}
                </div>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Automatic replies</p>
                        <h3 className="mt-2 text-xl font-semibold">Response templates</h3>
                        <p className="mt-2 max-w-3xl text-sm text-white/40">Templates are matched before any AI API request. They are instant, predictable and cost no provider tokens.</p>
                    </div>
                    <div className="flex gap-2"><button type="button" onClick={addTemplate} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.05]">+ Blank template</button><button type="button" onClick={addAllPresets} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Add all presets</button></div>
                </div>
                <div className="mt-6 rounded-xl border border-white/10 bg-black/10 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">Preset library</p>
                    <div className="mt-3 flex flex-wrap gap-2">{assistantTemplateLibrary.map((preset) => <button key={preset.id} type="button" onClick={() => addPreset(preset)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-white/25 hover:text-white">+ {preset.name}</button>)}</div>
                </div>
                <div className="mt-6 space-y-4">
                    {templates.map((template, index) => (
                        <div key={template.id} className="rounded-xl border border-white/10 p-5">
                            <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                                <label className="text-xs text-white/45">Template name<input value={template.name} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Match mode<select value={template.matchMode} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, matchMode: e.target.value as AssistantResponseTemplate['matchMode'] } : item))} className={input}><option value="contains">Contains phrase</option><option value="exact">Exact question</option><option value="keywords">All keywords</option></select></label>
                                <div className="flex gap-3 pb-3"><label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={template.enabled} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} /> Active</label><button type="button" onClick={() => setTemplates((list) => list.filter((_, i) => i !== index))} className="text-xs text-red-300">Remove</button></div>
                            </div>
                            <label className="mt-4 block text-xs text-white/45">Questions / triggers — one per line<textarea rows={4} value={template.triggers.join('\n')} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, triggers: e.target.value.split('\n') } : item))} className={input} /></label>
                            <label className="mt-4 block text-xs text-white/45">Ready response<textarea rows={5} value={template.response} onChange={(e) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, response: e.target.value } : item))} className={input} /><span className="mt-1 block text-xs text-white/30">Supports Markdown, {'{{name}}'} and {'{{role}}'}.</span></label>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No automatic replies yet. Use a preset or create your own. New templates can be added at any time.</div>}
                </div>
            </section>

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Generation & fallback behavior</p></div>
                <label className="text-sm text-white/60">Temperature<input type="number" name="temperature" min="0" max="2" step="0.1" defaultValue={settings.temperature} className={input} /></label>
                <label className="text-sm text-white/60">Maximum output tokens<input type="number" name="maxTokens" min="128" max="4000" step="64" defaultValue={settings.maxTokens} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Additional system instructions<textarea name="extraInstructions" rows={7} defaultValue={settings.extraInstructions} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Unknown-information response<textarea name="unknownAnswer" rows={3} defaultValue={settings.unknownAnswer} className={input} /></label>
                <label className="text-sm text-white/60">Disabled message<input name="disabledMessage" defaultValue={settings.disabledMessage} className={input} /></label>
                <label className="text-sm text-white/60">Unavailable message<input name="unavailableMessage" defaultValue={settings.unavailableMessage} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Request error message<input name="requestErrorMessage" defaultValue={settings.requestErrorMessage} className={input} /></label>
            </section>
        </>
    );
}
