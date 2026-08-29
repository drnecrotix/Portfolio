'use client';

import { useMemo, useState } from 'react';
import {
    assistantTemplateLibrary,
    type AssistantResponseTemplate,
    type AssistantSettings,
} from '@/lib/assistant-settings';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-6';

function nextId() { return `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function clonePreset(template: AssistantResponseTemplate): AssistantResponseTemplate {
    return { ...template, id: nextId(), matchMode: 'exact', triggers: [template.triggers[0] || template.name] };
}

export function AssistantConfigurator({ settings }: { settings: AssistantSettings }) {
    const [templates, setTemplates] = useState<AssistantResponseTemplate[]>(
        settings.responseTemplates.map((template) => ({ ...template, matchMode: 'exact' })),
    );
    const serializedTemplates = useMemo(() => JSON.stringify(templates), [templates]);

    const addReply = () => setTemplates((current) => [...current, {
        id: nextId(),
        name: 'New quick question',
        enabled: true,
        matchMode: 'exact',
        triggers: ['New question'],
        response: 'Add the prepared answer here.',
    }]);

    const addPreset = (preset: AssistantResponseTemplate) => setTemplates((current) => {
        const question = preset.triggers[0] || preset.name;
        if (current.some((item) => item.triggers[0]?.toLowerCase() === question.toLowerCase())) return current;
        return [...current, clonePreset(preset)];
    });

    const addAllPresets = () => setTemplates((current) => {
        const existing = new Set(current.map((item) => item.triggers[0]?.toLowerCase()).filter(Boolean));
        const missing = assistantTemplateLibrary
            .filter((preset) => !existing.has((preset.triggers[0] || preset.name).toLowerCase()))
            .map(clonePreset);
        return [...current, ...missing];
    });

    return (
        <>
            <input type="hidden" name="responseTemplates" value={serializedTemplates} readOnly />

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Chat identity</p>
                    <h3 className="mt-2 text-xl font-semibold">Public chat appearance</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">Only the settings visitors actually see are kept here. The old provider priorities, custom routing, proactive message and duplicate suggested-question fields are no longer exposed.</p>
                </div>
                <label className="text-sm text-white/60">Assistant name<input name="assistantName" defaultValue={settings.assistantName} className={input} /></label>
                <label className="text-sm text-white/60">Header subtitle<input name="headerSubtitle" defaultValue={settings.headerSubtitle} className={input} /></label>
                <label className="text-sm text-white/60 md:col-span-2">Welcome message<textarea name="welcomeMessage" rows={5} defaultValue={settings.welcomeMessage} className={input} /><span className="mt-1 block text-xs text-white/30">Supports Markdown and {'{{name}}'}.</span></label>
                <label className="text-sm text-white/60 md:col-span-2">Message field placeholder<input name="inputPlaceholder" defaultValue={settings.inputPlaceholder} className={input} /></label>
            </section>

            <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Prepared questions & answers</p>
                        <h3 className="mt-2 text-xl font-semibold">Quick replies shown inside the chat</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">Each active item becomes a button in the public chat. Clicking that question returns the prepared answer immediately and does not spend AI tokens. A question typed outside these quick replies is sent to the selected AI integration.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={addReply} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.05]">+ Question</button>
                        <button type="button" onClick={addAllPresets} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Add presets</button>
                    </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Preset library</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {assistantTemplateLibrary.map((preset) => (
                            <button key={preset.id} type="button" onClick={() => addPreset(preset)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-white/25 hover:text-white">+ {preset.name}</button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {templates.map((template, index) => (
                        <div key={template.id} className="rounded-xl border border-white/10 bg-black/10 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={template.enabled} onChange={(event) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item))} /> Show in chat</label>
                                <button type="button" onClick={() => setTemplates((list) => list.filter((_, i) => i !== index))} className="text-xs text-red-300">Remove</button>
                            </div>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <label className="text-xs text-white/45">Question shown to visitor<input value={template.triggers[0] || ''} onChange={(event) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, name: event.target.value, matchMode: 'exact', triggers: [event.target.value] } : item))} className={input} /></label>
                                <label className="text-xs text-white/45">Internal label<input value={template.name} onChange={(event) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className={input} /></label>
                            </div>
                            <label className="mt-4 block text-xs text-white/45">Prepared answer<textarea rows={5} value={template.response} onChange={(event) => setTemplates((list) => list.map((item, i) => i === index ? { ...item, response: event.target.value } : item))} className={input} /><span className="mt-1 block text-xs text-white/30">Supports Markdown and {'{{name}}'}.</span></label>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/35">No quick replies yet. Add a prepared question and answer or load the preset library.</div>}
                </div>
            </section>

            <section className={panel}>
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">AI fallback</p>
                <h3 className="mt-2 text-xl font-semibold">Free-form questions</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">When the visitor writes a question instead of choosing one of the prepared quick replies, the chat sends it to the provider selected in AI integration above. The AI remains limited to verified portfolio information.</p>
                <label className="mt-5 block text-sm text-white/60">Additional AI instructions <span className="text-white/30">(optional)</span><textarea name="extraInstructions" rows={5} defaultValue={settings.extraInstructions} className={input} placeholder="Example: Keep answers under 4 sentences unless the visitor asks for details." /></label>
            </section>
        </>
    );
}
