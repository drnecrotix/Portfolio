'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Archive, Briefcase, CheckCircle2, ChevronDown, Eye, EyeOff, GraduationCap, GripVertical, HeartHandshake, Pencil, Plus, Route, Save, Search, Settings2, Trash2 } from 'lucide-react';
import type { Education, Experience } from '@/types';
import type { ExperienceContent, ExperienceTabId, PartnerLogo } from '@/lib/experience-content';
import type { JourneyEntryList, JourneyEntryState } from '@/lib/journey-entry-state';
import type { ExperienceSaveResult } from '@/app/admin/(protected)/experience/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';
import { MediaPicker } from '@/components/admin/MediaPicker';

const field = 'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.055]';
const selectField = `${field} [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5';
const toggle = 'flex items-center gap-3 text-sm text-white/70';
const draftKey = 'experience:settings';

type AdminTab = 'general' | 'education' | 'journey' | 'experience' | 'partners';
type EditableList = JourneyEntryList | 'partners';
type SaveAction = (formData: FormData) => Promise<ExperienceSaveResult>;
type Selection = Record<EditableList, string[]>;
type DragState = { list: EditableList; index: number } | null;
type DraftDetail = { fields?: Record<string, string[]> };

const tabs: { id: AdminTab; label: string; icon: typeof Settings2 }[] = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'journey', label: 'Journey', icon: Route },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'partners', label: 'Partners & Sponsors', icon: HeartHandshake },
];

const text = (value?: string[]) => value?.join('\n') ?? '';
const toLines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const period = (start: string, end?: string, ongoing?: boolean) => `${start || 'No start date'} - ${ongoing ? 'Present' : end || 'No end date'}`;
const isSvg = (value: string) => value.trim().split(/[?#]/, 1)[0].toLowerCase().endsWith('.svg');

function moveItem<T>(items: T[], from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

function newEducation(): Education {
    return { id: `education-${Date.now()}`, institution: '', degree: '', major: '', startDate: '', isOngoing: false, activities: [], achievements: [] };
}

function newExperience(prefix: string): Experience {
    return { id: `${prefix}-${Date.now()}`, company: '', position: '', description: '', responsibilities: [], skills: [], startDate: '', isOngoing: false, type: 'full-time', impact: [], keyLearnings: [] };
}

function newPartner(): PartnerLogo {
    return { id: `partner-${Date.now()}`, name: '', src: '', href: '', enabled: true };
}

export function JourneyAdminEditor({ content, pageName, initialStates, action }: { content: ExperienceContent; pageName: string; initialStates: JourneyEntryState; action: SaveAction }) {
    const [activeTab, setActiveTab] = useState<AdminTab>('general');
    const [query, setQuery] = useState('');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [education, setEducation] = useState(content.educationEntries);
    const [journey, setJourney] = useState(content.journeyEntries);
    const [experience, setExperience] = useState(content.experienceEntries);
    const [partners, setPartners] = useState(content.partnerLogos);
    const [states, setStates] = useState<JourneyEntryState>(initialStates);
    const [selection, setSelection] = useState<Selection>({ education: [], journey: [], experience: [], partners: [] });
    const [drag, setDrag] = useState<DragState>(null);
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [noticeVisible, setNoticeVisible] = useState(false);
    const [isPending, startTransition] = useTransition();
    const formRef = useRef<HTMLFormElement>(null);
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const markEditing = () => {
        if (isPending) return;
        setSaveState('idle');
        setSaveMessage('Unsaved changes detected.');
    };

    const touch = () => {
        markEditing();
        requestAnimationFrame(() => formRef.current?.dispatchEvent(new Event('input', { bubbles: true })));
    };

    const notice = (message: string, state: 'saved' | 'error') => {
        setSaveState(state);
        setSaveMessage(message);
        setNoticeVisible(true);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNoticeVisible(false), 6500);
    };

    useEffect(() => {
        const restore = (event: Event) => {
            const fields = (event as CustomEvent<DraftDetail>).detail?.fields;
            if (!fields) return;
            try {
                if (fields.educationEntriesJson?.[0]) setEducation(JSON.parse(fields.educationEntriesJson[0]) as Education[]);
                if (fields.journeyEntriesJson?.[0]) setJourney(JSON.parse(fields.journeyEntriesJson[0]) as Experience[]);
                if (fields.experienceEntriesJson?.[0]) setExperience(JSON.parse(fields.experienceEntriesJson[0]) as Experience[]);
                if (fields.partnerLogosJson?.[0]) setPartners(JSON.parse(fields.partnerLogosJson[0]) as PartnerLogo[]);
                if (fields.entryStatesJson?.[0]) setStates(JSON.parse(fields.entryStatesJson[0]) as JourneyEntryState);
            } catch {
                notice('The local Journey draft could not be restored completely.', 'error');
            }
        };
        window.addEventListener('necrotix:draft-restore', restore);
        return () => {
            window.removeEventListener('necrotix:draft-restore', restore);
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
        };
    }, []);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaveState('idle');
        setSaveMessage('');
        startTransition(async () => {
            try {
                const result = await action(data);
                if (!result.ok) return notice(result.error, 'error');
                markDraftCommitted(draftKey);
                const time = new Date(result.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                notice(`Journey settings saved without reloading at ${time}.`, 'saved');
            } catch (error) {
                notice(error instanceof Error ? error.message : 'The Journey save request failed. Please retry.', 'error');
            }
        });
    };

    const chooseTab = (tab: AdminTab) => {
        setActiveTab(tab);
        setQuery('');
        setOpenKey(null);
        setDrag(null);
    };

    const renameState = (list: JourneyEntryList, oldId: string, nextId?: string) => {
        if (!nextId || !oldId || oldId === nextId) return;
        setStates((current) => {
            const listState = { ...current[list] };
            const saved = listState[oldId];
            delete listState[oldId];
            if (saved) listState[nextId] = saved;
            return { ...current, [list]: listState };
        });
        setSelection((current) => ({ ...current, [list]: current[list].map((id) => id === oldId ? nextId : id) }));
    };

    const updateEducation = (index: number, patch: Partial<Education>) => {
        renameState('education', education[index]?.id ?? '', patch.id);
        setEducation((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
        touch();
    };
    const updateJourney = (index: number, patch: Partial<Experience>) => {
        renameState('journey', journey[index]?.id ?? '', patch.id);
        setJourney((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
        touch();
    };
    const updateExperience = (index: number, patch: Partial<Experience>) => {
        renameState('experience', experience[index]?.id ?? '', patch.id);
        setExperience((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
        touch();
    };
    const updatePartner = (index: number, patch: Partial<PartnerLogo>) => {
        setPartners((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
        touch();
    };

    const q = query.trim().toLowerCase();
    const visibleEducation = useMemo(() => education.map((item, index) => ({ item, index })).filter(({ item }) => !q || `${item.degree} ${item.institution} ${item.major}`.toLowerCase().includes(q)), [education, q]);
    const visibleJourney = useMemo(() => journey.map((item, index) => ({ item, index })).filter(({ item }) => !q || `${item.position} ${item.company} ${item.location ?? ''} ${item.type}`.toLowerCase().includes(q)), [journey, q]);
    const visibleExperience = useMemo(() => experience.map((item, index) => ({ item, index })).filter(({ item }) => !q || `${item.position} ${item.company} ${item.location ?? ''} ${item.type}`.toLowerCase().includes(q)), [experience, q]);

    const toggleSelected = (list: EditableList, id: string) => setSelection((current) => ({ ...current, [list]: current[list].includes(id) ? current[list].filter((item) => item !== id) : [...current[list], id] }));
    const selectVisible = (list: EditableList, ids: string[], checked: boolean) => setSelection((current) => {
        const remainder = current[list].filter((id) => !ids.includes(id));
        return { ...current, [list]: checked ? [...remainder, ...ids] : remainder };
    });
    const clearSelection = (list: EditableList) => setSelection((current) => ({ ...current, [list]: [] }));

    const bulkState = (list: JourneyEntryList, patch: { hidden?: boolean; archived?: boolean }) => {
        if (!selection[list].length) return;
        setStates((current) => {
            const listState = { ...current[list] };
            for (const id of selection[list]) listState[id] = { ...(listState[id] ?? { hidden: false, archived: false }), ...patch };
            return { ...current, [list]: listState };
        });
        touch();
    };

    const deleteSelected = (list: EditableList) => {
        const ids = new Set<string>(selection[list]);
        if (!ids.size || !window.confirm(`Delete ${ids.size} selected record${ids.size === 1 ? '' : 's'}?`)) return;
        if (list === 'education') setEducation((items) => items.filter((item) => !ids.has(item.id)));
        if (list === 'journey') setJourney((items) => items.filter((item) => !ids.has(item.id)));
        if (list === 'experience') setExperience((items) => items.filter((item) => !ids.has(item.id)));
        if (list === 'partners') setPartners((items) => items.filter((item) => !ids.has(item.id)));
        if (list !== 'partners') setStates((current) => {
            const listState = { ...current[list] };
            ids.forEach((id) => delete listState[id]);
            return { ...current, [list]: listState };
        });
        clearSelection(list);
        setOpenKey(null);
        touch();
    };

    const partnerVisibility = (enabled: boolean) => {
        const ids = new Set(selection.partners);
        setPartners((items) => items.map((item) => ids.has(item.id) ? { ...item, enabled } : item));
        touch();
    };

    const moveJourneyToExperience = () => {
        const ids = new Set(selection.journey);
        const moving = journey.filter((item) => ids.has(item.id));
        if (!moving.length) return;
        const existing = new Set(experience.map((item) => item.id));
        const mapped = moving.map((item, index) => {
            const categorized = content.categories.some((category) => item.id.startsWith(category.prefix));
            let id = categorized ? item.id : `prof-${item.id.replace(/^journey-/, '')}`;
            if (!id || existing.has(id)) id = `prof-${Date.now()}-${index}`;
            existing.add(id);
            return { ...item, id };
        });
        setJourney((items) => items.filter((item) => !ids.has(item.id)));
        setExperience((items) => [...items, ...mapped]);
        setStates((current) => {
            const journeyState = { ...current.journey };
            const experienceState = { ...current.experience };
            moving.forEach((item, index) => { const value = journeyState[item.id]; delete journeyState[item.id]; if (value) experienceState[mapped[index].id] = value; });
            return { ...current, journey: journeyState, experience: experienceState };
        });
        clearSelection('journey');
        chooseTab('experience');
        touch();
    };

    const moveExperienceToJourney = () => {
        const ids = new Set(selection.experience);
        const moving = experience.filter((item) => ids.has(item.id));
        if (!moving.length) return;
        const existing = new Set(journey.map((item) => item.id));
        const mapped = moving.map((item, index) => {
            let id = item.id;
            if (existing.has(id)) id = `journey-${Date.now()}-${index}`;
            existing.add(id);
            return { ...item, id };
        });
        setExperience((items) => items.filter((item) => !ids.has(item.id)));
        setJourney((items) => [...items, ...mapped]);
        setStates((current) => {
            const experienceState = { ...current.experience };
            const journeyState = { ...current.journey };
            moving.forEach((item, index) => { const value = experienceState[item.id]; delete experienceState[item.id]; if (value) journeyState[mapped[index].id] = value; });
            return { ...current, experience: experienceState, journey: journeyState };
        });
        clearSelection('experience');
        chooseTab('journey');
        touch();
    };

    const reorder = (list: EditableList, from: number, to: number) => {
        if (q || from === to) return;
        if (list === 'education') setEducation((items) => moveItem(items, from, to));
        if (list === 'journey') setJourney((items) => moveItem(items, from, to));
        if (list === 'experience') setExperience((items) => moveItem(items, from, to));
        if (list === 'partners') setPartners((items) => moveItem(items, from, to));
        setDrag(null);
        touch();
    };
    const dragStart = (event: DragEvent<HTMLElement>, list: EditableList, index: number) => {
        if (q) return event.preventDefault();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${list}:${index}`);
        setDrag({ list, index });
    };
    const drop = (event: DragEvent<HTMLElement>, list: EditableList, index: number) => {
        event.preventDefault();
        if (drag?.list === list) reorder(list, drag.index, index);
    };

    const flags = (list: JourneyEntryList, id: string) => {
        const value = states[list][id];
        return [value?.archived ? 'archived' : '', value?.hidden ? 'hidden' : ''].filter(Boolean);
    };

    return (
        <>
            <form ref={formRef} onSubmit={submit} onInput={markEditing} onChange={markEditing} className="space-y-5">
                <FormDraftGuard draftKey={draftKey} label="Journey settings" />
                <input type="hidden" name="educationEntriesJson" value={JSON.stringify(education)} readOnly />
                <input type="hidden" name="journeyEntriesJson" value={JSON.stringify(journey)} readOnly />
                <input type="hidden" name="experienceEntriesJson" value={JSON.stringify(experience)} readOnly />
                <input type="hidden" name="partnerLogosJson" value={JSON.stringify(partners)} readOnly />
                <input type="hidden" name="entryStatesJson" value={JSON.stringify(states)} readOnly />

                <div className="sticky top-3 z-30 rounded-2xl border border-white/10 bg-[#0d0d0f]/95 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-1 overflow-x-auto">{tabs.map((tab) => { const Icon = tab.icon; const active = tab.id === activeTab; return <button key={tab.id} type="button" onClick={() => chooseTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-white text-black' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}><Icon className="size-4" />{tab.label}</button>; })}</div>
                </div>

                {activeTab === 'general' && <GeneralTab content={content} pageName={pageName} />}
                {activeTab === 'education' && <ListSection title="Education records" count={education.length} query={query} setQuery={setQuery} addLabel="Add education" onAdd={() => { const item = newEducation(); setEducation((items) => [...items, item]); setOpenKey(`education:${item.id}`); touch(); }} toolbar={<BulkToolbar list="education" selected={selection.education} visible={visibleEducation.map(({ item }) => item.id)} onSelect={(checked) => selectVisible('education', visibleEducation.map(({ item }) => item.id), checked)} onClear={() => clearSelection('education')} onShow={() => bulkState('education', { hidden: false })} onHide={() => bulkState('education', { hidden: true })} onArchive={() => bulkState('education', { archived: true })} onRestore={() => bulkState('education', { archived: false })} onDelete={() => deleteSelected('education')} />}>
                    {visibleEducation.map(({ item, index }) => <RecordRow key={item.id || index} title={item.degree || `Education ${index + 1}`} subtitle={item.institution || 'No institution'} meta={[item.major || 'No major', period(item.startDate, item.endDate, item.isOngoing)]} badges={flags('education', item.id)} selected={selection.education.includes(item.id)} onSelect={() => toggleSelected('education', item.id)} open={openKey === `education:${item.id}`} onToggle={() => setOpenKey(openKey === `education:${item.id}` ? null : `education:${item.id}`)} onRemove={() => { setEducation((items) => items.filter((_, i) => i !== index)); touch(); }} dragEnabled={!q} dragging={drag?.list === 'education' && drag.index === index} onDragStart={(event) => dragStart(event, 'education', index)} onDragEnd={() => setDrag(null)} onDrop={(event) => drop(event, 'education', index)}><EducationFields item={item} index={index} onChange={(patch) => updateEducation(index, patch)} /></RecordRow>)}
                    {!visibleEducation.length && <Empty label={education.length ? 'No education records match your search.' : 'No education records yet.'} />}
                    {q && <ReorderHint />}
                    <HighlightEditor id="education" content={content} />
                </ListSection>}

                {activeTab === 'journey' && <ListSection title="Journey timeline" count={journey.length} query={query} setQuery={setQuery} addLabel="Add journey entry" onAdd={() => { const item = newExperience('journey'); setJourney((items) => [...items, item]); setOpenKey(`journey:${item.id}`); touch(); }} toolbar={<BulkToolbar list="journey" selected={selection.journey} visible={visibleJourney.map(({ item }) => item.id)} onSelect={(checked) => selectVisible('journey', visibleJourney.map(({ item }) => item.id), checked)} onClear={() => clearSelection('journey')} onShow={() => bulkState('journey', { hidden: false })} onHide={() => bulkState('journey', { hidden: true })} onArchive={() => bulkState('journey', { archived: true })} onRestore={() => bulkState('journey', { archived: false })} onDelete={() => deleteSelected('journey')} moveLabel="Move to Experience" onMove={moveJourneyToExperience} />}>
                    {visibleJourney.map(({ item, index }) => <RecordRow key={item.id || index} title={item.position || `Journey ${index + 1}`} subtitle={item.company || 'No organization'} meta={[period(item.startDate, item.endDate, item.isOngoing), item.location || 'No location']} badges={[item.type.replace('-', ' '), ...flags('journey', item.id)]} preview={item.logo} selected={selection.journey.includes(item.id)} onSelect={() => toggleSelected('journey', item.id)} open={openKey === `journey:${item.id}`} onToggle={() => setOpenKey(openKey === `journey:${item.id}` ? null : `journey:${item.id}`)} onRemove={() => { setJourney((items) => items.filter((_, i) => i !== index)); touch(); }} dragEnabled={!q} dragging={drag?.list === 'journey' && drag.index === index} onDragStart={(event) => dragStart(event, 'journey', index)} onDragEnd={() => setDrag(null)} onDrop={(event) => drop(event, 'journey', index)}><ExperienceFields item={item} index={index} namespace="journey" onChange={(patch) => updateJourney(index, patch)} /></RecordRow>)}
                    {!visibleJourney.length && <Empty label={journey.length ? 'No Journey records match your search.' : 'No Journey records yet.'} />}
                    {q && <ReorderHint />}
                    <HighlightEditor id="journey" content={content} />
                </ListSection>}

                {activeTab === 'experience' && <div className="space-y-4"><ExperienceCategories content={content} /><ListSection title="Experience archive" count={experience.length} query={query} setQuery={setQuery} addLabel="Add experience" onAdd={() => { const item = newExperience('prof'); setExperience((items) => [...items, item]); setOpenKey(`experience:${item.id}`); touch(); }} toolbar={<BulkToolbar list="experience" selected={selection.experience} visible={visibleExperience.map(({ item }) => item.id)} onSelect={(checked) => selectVisible('experience', visibleExperience.map(({ item }) => item.id), checked)} onClear={() => clearSelection('experience')} onShow={() => bulkState('experience', { hidden: false })} onHide={() => bulkState('experience', { hidden: true })} onArchive={() => bulkState('experience', { archived: true })} onRestore={() => bulkState('experience', { archived: false })} onDelete={() => deleteSelected('experience')} moveLabel="Move to Journey" onMove={moveExperienceToJourney} />}>
                    {visibleExperience.map(({ item, index }) => <RecordRow key={item.id || index} title={item.position || `Experience ${index + 1}`} subtitle={item.company || 'No organization'} meta={[item.id, period(item.startDate, item.endDate, item.isOngoing)]} badges={[item.type.replace('-', ' '), ...flags('experience', item.id)]} preview={item.logo} selected={selection.experience.includes(item.id)} onSelect={() => toggleSelected('experience', item.id)} open={openKey === `experience:${item.id}`} onToggle={() => setOpenKey(openKey === `experience:${item.id}` ? null : `experience:${item.id}`)} onRemove={() => { setExperience((items) => items.filter((_, i) => i !== index)); touch(); }} dragEnabled={!q} dragging={drag?.list === 'experience' && drag.index === index} onDragStart={(event) => dragStart(event, 'experience', index)} onDragEnd={() => setDrag(null)} onDrop={(event) => drop(event, 'experience', index)}><ExperienceFields item={item} index={index} namespace="experience" onChange={(patch) => updateExperience(index, patch)} /></RecordRow>)}
                    {!visibleExperience.length && <Empty label={experience.length ? 'No Experience records match your search.' : 'No Experience records yet.'} />}
                    {q && <ReorderHint />}
                    <HighlightEditor id="experience" content={content} />
                </ListSection></div>}

                {activeTab === 'partners' && <div className="space-y-4"><section className={panel}><Label title="Partners & Sponsors section title"><input name="marqueeTitle" defaultValue={content.marqueeTitle} className={field} /></Label></section><ListSection title="Partner & sponsor logos" count={partners.length} query="" setQuery={() => undefined} hideSearch addLabel="Add SVG logo" onAdd={() => { const item = newPartner(); setPartners((items) => [...items, item]); setOpenKey(`partner:${item.id}`); touch(); }} toolbar={<BulkToolbar list="partners" selected={selection.partners} visible={partners.map((item) => item.id)} onSelect={(checked) => selectVisible('partners', partners.map((item) => item.id), checked)} onClear={() => clearSelection('partners')} onShow={() => partnerVisibility(true)} onHide={() => partnerVisibility(false)} onDelete={() => deleteSelected('partners')} compact />}>
                    {partners.map((item, index) => <RecordRow key={item.id || index} title={item.name || `Partner ${index + 1}`} subtitle={item.src || 'No SVG selected'} meta={[isSvg(item.src) ? 'SVG' : 'Legacy image']} badges={[item.enabled ? 'visible' : 'hidden']} preview={item.src} selected={selection.partners.includes(item.id)} onSelect={() => toggleSelected('partners', item.id)} open={openKey === `partner:${item.id}`} onToggle={() => setOpenKey(openKey === `partner:${item.id}` ? null : `partner:${item.id}`)} onRemove={() => { setPartners((items) => items.filter((_, i) => i !== index)); touch(); }} dragEnabled dragging={drag?.list === 'partners' && drag.index === index} onDragStart={(event) => dragStart(event, 'partners', index)} onDragEnd={() => setDrag(null)} onDrop={(event) => drop(event, 'partners', index)}><PartnerFields item={item} index={index} onChange={(patch) => updatePartner(index, patch)} /></RecordRow>)}
                    {!partners.length && <Empty label="No partner logos yet." />}
                </ListSection></div>}

                <div className="sticky bottom-4 z-40 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#101012]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"><div aria-live="polite" className={`min-h-5 flex-1 text-xs ${saveState === 'error' ? 'text-red-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-white/35'}`}>{isPending ? 'Saving Journey settings without reloading...' : saveMessage || 'Changes are protected locally until you save.'}</div><motion.button type="submit" disabled={isPending} whileTap={{ scale: 0.97 }} animate={saveState === 'saved' ? { scale: [1, 1.035, 1] } : { scale: 1 }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">{saveState === 'saved' && !isPending ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}{isPending ? 'Saving...' : 'Save Journey settings'}</motion.button></div>
            </form>

            {noticeVisible && <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-5 left-4 right-4 z-[120] rounded-2xl border border-white/15 bg-[#101012]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[min(92vw,430px)]" role="status" aria-live="polite"><div className="flex items-start gap-3">{saveState === 'error' ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />}<div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{saveState === 'error' ? 'Journey save failed' : 'Journey saved'}</p><p className="mt-1 text-sm leading-5 text-white/80">{saveMessage}</p></div><button type="button" onClick={() => setNoticeVisible(false)} className="text-lg leading-none text-white/40 transition hover:text-white" aria-label="Dismiss save notification">x</button></div></motion.div>}
        </>
    );
}

function GeneralTab({ content, pageName }: { content: ExperienceContent; pageName: string }) {
    const toggles = [
        ['pageEnabled', content.pageEnabled, 'Enable Journey page'], ['showHero', content.showHero, 'Hero'], ['showDecorations', content.showDecorations, 'Background decorations'], ['showMarquee', content.showMarquee, 'Partners & Sponsors'], ['showTabs', content.showTabs, 'Public tab navigation'], ['showEducation', content.showEducation, 'Education tab'], ['showJourney', content.showJourney, 'Journey tab'], ['showExperience', content.showExperience, 'Experience tab'], ['showHighlights', content.showHighlights, 'Highlight blocks'], ['showSkills', content.showSkills, 'Skills'], ['showResponsibilities', content.showResponsibilities, 'Responsibilities'], ['showImpact', content.showImpact, 'Impact'], ['showKeyLearnings', content.showKeyLearnings, 'Key learnings'],
    ] as const;
    return <div className="space-y-4"><section className={panel}><p className="text-xs uppercase tracking-[0.25em] text-white/35">Page identity</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Label title="Page name"><input name="pageName" defaultValue={pageName} className={field} /></Label><Label title="Public slug"><div className="mt-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/45">/journey</div></Label></div></section><section className={panel}><p className="text-xs uppercase tracking-[0.25em] text-white/35">Visibility & behavior</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{toggles.map(([name, checked, label]) => <Toggle key={name} name={name} checked={checked} label={label} />)}</div><label className="mt-5 block text-sm text-white/60">Default public tab<select name="defaultTab" defaultValue={content.defaultTab} className={selectField}><option value="education">Education</option><option value="journey">Journey</option><option value="experience">Experience</option></select></label></section><details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">Hero content</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><Label title="Eyebrow"><input name="heroEyebrow" defaultValue={content.heroEyebrow} className={field} /></Label><Label title="Highlighted words"><input name="heroHighlight" defaultValue={content.heroHighlight} className={field} /></Label><Label title="Main title" wide><input name="heroTitle" defaultValue={content.heroTitle} className={field} /></Label><Label title="Description" wide><textarea name="heroDescription" defaultValue={content.heroDescription} rows={3} className={field} /></Label><Label title="Primary button label"><input name="heroPrimaryLabel" defaultValue={content.heroPrimaryLabel} className={field} /></Label><Label title="Primary button URL"><input name="heroPrimaryUrl" defaultValue={content.heroPrimaryUrl} className={field} /></Label><Label title="Secondary button label"><input name="heroSecondaryLabel" defaultValue={content.heroSecondaryLabel} className={field} /></Label><Label title="Secondary button URL"><input name="heroSecondaryUrl" defaultValue={content.heroSecondaryUrl} className={field} /></Label></div></details><details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">Public tab text</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><Label title="Tab intro" wide><input name="tabIntro" defaultValue={content.tabIntro} className={field} /></Label><Label title="Education label"><input name="educationLabel" defaultValue={content.educationLabel} className={field} /></Label><Label title="Education description"><textarea name="educationDescription" defaultValue={content.educationDescription} rows={2} className={field} /></Label><Label title="Journey label"><input name="journeyLabel" defaultValue={content.journeyLabel} className={field} /></Label><Label title="Journey description"><textarea name="journeyDescription" defaultValue={content.journeyDescription} rows={2} className={field} /></Label><Label title="Experience label"><input name="experienceLabel" defaultValue={content.experienceLabel} className={field} /></Label><Label title="Experience description"><textarea name="experienceDescription" defaultValue={content.experienceDescription} rows={2} className={field} /></Label><Label title="Archive eyebrow"><input name="archiveEyebrow" defaultValue={content.archiveEyebrow} className={field} /></Label><Label title="Archive title"><input name="archiveTitle" defaultValue={content.archiveTitle} className={field} /></Label><Label title="Archive description" wide><textarea name="archiveDescription" defaultValue={content.archiveDescription} rows={2} className={field} /></Label><Label title="Empty state" wide><input name="emptyState" defaultValue={content.emptyState} className={field} /></Label></div></details></div>;
}

function ListSection({ title, count, query, setQuery, addLabel, onAdd, hideSearch = false, toolbar, children }: { title: string; count: number; query: string; setQuery: (value: string) => void; addLabel: string; onAdd: () => void; hideSearch?: boolean; toolbar: ReactNode; children: ReactNode }) {
    return <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-white">{title}</h3><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">{count}</span></div><p className="mt-1 text-xs text-white/35">Select records for bulk actions or drag the handle to reorder.</p></div><div className="flex flex-col gap-2 sm:flex-row">{!hideSearch && <label className="relative min-w-[220px]"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-white/25" /></label>}<button type="button" onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"><Plus className="size-4" />{addLabel}</button></div></div></div>{toolbar}<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">{children}</div></div>;
}

function BulkToolbar({ list, selected, visible, onSelect, onClear, onShow, onHide, onArchive, onRestore, onDelete, moveLabel, onMove, compact = false }: { list: EditableList; selected: string[]; visible: string[]; onSelect: (checked: boolean) => void; onClear: () => void; onShow: () => void; onHide: () => void; onArchive?: () => void; onRestore?: () => void; onDelete: () => void; moveLabel?: string; onMove?: () => void; compact?: boolean }) {
    const all = visible.length > 0 && visible.every((id) => selected.includes(id));
    return <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between"><label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={all} onChange={(event) => onSelect(event.target.checked)} className="size-4 accent-cyan-400" />Select all {visible.length ? `(${visible.length})` : ''}</label><div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-white/35">{selected.length ? `${selected.length} selected` : `Select ${list} records for bulk actions`}</span>{selected.length > 0 && <button type="button" onClick={onClear} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55">Clear</button>}<button type="button" disabled={!selected.length} onClick={onShow} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-30"><Eye className="size-3.5" />Show</button><button type="button" disabled={!selected.length} onClick={onHide} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-30"><EyeOff className="size-3.5" />Hide</button>{!compact && onArchive && <button type="button" disabled={!selected.length} onClick={onArchive} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-30"><Archive className="size-3.5" />Archive</button>}{!compact && onRestore && <button type="button" disabled={!selected.length} onClick={onRestore} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-30">Restore</button>}{moveLabel && onMove && <button type="button" disabled={!selected.length} onClick={onMove} className="rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-200 disabled:opacity-30">{moveLabel}</button>}<button type="button" disabled={!selected.length} onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 disabled:opacity-30"><Trash2 className="size-3.5" />Delete</button></div></div>;
}

function RecordRow({ title, subtitle, meta = [], badges = [], preview, selected, onSelect, open, onToggle, onRemove, dragEnabled, dragging, onDragStart, onDragEnd, onDrop, children }: { title: string; subtitle: string; meta?: string[]; badges?: string[]; preview?: string; selected: boolean; onSelect: () => void; open: boolean; onToggle: () => void; onRemove: () => void; dragEnabled: boolean; dragging: boolean; onDragStart: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onDrop: (event: DragEvent<HTMLElement>) => void; children: ReactNode }) {
    return <div onDragOver={(event) => { if (dragEnabled) event.preventDefault(); }} onDrop={onDrop} className={`border-b border-white/10 last:border-b-0 ${dragging ? 'bg-cyan-400/[0.06] opacity-60' : ''}`}><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${title}`} className="size-4 shrink-0 accent-cyan-400" /><span draggable={dragEnabled} onDragStart={onDragStart} onDragEnd={onDragEnd} title={dragEnabled ? 'Drag to reorder' : 'Clear search to reorder'} className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/30 ${dragEnabled ? 'cursor-grab hover:bg-white/[0.05] hover:text-white active:cursor-grabbing' : 'cursor-not-allowed opacity-30'}`}><GripVertical className="size-4" /></span>{preview && <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" /></div>}<button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left"><div className="flex min-w-0 flex-wrap items-center gap-2"><h4 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h4>{badges.filter(Boolean).map((badge) => <span key={badge} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">{badge}</span>)}</div><p className="mt-1 truncate text-sm text-white/45">{subtitle}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">{meta.filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div></button><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={onToggle} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60"><Pencil className="size-3.5" />{open ? 'Close' : 'Edit'}<ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button><button type="button" onClick={onRemove} className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300"><Trash2 className="size-3.5" /><span className="hidden sm:inline">Remove</span></button></div></div>{open && <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">{children}</div>}</div>;
}

function EducationFields({ item, index, onChange }: { item: Education; index: number; onChange: (patch: Partial<Education>) => void }) {
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Record ID"><input name={`education_editor_${index}_id`} value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="Institution"><input value={item.institution} onChange={(e) => onChange({ institution: e.target.value })} className={field} /></Label><Label title="Degree"><input value={item.degree} onChange={(e) => onChange({ degree: e.target.value })} className={field} /></Label><Label title="Major"><input value={item.major} onChange={(e) => onChange({ major: e.target.value })} className={field} /></Label><Label title="Start date"><input value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={field} /></Label><Label title="End date"><input value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} className={field} /></Label><Label title="GPA"><input value={item.gpa ?? ''} onChange={(e) => onChange({ gpa: e.target.value || undefined })} className={field} /></Label><label className={`${toggle} mt-6`}><input type="checkbox" checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" />Ongoing education</label><Label title="Activities - one per line" wide><textarea value={text(item.activities)} onChange={(e) => onChange({ activities: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Achievements - one per line" wide><textarea value={text(item.achievements)} onChange={(e) => onChange({ achievements: toLines(e.target.value) })} rows={3} className={field} /></Label></div>;
}

function ExperienceFields({ item, index, namespace, onChange }: { item: Experience; index: number; namespace: 'journey' | 'experience'; onChange: (patch: Partial<Experience>) => void }) {
    const external = Array.isArray(item.externalLink) ? item.externalLink.join('\n') : item.externalLink ?? '';
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Record ID"><input value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="Type"><select value={item.type} onChange={(e) => onChange({ type: e.target.value as Experience['type'] })} className={selectField}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="freelance">Freelance</option><option value="volunteer">Volunteer</option><option value="apprenticeship">Apprenticeship</option><option value="self-employed">Self-employed</option></select></Label><Label title="Company"><input value={item.company} onChange={(e) => onChange({ company: e.target.value })} className={field} /></Label><Label title="Position"><input value={item.position} onChange={(e) => onChange({ position: e.target.value })} className={field} /></Label><Label title="Location"><input value={item.location ?? ''} onChange={(e) => onChange({ location: e.target.value || undefined })} className={field} /></Label><div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3"><MediaPicker value={item.logo ?? ''} onChange={(url) => onChange({ logo: url || undefined })} label={`${namespace === 'journey' ? 'Journey' : 'Experience'} logo / image`} initialKind="image" lockKind /><p className="mt-2 text-[11px] text-white/30">Choose from Media Library or upload a new image. This media is used on the public page.</p></div><Label title="Start date"><input value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={field} /></Label><Label title="End date"><input value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} className={field} /></Label><Label title="Primary link"><input value={item.link ?? ''} onChange={(e) => onChange({ link: e.target.value || undefined })} className={field} /></Label><Label title="External links"><textarea value={external} onChange={(e) => onChange({ externalLink: toLines(e.target.value) })} rows={2} className={field} /></Label><label className={`${toggle} md:col-span-2`}><input type="checkbox" checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" />Current / ongoing role</label><Label title="Description" wide><textarea value={item.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} className={field} /></Label><Label title="Skills - one per line" wide><textarea value={text(item.skills)} onChange={(e) => onChange({ skills: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Responsibilities - one per line" wide><textarea value={text(item.responsibilities)} onChange={(e) => onChange({ responsibilities: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Impact - one per line" wide><textarea value={text(item.impact)} onChange={(e) => onChange({ impact: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Key learnings - one per line" wide><textarea value={text(item.keyLearnings)} onChange={(e) => onChange({ keyLearnings: toLines(e.target.value) })} rows={3} className={field} /></Label><input type="hidden" name={`${namespace}_editor_${index}`} value={item.id} readOnly /></div>;
}

function PartnerFields({ item, index, onChange }: { item: PartnerLogo; index: number; onChange: (patch: Partial<PartnerLogo>) => void }) {
    const legacy = Boolean(item.src && !isSvg(item.src));
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Name"><input value={item.name} onChange={(e) => onChange({ name: e.target.value })} className={field} /></Label><Label title="ID"><input value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="SVG path / URL" wide><input value={item.src} onChange={(e) => onChange({ src: e.target.value })} placeholder="/assets/partner-logo.svg" className={`${field} ${legacy ? 'border-amber-400/25' : ''}`} /><span className="mt-2 block text-[11px] text-white/35">New or changed files must end in .svg. Existing legacy images can remain until replaced.</span></Label><Label title="Partner website" wide><input value={item.href ?? ''} onChange={(e) => onChange({ href: e.target.value || undefined })} className={field} /></Label><label className={`${toggle} md:col-span-2`}><input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="size-4" />Show this logo</label><input type="hidden" name={`partner_editor_${index}`} value={item.id} readOnly /></div>;
}

function ExperienceCategories({ content }: { content: ExperienceContent }) {
    return <details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">Experience categories</summary><div className="mt-4 grid gap-3 lg:grid-cols-2">{content.categories.map((category, index) => <div key={category.id} className="rounded-xl border border-white/10 p-3"><Toggle name={`category_${index}_enabled`} checked={category.enabled} label={`Show ${category.label}`} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Label title="Label"><input name={`category_${index}_label`} defaultValue={category.label} className={field} /></Label><Label title="ID prefix"><input name={`category_${index}_prefix`} defaultValue={category.prefix} className={field} /></Label><Label title="Description" wide><textarea name={`category_${index}_description`} defaultValue={category.description} rows={2} className={field} /></Label></div></div>)}</div></details>;
}

function HighlightEditor({ id, content }: { id: ExperienceTabId; content: ExperienceContent }) {
    const item = content.highlights[id]; const cap = id[0].toUpperCase() + id.slice(1);
    return <details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">{cap} highlight block</summary><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><Toggle name={`${id}HighlightEnabled`} checked={item.enabled} label={`Show ${cap} highlight`} /></div><Label title="Title"><input name={`${id}HighlightTitle`} defaultValue={item.title} className={field} /></Label><Label title="Highlighted text"><input name={`${id}HighlightText`} defaultValue={item.highlight} className={field} /></Label><Label title="Description" wide><textarea name={`${id}HighlightDescription`} defaultValue={item.description} rows={2} className={field} /></Label></div></details>;
}

function ReorderHint() { return <p className="px-1 text-[11px] text-amber-200/60">Clear the search field to enable drag-and-drop reordering.</p>; }
function Empty({ label }: { label: string }) { return <div className="px-5 py-12 text-center text-sm text-white/35">{label}</div>; }
function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) { return <label className={toggle}><input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-cyan-400" />{label}</label>; }
function Label({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) { return <label className={`block text-sm text-white/60 ${wide ? 'md:col-span-2' : ''}`}><span>{title}</span>{children}</label>; }
