'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Briefcase,
    CheckCircle2,
    ChevronDown,
    GraduationCap,
    HeartHandshake,
    Pencil,
    Plus,
    Route,
    Save,
    Search,
    Settings2,
    Trash2,
} from 'lucide-react';
import type { Education, Experience } from '@/types';
import type { ExperienceContent, ExperienceTabId, PartnerLogo } from '@/lib/experience-content';
import type { ExperienceSaveResult } from '@/app/admin/(protected)/experience/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';

const field = 'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.055]';
const selectField = `${field} [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5';
const toggle = 'flex items-center gap-3 text-sm text-white/70';
const draftKey = 'experience:settings';

type AdminTab = 'general' | 'education' | 'journey' | 'experience' | 'partners';
type ExperienceSaveAction = (formData: FormData) => Promise<ExperienceSaveResult>;
type DraftRestoreDetail = { fields?: Record<string, string[]> };

const tabs: { id: AdminTab; label: string; icon: typeof Settings2 }[] = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'journey', label: 'Journey', icon: Route },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'partners', label: 'Partners & Sponsors', icon: HeartHandshake },
];

function lines(value?: string[]) {
    return value?.join('\n') ?? '';
}

function toLines(value: string) {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function isSvgSource(value: string) {
    return value.trim().split(/[?#]/, 1)[0].toLowerCase().endsWith('.svg');
}

function range(startDate: string, endDate?: string, ongoing?: boolean) {
    const start = startDate || 'No start date';
    return `${start} - ${ongoing ? 'Present' : endDate || 'No end date'}`;
}

function newEducation(): Education {
    return { id: `education-${Date.now()}`, institution: '', degree: '', major: '', startDate: '', isOngoing: false, activities: [], achievements: [] };
}

function newExperience(prefix: string): Experience {
    return {
        id: `${prefix}-${Date.now()}`,
        company: '',
        position: '',
        description: '',
        responsibilities: [],
        skills: [],
        startDate: '',
        isOngoing: false,
        type: 'full-time',
        impact: [],
        keyLearnings: [],
    };
}

function newPartner(): PartnerLogo {
    return { id: `partner-${Date.now()}`, name: '', src: '', href: '', enabled: true };
}

export function ExperienceAdminEditor({ content, pageName, action }: { content: ExperienceContent; pageName: string; action: ExperienceSaveAction }) {
    const [activeTab, setActiveTab] = useState<AdminTab>('general');
    const [query, setQuery] = useState('');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [educationEntries, setEducationEntries] = useState(content.educationEntries);
    const [journeyEntries, setJourneyEntries] = useState(content.journeyEntries);
    const [experienceEntries, setExperienceEntries] = useState(content.experienceEntries);
    const [partnerLogos, setPartnerLogos] = useState(content.partnerLogos);
    const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [noticeVisible, setNoticeVisible] = useState(false);
    const [isPending, startTransition] = useTransition();
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showNotice = (message: string, state: 'saved' | 'error') => {
        setSaveState(state);
        setSaveMessage(message);
        setNoticeVisible(true);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => setNoticeVisible(false), 6500);
    };

    useEffect(() => {
        const onRestore = (event: Event) => {
            const fields = (event as CustomEvent<DraftRestoreDetail>).detail?.fields;
            if (!fields) return;
            try {
                if (fields.educationEntriesJson?.[0]) setEducationEntries(JSON.parse(fields.educationEntriesJson[0]) as Education[]);
                if (fields.journeyEntriesJson?.[0]) setJourneyEntries(JSON.parse(fields.journeyEntriesJson[0]) as Experience[]);
                if (fields.experienceEntriesJson?.[0]) setExperienceEntries(JSON.parse(fields.experienceEntriesJson[0]) as Experience[]);
                if (fields.partnerLogosJson?.[0]) setPartnerLogos(JSON.parse(fields.partnerLogosJson[0]) as PartnerLogo[]);
            } catch {
                showNotice('The local Journey draft could not be restored completely.', 'error');
            }
        };
        window.addEventListener('necrotix:draft-restore', onRestore);
        return () => {
            window.removeEventListener('necrotix:draft-restore', onRestore);
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        };
    }, []);

    const markEditing = () => {
        if (isPending) return;
        setSaveState('idle');
        setSaveMessage('Unsaved changes detected.');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setSaveState('idle');
        setSaveMessage('');
        startTransition(async () => {
            try {
                const result = await action(formData);
                if (!result.ok) {
                    showNotice(result.error, 'error');
                    return;
                }
                markDraftCommitted(draftKey);
                const savedTime = new Date(result.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                showNotice(`Journey settings saved without reloading at ${savedTime}.`, 'saved');
            } catch (error) {
                showNotice(error instanceof Error ? error.message : 'The Journey save request failed. Please retry.', 'error');
            }
        });
    };

    const chooseTab = (tab: AdminTab) => {
        setActiveTab(tab);
        setQuery('');
        setOpenKey(null);
    };

    const updateEducation = (index: number, patch: Partial<Education>) => setEducationEntries((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
    const updateJourney = (index: number, patch: Partial<Experience>) => setJourneyEntries((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
    const updateExperience = (index: number, patch: Partial<Experience>) => setExperienceEntries((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
    const updatePartner = (index: number, patch: Partial<PartnerLogo>) => setPartnerLogos((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));

    const normalizedQuery = query.trim().toLowerCase();
    const visibleEducation = useMemo(() => educationEntries.map((item, index) => ({ item, index })).filter(({ item }) => !normalizedQuery || `${item.degree} ${item.institution} ${item.major}`.toLowerCase().includes(normalizedQuery)), [educationEntries, normalizedQuery]);
    const visibleJourney = useMemo(() => journeyEntries.map((item, index) => ({ item, index })).filter(({ item }) => !normalizedQuery || `${item.position} ${item.company} ${item.location ?? ''} ${item.type}`.toLowerCase().includes(normalizedQuery)), [journeyEntries, normalizedQuery]);
    const visibleExperience = useMemo(() => experienceEntries.map((item, index) => ({ item, index })).filter(({ item }) => !normalizedQuery || `${item.position} ${item.company} ${item.location ?? ''} ${item.type}`.toLowerCase().includes(normalizedQuery)), [experienceEntries, normalizedQuery]);

    return (
        <>
            <form onSubmit={handleSubmit} onInput={markEditing} onChange={markEditing} className="space-y-5">
                <FormDraftGuard draftKey={draftKey} label="Journey settings" />
                <input type="hidden" name="educationEntriesJson" value={JSON.stringify(educationEntries)} readOnly />
                <input type="hidden" name="journeyEntriesJson" value={JSON.stringify(journeyEntries)} readOnly />
                <input type="hidden" name="experienceEntriesJson" value={JSON.stringify(experienceEntries)} readOnly />
                <input type="hidden" name="partnerLogosJson" value={JSON.stringify(partnerLogos)} readOnly />

                <div className="sticky top-3 z-30 rounded-2xl border border-white/10 bg-[#0d0d0f]/95 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button key={tab.id} type="button" onClick={() => chooseTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${active ? 'bg-white text-black' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}>
                                    <Icon className="size-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === 'general' && <GeneralTab content={content} pageName={pageName} />}

                {activeTab === 'education' && (
                    <div className="space-y-4">
                        <ListHeader title="Education records" count={educationEntries.length} query={query} setQuery={setQuery} actionLabel="Add education" onAction={() => { const index = educationEntries.length; setEducationEntries([...educationEntries, newEducation()]); setOpenKey(`education:${index}`); }} />
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
                            {visibleEducation.map(({ item, index }) => (
                                <CompactCard key={item.id || index} open={openKey === `education:${index}`} onToggle={() => setOpenKey(openKey === `education:${index}` ? null : `education:${index}`)} onRemove={() => setEducationEntries((items) => items.filter((_, i) => i !== index))} title={item.degree || `Education ${index + 1}`} subtitle={item.institution || 'No institution'} meta={[item.major || 'No major', range(item.startDate, item.endDate, item.isOngoing)]}>
                                    <EducationFields item={item} index={index} onChange={(patch) => updateEducation(index, patch)} />
                                </CompactCard>
                            ))}
                            {visibleEducation.length === 0 && <EmptyEditorState label={educationEntries.length ? 'No education records match your search.' : 'No education records yet.'} />}
                        </div>
                        <HighlightEditor id="education" content={content} />
                    </div>
                )}

                {activeTab === 'journey' && (
                    <div className="space-y-4">
                        <ListHeader title="Journey timeline" count={journeyEntries.length} query={query} setQuery={setQuery} actionLabel="Add journey entry" onAction={() => { const index = journeyEntries.length; setJourneyEntries([...journeyEntries, newExperience('journey')]); setOpenKey(`journey:${index}`); }} />
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
                            {visibleJourney.map(({ item, index }) => (
                                <CompactCard key={item.id || index} open={openKey === `journey:${index}`} onToggle={() => setOpenKey(openKey === `journey:${index}` ? null : `journey:${index}`)} onRemove={() => setJourneyEntries((items) => items.filter((_, i) => i !== index))} title={item.position || `Journey ${index + 1}`} subtitle={item.company || 'No organization'} badge={item.type.replace('-', ' ')} meta={[range(item.startDate, item.endDate, item.isOngoing), item.location || 'No location']}>
                                    <ExperienceFields item={item} index={index} namespace="journey" onChange={(patch) => updateJourney(index, patch)} />
                                </CompactCard>
                            ))}
                            {visibleJourney.length === 0 && <EmptyEditorState label={journeyEntries.length ? 'No Journey records match your search.' : 'No Journey records yet.'} />}
                        </div>
                        <HighlightEditor id="journey" content={content} />
                    </div>
                )}

                {activeTab === 'experience' && (
                    <div className="space-y-4">
                        <ExperienceCategories content={content} />
                        <ListHeader title="Experience archive" count={experienceEntries.length} query={query} setQuery={setQuery} actionLabel="Add experience" onAction={() => { const index = experienceEntries.length; setExperienceEntries([...experienceEntries, newExperience('prof')]); setOpenKey(`experience:${index}`); }} />
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
                            {visibleExperience.map(({ item, index }) => (
                                <CompactCard key={item.id || index} open={openKey === `experience:${index}`} onToggle={() => setOpenKey(openKey === `experience:${index}` ? null : `experience:${index}`)} onRemove={() => setExperienceEntries((items) => items.filter((_, i) => i !== index))} title={item.position || `Experience ${index + 1}`} subtitle={item.company || 'No organization'} badge={item.type.replace('-', ' ')} meta={[item.id, range(item.startDate, item.endDate, item.isOngoing)]}>
                                    <ExperienceFields item={item} index={index} namespace="experience" onChange={(patch) => updateExperience(index, patch)} />
                                </CompactCard>
                            ))}
                            {visibleExperience.length === 0 && <EmptyEditorState label={experienceEntries.length ? 'No Experience records match your search.' : 'No Experience records yet.'} />}
                        </div>
                        <HighlightEditor id="experience" content={content} />
                    </div>
                )}

                {activeTab === 'partners' && (
                    <div className="space-y-4">
                        <section className={panel}>
                            <Label title="Partners & Sponsors section title"><input name="marqueeTitle" defaultValue={content.marqueeTitle} className={field} /></Label>
                        </section>
                        <ListHeader title="Partner & sponsor logos" count={partnerLogos.length} query="" setQuery={() => undefined} hideSearch actionLabel="Add SVG logo" onAction={() => { const index = partnerLogos.length; setPartnerLogos([...partnerLogos, newPartner()]); setOpenKey(`partner:${index}`); }} />
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
                            {partnerLogos.map((item, index) => (
                                <CompactCard key={item.id || index} open={openKey === `partner:${index}`} onToggle={() => setOpenKey(openKey === `partner:${index}` ? null : `partner:${index}`)} onRemove={() => setPartnerLogos((items) => items.filter((_, i) => i !== index))} title={item.name || `Partner ${index + 1}`} subtitle={item.src || 'No SVG selected'} badge={item.enabled ? 'visible' : 'hidden'} meta={[isSvgSource(item.src) ? 'SVG' : 'Legacy image']} preview={item.src}>
                                    <PartnerFields item={item} index={index} onChange={(patch) => updatePartner(index, patch)} />
                                </CompactCard>
                            ))}
                            {partnerLogos.length === 0 && <EmptyEditorState label="No partner logos yet." />}
                        </div>
                    </div>
                )}

                <div className="sticky bottom-4 z-40 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#101012]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div aria-live="polite" className={`min-h-5 flex-1 text-xs ${saveState === 'error' ? 'text-red-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-white/35'}`}>
                        {isPending ? 'Saving Journey settings without reloading...' : saveMessage || 'Changes are protected locally until you save.'}
                    </div>
                    <motion.button type="submit" disabled={isPending} whileTap={{ scale: 0.97 }} animate={saveState === 'saved' ? { scale: [1, 1.035, 1] } : { scale: 1 }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60">
                        {saveState === 'saved' && !isPending ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
                        {isPending ? 'Saving...' : 'Save Journey settings'}
                    </motion.button>
                </div>
            </form>

            {noticeVisible && (
                <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="fixed bottom-5 left-4 right-4 z-[120] rounded-2xl border border-white/15 bg-[#101012]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[min(92vw,430px)]" role="status" aria-live="polite">
                    <div className="flex items-start gap-3">
                        {saveState === 'error' ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />}
                        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{saveState === 'error' ? 'Journey save failed' : 'Journey saved'}</p><p className="mt-1 text-sm leading-5 text-white/80">{saveMessage}</p></div>
                        <button type="button" onClick={() => setNoticeVisible(false)} className="text-lg leading-none text-white/40 transition hover:text-white" aria-label="Dismiss save notification">x</button>
                    </div>
                </motion.div>
            )}
        </>
    );
}

function GeneralTab({ content, pageName }: { content: ExperienceContent; pageName: string }) {
    return (
        <div className="space-y-4">
            <section className={panel}>
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Page identity</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Label title="Page name"><input name="pageName" defaultValue={pageName} className={field} /></Label>
                    <Label title="Public slug"><div className="mt-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/45">/journey</div></Label>
                </div>
                <p className="mt-3 text-xs text-white/35">Changing the page name updates the Journey label in the admin navigation and matching public navigation item. The public route stays /journey.</p>
            </section>

            <section className={panel}>
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Visibility & behavior</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Toggle name="pageEnabled" checked={content.pageEnabled} label="Enable Journey page" />
                    <Toggle name="showHero" checked={content.showHero} label="Hero" />
                    <Toggle name="showDecorations" checked={content.showDecorations} label="Background decorations" />
                    <Toggle name="showMarquee" checked={content.showMarquee} label="Partners & Sponsors" />
                    <Toggle name="showTabs" checked={content.showTabs} label="Public tab navigation" />
                    <Toggle name="showEducation" checked={content.showEducation} label="Education tab" />
                    <Toggle name="showJourney" checked={content.showJourney} label="Journey tab" />
                    <Toggle name="showExperience" checked={content.showExperience} label="Experience tab" />
                    <Toggle name="showHighlights" checked={content.showHighlights} label="Highlight blocks" />
                    <Toggle name="showSkills" checked={content.showSkills} label="Skills" />
                    <Toggle name="showResponsibilities" checked={content.showResponsibilities} label="Responsibilities" />
                    <Toggle name="showImpact" checked={content.showImpact} label="Impact" />
                    <Toggle name="showKeyLearnings" checked={content.showKeyLearnings} label="Key learnings" />
                </div>
                <label className="mt-5 block text-sm text-white/60">Default public tab<select name="defaultTab" defaultValue={content.defaultTab} className={selectField}><option value="education">Education</option><option value="journey">Journey</option><option value="experience">Experience</option></select></label>
            </section>

            <details className={panel}>
                <summary className="cursor-pointer select-none font-semibold text-white">Hero content</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Label title="Eyebrow"><input name="heroEyebrow" defaultValue={content.heroEyebrow} className={field} /></Label>
                    <Label title="Highlighted words"><input name="heroHighlight" defaultValue={content.heroHighlight} className={field} /></Label>
                    <Label title="Main title" wide><input name="heroTitle" defaultValue={content.heroTitle} className={field} /></Label>
                    <Label title="Description" wide><textarea name="heroDescription" defaultValue={content.heroDescription} rows={3} className={field} /></Label>
                    <Label title="Primary button label"><input name="heroPrimaryLabel" defaultValue={content.heroPrimaryLabel} className={field} /></Label>
                    <Label title="Primary button URL"><input name="heroPrimaryUrl" defaultValue={content.heroPrimaryUrl} className={field} /></Label>
                    <Label title="Secondary button label"><input name="heroSecondaryLabel" defaultValue={content.heroSecondaryLabel} className={field} /></Label>
                    <Label title="Secondary button URL"><input name="heroSecondaryUrl" defaultValue={content.heroSecondaryUrl} className={field} /></Label>
                </div>
            </details>

            <details className={panel}>
                <summary className="cursor-pointer select-none font-semibold text-white">Public tab text</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Label title="Tab intro" wide><input name="tabIntro" defaultValue={content.tabIntro} className={field} /></Label>
                    <Label title="Education label"><input name="educationLabel" defaultValue={content.educationLabel} className={field} /></Label>
                    <Label title="Education description"><textarea name="educationDescription" defaultValue={content.educationDescription} rows={2} className={field} /></Label>
                    <Label title="Journey label"><input name="journeyLabel" defaultValue={content.journeyLabel} className={field} /></Label>
                    <Label title="Journey description"><textarea name="journeyDescription" defaultValue={content.journeyDescription} rows={2} className={field} /></Label>
                    <Label title="Experience label"><input name="experienceLabel" defaultValue={content.experienceLabel} className={field} /></Label>
                    <Label title="Experience description"><textarea name="experienceDescription" defaultValue={content.experienceDescription} rows={2} className={field} /></Label>
                    <Label title="Archive eyebrow"><input name="archiveEyebrow" defaultValue={content.archiveEyebrow} className={field} /></Label>
                    <Label title="Archive title"><input name="archiveTitle" defaultValue={content.archiveTitle} className={field} /></Label>
                    <Label title="Archive description" wide><textarea name="archiveDescription" defaultValue={content.archiveDescription} rows={2} className={field} /></Label>
                    <Label title="Empty state" wide><input name="emptyState" defaultValue={content.emptyState} className={field} /></Label>
                </div>
            </details>
        </div>
    );
}

function ListHeader({ title, count, query, setQuery, actionLabel, onAction, hideSearch = false }: { title: string; count: number; query: string; setQuery: (value: string) => void; actionLabel: string; onAction: () => void; hideSearch?: boolean }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-white">{title}</h3><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">{count}</span></div><p className="mt-1 text-xs text-white/35">Compact list view - open only the record you want to edit.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {!hideSearch && <label className="relative min-w-[220px]"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records..." className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-white/25" /></label>}
                    <button type="button" onClick={onAction} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"><Plus className="size-4" />{actionLabel}</button>
                </div>
            </div>
        </div>
    );
}

function CompactCard({ title, subtitle, meta, badge, preview, open, onToggle, onRemove, children }: { title: string; subtitle: string; meta?: string[]; badge?: string; preview?: string; open: boolean; onToggle: () => void; onRemove: () => void; children: ReactNode }) {
    return (
        <div className="border-b border-white/10 last:border-b-0">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                {preview && <div className="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">{preview.startsWith('/') ? <Image src={preview} alt="" fill unoptimized className="object-contain p-1.5" /> : <span className="text-[8px] font-semibold uppercase text-black/50">Logo</span>}</div>}
                <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
                    <div className="flex min-w-0 flex-wrap items-center gap-2"><h4 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h4>{badge && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">{badge}</span>}</div>
                    <p className="mt-1 truncate text-sm text-white/45">{subtitle}</p>
                    {meta && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30">{meta.filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div>}
                </button>
                <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white"><Pencil className="size-3.5" />{open ? 'Close' : 'Edit'}<ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
                    <button type="button" onClick={onRemove} className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10"><Trash2 className="size-3.5" /><span className="hidden sm:inline">Remove</span></button>
                </div>
            </div>
            {open && <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">{children}</div>}
        </div>
    );
}

function EducationFields({ item, index, onChange }: { item: Education; index: number; onChange: (patch: Partial<Education>) => void }) {
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Record ID"><input name={`education_editor_${index}_id`} value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="Institution"><input name={`education_editor_${index}_institution`} value={item.institution} onChange={(e) => onChange({ institution: e.target.value })} className={field} /></Label><Label title="Degree"><input name={`education_editor_${index}_degree`} value={item.degree} onChange={(e) => onChange({ degree: e.target.value })} className={field} /></Label><Label title="Major"><input name={`education_editor_${index}_major`} value={item.major} onChange={(e) => onChange({ major: e.target.value })} className={field} /></Label><Label title="Start date"><input name={`education_editor_${index}_start`} value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={field} /></Label><Label title="End date"><input name={`education_editor_${index}_end`} value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} className={field} /></Label><Label title="GPA"><input name={`education_editor_${index}_gpa`} value={item.gpa ?? ''} onChange={(e) => onChange({ gpa: e.target.value || undefined })} className={field} /></Label><label className={`${toggle} mt-6`}><input type="checkbox" checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" />Ongoing education</label><Label title="Activities - one per line" wide><textarea value={lines(item.activities)} onChange={(e) => onChange({ activities: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Achievements - one per line" wide><textarea value={lines(item.achievements)} onChange={(e) => onChange({ achievements: toLines(e.target.value) })} rows={3} className={field} /></Label></div>;
}

function ExperienceFields({ item, index, namespace, onChange }: { item: Experience; index: number; namespace: 'journey' | 'experience'; onChange: (patch: Partial<Experience>) => void }) {
    const external = Array.isArray(item.externalLink) ? item.externalLink.join('\n') : item.externalLink ?? '';
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Record ID"><input value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="Type"><select value={item.type} onChange={(e) => onChange({ type: e.target.value as Experience['type'] })} className={selectField}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="freelance">Freelance</option><option value="volunteer">Volunteer</option><option value="apprenticeship">Apprenticeship</option><option value="self-employed">Self-employed</option></select></Label><Label title="Company"><input value={item.company} onChange={(e) => onChange({ company: e.target.value })} className={field} /></Label><Label title="Position"><input value={item.position} onChange={(e) => onChange({ position: e.target.value })} className={field} /></Label><Label title="Location"><input value={item.location ?? ''} onChange={(e) => onChange({ location: e.target.value || undefined })} className={field} /></Label><Label title="Logo path / URL"><input value={item.logo ?? ''} onChange={(e) => onChange({ logo: e.target.value || undefined })} className={field} /></Label><Label title="Start date"><input value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={field} /></Label><Label title="End date"><input value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} className={field} /></Label><Label title="Primary link"><input value={item.link ?? ''} onChange={(e) => onChange({ link: e.target.value || undefined })} className={field} /></Label><Label title="External links"><textarea value={external} onChange={(e) => onChange({ externalLink: toLines(e.target.value) })} rows={2} className={field} /></Label><label className={`${toggle} md:col-span-2`}><input type="checkbox" checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" />Current / ongoing role</label><Label title="Description" wide><textarea value={item.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} className={field} /></Label><Label title="Skills - one per line" wide><textarea value={lines(item.skills)} onChange={(e) => onChange({ skills: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Responsibilities - one per line" wide><textarea value={lines(item.responsibilities)} onChange={(e) => onChange({ responsibilities: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Impact - one per line" wide><textarea value={lines(item.impact)} onChange={(e) => onChange({ impact: toLines(e.target.value) })} rows={3} className={field} /></Label><Label title="Key learnings - one per line" wide><textarea value={lines(item.keyLearnings)} onChange={(e) => onChange({ keyLearnings: toLines(e.target.value) })} rows={3} className={field} /></Label><input type="hidden" name={`${namespace}_editor_${index}`} value={item.id} readOnly /></div>;
}

function PartnerFields({ item, index, onChange }: { item: PartnerLogo; index: number; onChange: (patch: Partial<PartnerLogo>) => void }) {
    const legacy = Boolean(item.src && !isSvgSource(item.src));
    return <div className="grid gap-3 md:grid-cols-2"><Label title="Name"><input value={item.name} onChange={(e) => onChange({ name: e.target.value })} className={field} /></Label><Label title="ID"><input value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label><Label title="SVG path / URL" wide><input value={item.src} onChange={(e) => onChange({ src: e.target.value })} placeholder="/assets/partner-logo.svg" className={`${field} ${legacy ? 'border-amber-400/25' : ''}`} /><span className="mt-2 block text-[11px] text-white/35">New or changed files must end in .svg. Existing legacy images can remain until replaced.</span></Label><Label title="Partner website" wide><input value={item.href ?? ''} onChange={(e) => onChange({ href: e.target.value || undefined })} className={field} /></Label><label className={`${toggle} md:col-span-2`}><input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="size-4" />Show this logo</label><input type="hidden" name={`partner_editor_${index}`} value={item.id} readOnly /></div>;
}

function ExperienceCategories({ content }: { content: ExperienceContent }) {
    return <details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">Experience categories</summary><div className="mt-4 grid gap-3 lg:grid-cols-2">{content.categories.map((category, index) => <div key={category.id} className="rounded-xl border border-white/10 p-3"><Toggle name={`category_${index}_enabled`} checked={category.enabled} label={`Show ${category.label}`} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Label title="Label"><input name={`category_${index}_label`} defaultValue={category.label} className={field} /></Label><Label title="ID prefix"><input name={`category_${index}_prefix`} defaultValue={category.prefix} className={field} /></Label><Label title="Description" wide><textarea name={`category_${index}_description`} defaultValue={category.description} rows={2} className={field} /></Label></div></div>)}</div></details>;
}

function HighlightEditor({ id, content }: { id: ExperienceTabId; content: ExperienceContent }) {
    const item = content.highlights[id];
    const cap = id[0].toUpperCase() + id.slice(1);
    return <details className={panel}><summary className="cursor-pointer select-none font-semibold text-white">{cap} highlight block</summary><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><Toggle name={`${id}HighlightEnabled`} checked={item.enabled} label={`Show ${cap} highlight`} /></div><Label title="Title"><input name={`${id}HighlightTitle`} defaultValue={item.title} className={field} /></Label><Label title="Highlighted text"><input name={`${id}HighlightText`} defaultValue={item.highlight} className={field} /></Label><Label title="Description" wide><textarea name={`${id}HighlightDescription`} defaultValue={item.description} rows={2} className={field} /></Label></div></details>;
}

function EmptyEditorState({ label }: { label: string }) {
    return <div className="px-5 py-12 text-center text-sm text-white/35">{label}</div>;
}

function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) {
    return <label className={toggle}><input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-cyan-400" />{label}</label>;
}

function Label({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
    return <label className={`block text-sm text-white/60 ${wide ? 'md:col-span-2' : ''}`}><span>{title}</span>{children}</label>;
}
