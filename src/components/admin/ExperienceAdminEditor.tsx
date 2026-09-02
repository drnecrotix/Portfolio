'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Briefcase,
    CheckCircle2,
    GraduationCap,
    Handshake,
    Plus,
    Route,
    Save,
    Settings2,
    Trash2,
} from 'lucide-react';
import type { Education, Experience } from '@/types';
import type { ExperienceContent, ExperienceTabId, PartnerLogo } from '@/lib/experience-content';
import type { ExperienceSaveResult } from '@/app/admin/(protected)/experience/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';

const field = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.055]';
const selectField = `${field} [color-scheme:dark] [&>option]:bg-[#151515] [&>option]:text-white`;
const panel = 'rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6';
const toggle = 'flex items-center gap-3 text-sm text-white/70';
const draftKey = 'experience:settings';

type AdminTab = 'general' | 'education' | 'journey' | 'experience' | 'partners';
type ExperienceSaveAction = (formData: FormData) => Promise<ExperienceSaveResult>;

type DraftRestoreDetail = {
    key?: string;
    fields?: Record<string, string[]>;
};

const tabs: { id: AdminTab; label: string; icon: typeof Settings2 }[] = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'journey', label: 'Journey', icon: Route },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'partners', label: 'Partners & Sponsors', icon: Handshake },
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

function newEducation(): Education {
    return {
        id: `education-${Date.now()}`,
        institution: '',
        degree: '',
        major: '',
        startDate: '',
        isOngoing: false,
        activities: [],
        achievements: [],
    };
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
    return {
        id: `partner-${Date.now()}`,
        name: '',
        src: '',
        href: '',
        enabled: true,
    };
}

export function ExperienceAdminEditor({ content, action }: { content: ExperienceContent; action: ExperienceSaveAction }) {
    const [activeTab, setActiveTab] = useState<AdminTab>('general');
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
            const detail = (event as CustomEvent<DraftRestoreDetail>).detail;
            const fields = detail?.fields;
            if (!fields) return;
            try {
                const education = fields.educationEntriesJson?.[0];
                const journey = fields.journeyEntriesJson?.[0];
                const experience = fields.experienceEntriesJson?.[0];
                const partners = fields.partnerLogosJson?.[0];
                if (education) setEducationEntries(JSON.parse(education) as Education[]);
                if (journey) setJourneyEntries(JSON.parse(journey) as Experience[]);
                if (experience) setExperienceEntries(JSON.parse(experience) as Experience[]);
                if (partners) setPartnerLogos(JSON.parse(partners) as PartnerLogo[]);
            } catch {
                showNotice('The local Experience draft could not be restored completely.', 'error');
            }
        };
        window.addEventListener('necrotix:draft-restore', onRestore);
        return () => {
            window.removeEventListener('necrotix:draft-restore', onRestore);
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        };
    }, []);

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
                    if (result.field) {
                        const target = form.elements.namedItem(result.field);
                        if (target instanceof HTMLElement) target.focus();
                    }
                    return;
                }

                markDraftCommitted(draftKey);
                const savedTime = new Date(result.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                showNotice(`Experience settings were saved without reloading at ${savedTime}.`, 'saved');
            } catch (error) {
                showNotice(error instanceof Error ? error.message : 'The Experience save request failed. Please retry.', 'error');
            }
        });
    };

    const updateEducation = (index: number, patch: Partial<Education>) => {
        setEducationEntries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const updateJourney = (index: number, patch: Partial<Experience>) => {
        setJourneyEntries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const updateExperience = (index: number, patch: Partial<Experience>) => {
        setExperienceEntries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    const updatePartner = (index: number, patch: Partial<PartnerLogo>) => {
        setPartnerLogos((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">
                <FormDraftGuard draftKey={draftKey} label="Experience settings" />

                <input type="hidden" name="educationEntriesJson" value={JSON.stringify(educationEntries)} readOnly />
                <input type="hidden" name="journeyEntriesJson" value={JSON.stringify(journeyEntries)} readOnly />
                <input type="hidden" name="experienceEntriesJson" value={JSON.stringify(experienceEntries)} readOnly />
                <input type="hidden" name="partnerLogosJson" value={JSON.stringify(partnerLogos)} readOnly />

                <div className="sticky top-3 z-30 rounded-2xl border border-white/10 bg-[#0d0d0f]/90 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? 'text-black' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'}`}
                                >
                                    {active && <motion.span layoutId="experience-admin-tab" className="absolute inset-0 rounded-xl bg-white" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                                    <Icon className="relative z-10 size-4" />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <motion.div animate={{ opacity: activeTab === 'general' ? 1 : 0 }} className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
                    <GeneralTab content={content} />
                </motion.div>

                <motion.div initial={false} animate={{ opacity: activeTab === 'education' ? 1 : 0, y: activeTab === 'education' ? 0 : 6 }} className={activeTab === 'education' ? 'space-y-6' : 'hidden'}>
                    <SectionHeader title="Education records" description="These records now drive the public Education tab. Add, remove or rewrite them here." actionLabel="Add education" onAction={() => setEducationEntries((items) => [...items, newEducation()])} />
                    <div className="space-y-4">
                        {educationEntries.map((item, index) => (
                            <EducationEditor key={item.id || index} item={item} index={index} onChange={(patch) => updateEducation(index, patch)} onRemove={() => setEducationEntries((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                        ))}
                        {educationEntries.length === 0 && <EmptyEditorState label="No education records. Add one to populate the Education tab." />}
                    </div>
                    <HighlightEditor id="education" content={content} />
                </motion.div>

                <motion.div initial={false} animate={{ opacity: activeTab === 'journey' ? 1 : 0, y: activeTab === 'journey' ? 0 : 6 }} className={activeTab === 'journey' ? 'space-y-6' : 'hidden'}>
                    <SectionHeader title="Journey timeline" description="This dataset is independent from the Experience archive and controls the chronological timeline." actionLabel="Add journey entry" onAction={() => setJourneyEntries((items) => [...items, newExperience('journey')])} />
                    <div className="space-y-4">
                        {journeyEntries.map((item, index) => (
                            <ExperienceEntryEditor key={item.id || index} item={item} index={index} namespace="journey" onChange={(patch) => updateJourney(index, patch)} onRemove={() => setJourneyEntries((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                        ))}
                        {journeyEntries.length === 0 && <EmptyEditorState label="No Journey entries. Add one to build the timeline." />}
                    </div>
                    <HighlightEditor id="journey" content={content} />
                </motion.div>

                <motion.div initial={false} animate={{ opacity: activeTab === 'experience' ? 1 : 0, y: activeTab === 'experience' ? 0 : 6 }} className={activeTab === 'experience' ? 'space-y-6' : 'hidden'}>
                    <ExperienceCategories content={content} />
                    <SectionHeader title="Experience archive records" description="These entries power the category-filtered Experience archive. Their IDs are matched against the category prefixes above." actionLabel="Add experience" onAction={() => setExperienceEntries((items) => [...items, newExperience('prof')])} />
                    <div className="space-y-4">
                        {experienceEntries.map((item, index) => (
                            <ExperienceEntryEditor key={item.id || index} item={item} index={index} namespace="experience" onChange={(patch) => updateExperience(index, patch)} onRemove={() => setExperienceEntries((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                        ))}
                        {experienceEntries.length === 0 && <EmptyEditorState label="No Experience archive records. Add one to populate the archive." />}
                    </div>
                    <HighlightEditor id="experience" content={content} />
                </motion.div>

                <motion.div initial={false} animate={{ opacity: activeTab === 'partners' ? 1 : 0, y: activeTab === 'partners' ? 0 : 6 }} className={activeTab === 'partners' ? 'space-y-6' : 'hidden'}>
                    <section className={panel}>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/35">Partners & Sponsors presentation</p>
                        <label className="mt-5 block text-sm text-white/60">Section title<input name="marqueeTitle" defaultValue={content.marqueeTitle} className={field} /></label>
                    </section>
                    <SectionHeader title="Partner & sponsor logos" description="New or replaced logo images must be SVG. Existing legacy WebP logos remain supported only until you replace them." actionLabel="Add SVG logo" onAction={() => setPartnerLogos((items) => [...items, newPartner()])} />
                    <div className="space-y-4">
                        {partnerLogos.map((item, index) => (
                            <PartnerEditor key={item.id || index} item={item} index={index} onChange={(patch) => updatePartner(index, patch)} onRemove={() => setPartnerLogos((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                        ))}
                        {partnerLogos.length === 0 && <EmptyEditorState label="No partner logos. Add an SVG logo to start the showcase." />}
                    </div>
                </motion.div>

                <div className="sticky bottom-4 z-40 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#101012]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div aria-live="polite" className={`min-h-5 flex-1 text-xs ${saveState === 'error' ? 'text-red-300' : saveState === 'saved' ? 'text-emerald-300' : 'text-white/35'}`}>
                        {isPending ? 'Saving Experience settings without reloading…' : saveMessage || 'Changes are protected locally until you save.'}
                    </div>
                    <motion.button
                        type="submit"
                        disabled={isPending}
                        whileTap={{ scale: 0.97 }}
                        animate={saveState === 'saved' ? { scale: [1, 1.035, 1] } : { scale: 1 }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
                    >
                        {saveState === 'saved' && !isPending ? <CheckCircle2 className="size-4" /> : <Save className="size-4" />}
                        {isPending ? 'Saving…' : 'Save Experience settings'}
                    </motion.button>
                </div>
            </form>

            {noticeVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="fixed bottom-5 left-4 right-4 z-[120] rounded-2xl border border-white/15 bg-[#101012]/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[min(92vw,430px)]"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-3">
                        {saveState === 'error' ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-400" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />}
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{saveState === 'error' ? 'Experience save failed' : 'Experience saved'}</p>
                            <p className="mt-1 text-sm leading-5 text-white/80">{saveMessage}</p>
                        </div>
                        <button type="button" onClick={() => setNoticeVisible(false)} className="text-lg leading-none text-white/40 transition hover:text-white" aria-label="Dismiss save notification">×</button>
                    </div>
                </motion.div>
            )}
        </>
    );
}

function GeneralTab({ content }: { content: ExperienceContent }) {
    return (
        <>
            <section className={panel}>
                <p className="text-xs uppercase tracking-[0.25em] text-white/35">Visibility & behavior</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Toggle name="pageEnabled" checked={content.pageEnabled} label="Enable /experience page content" />
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
                <label className="mt-6 block text-sm text-white/60">Default public tab
                    <select name="defaultTab" defaultValue={content.defaultTab} className={selectField}>
                        <option value="education">Education</option>
                        <option value="journey">Journey</option>
                        <option value="experience">Experience</option>
                    </select>
                </label>
            </section>

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Hero</p></div>
                <Label title="Eyebrow"><input name="heroEyebrow" defaultValue={content.heroEyebrow} className={field} /></Label>
                <Label title="Highlighted words"><input name="heroHighlight" defaultValue={content.heroHighlight} className={field} /></Label>
                <Label title="Main title" wide><input name="heroTitle" defaultValue={content.heroTitle} className={field} /></Label>
                <Label title="Description" wide><textarea name="heroDescription" defaultValue={content.heroDescription} rows={4} className={field} /></Label>
                <Label title="Primary button label"><input name="heroPrimaryLabel" defaultValue={content.heroPrimaryLabel} className={field} /></Label>
                <Label title="Primary button URL"><input name="heroPrimaryUrl" defaultValue={content.heroPrimaryUrl} className={field} /></Label>
                <Label title="Secondary button label"><input name="heroSecondaryLabel" defaultValue={content.heroSecondaryLabel} className={field} /></Label>
                <Label title="Secondary button URL"><input name="heroSecondaryUrl" defaultValue={content.heroSecondaryUrl} className={field} /></Label>
            </section>

            <section className={`${panel} grid gap-5 md:grid-cols-2`}>
                <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">Public tab copy</p></div>
                <Label title="Tab intro" wide><input name="tabIntro" defaultValue={content.tabIntro} className={field} /></Label>
                <Label title="Education label"><input name="educationLabel" defaultValue={content.educationLabel} className={field} /></Label>
                <Label title="Education description"><textarea name="educationDescription" defaultValue={content.educationDescription} rows={2} className={field} /></Label>
                <Label title="Journey label"><input name="journeyLabel" defaultValue={content.journeyLabel} className={field} /></Label>
                <Label title="Journey description"><textarea name="journeyDescription" defaultValue={content.journeyDescription} rows={2} className={field} /></Label>
                <Label title="Experience label"><input name="experienceLabel" defaultValue={content.experienceLabel} className={field} /></Label>
                <Label title="Experience description"><textarea name="experienceDescription" defaultValue={content.experienceDescription} rows={2} className={field} /></Label>
                <Label title="Archive eyebrow"><input name="archiveEyebrow" defaultValue={content.archiveEyebrow} className={field} /></Label>
                <Label title="Archive title"><input name="archiveTitle" defaultValue={content.archiveTitle} className={field} /></Label>
                <Label title="Archive description" wide><textarea name="archiveDescription" defaultValue={content.archiveDescription} rows={3} className={field} /></Label>
                <Label title="Empty state" wide><input name="emptyState" defaultValue={content.emptyState} className={field} /></Label>
            </section>
        </>
    );
}

function EducationEditor({ item, index, onChange, onRemove }: { item: Education; index: number; onChange: (patch: Partial<Education>) => void; onRemove: () => void }) {
    return (
        <motion.section layout className={panel}>
            <EditorHeader title={item.degree || item.institution || `Education ${index + 1}`} subtitle={item.institution} onRemove={onRemove} />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Label title="Record ID"><input name={`education_editor_${index}_id`} value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label>
                <Label title="Institution"><input required name={`education_editor_${index}_institution`} value={item.institution} onChange={(e) => onChange({ institution: e.target.value })} className={field} /></Label>
                <Label title="Degree"><input required name={`education_editor_${index}_degree`} value={item.degree} onChange={(e) => onChange({ degree: e.target.value })} className={field} /></Label>
                <Label title="Major"><input name={`education_editor_${index}_major`} value={item.major} onChange={(e) => onChange({ major: e.target.value })} className={field} /></Label>
                <Label title="Start date"><input name={`education_editor_${index}_start`} value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} placeholder="YYYY-MM-DD" className={field} /></Label>
                <Label title="End date"><input name={`education_editor_${index}_end`} value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} placeholder="YYYY-MM-DD" className={field} /></Label>
                <Label title="GPA"><input name={`education_editor_${index}_gpa`} value={item.gpa ?? ''} onChange={(e) => onChange({ gpa: e.target.value || undefined })} className={field} /></Label>
                <label className={`${toggle} mt-7`}><input type="checkbox" name={`education_editor_${index}_ongoing`} checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" /> Ongoing education</label>
                <Label title="Activities - one per line" wide><textarea name={`education_editor_${index}_activities`} value={lines(item.activities)} onChange={(e) => onChange({ activities: toLines(e.target.value) })} rows={4} className={field} /></Label>
                <Label title="Achievements - one per line" wide><textarea name={`education_editor_${index}_achievements`} value={lines(item.achievements)} onChange={(e) => onChange({ achievements: toLines(e.target.value) })} rows={4} className={field} /></Label>
            </div>
        </motion.section>
    );
}

function ExperienceEntryEditor({ item, index, namespace, onChange, onRemove }: { item: Experience; index: number; namespace: 'journey' | 'experience'; onChange: (patch: Partial<Experience>) => void; onRemove: () => void }) {
    const external = Array.isArray(item.externalLink) ? item.externalLink.join('\n') : item.externalLink ?? '';
    return (
        <motion.section layout className={panel}>
            <EditorHeader title={item.position || item.company || `${namespace === 'journey' ? 'Journey' : 'Experience'} ${index + 1}`} subtitle={item.company} onRemove={onRemove} />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Label title="Record ID"><input name={`${namespace}_editor_${index}_id`} value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label>
                <Label title="Type"><select name={`${namespace}_editor_${index}_type`} value={item.type} onChange={(e) => onChange({ type: e.target.value as Experience['type'] })} className={selectField}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="freelance">Freelance</option><option value="volunteer">Volunteer</option><option value="apprenticeship">Apprenticeship</option><option value="self-employed">Self-employed</option></select></Label>
                <Label title="Company"><input required name={`${namespace}_editor_${index}_company`} value={item.company} onChange={(e) => onChange({ company: e.target.value })} className={field} /></Label>
                <Label title="Position"><input required name={`${namespace}_editor_${index}_position`} value={item.position} onChange={(e) => onChange({ position: e.target.value })} className={field} /></Label>
                <Label title="Location"><input name={`${namespace}_editor_${index}_location`} value={item.location ?? ''} onChange={(e) => onChange({ location: e.target.value || undefined })} className={field} /></Label>
                <Label title="Logo path / URL"><input name={`${namespace}_editor_${index}_logo`} value={item.logo ?? ''} onChange={(e) => onChange({ logo: e.target.value || undefined })} className={field} /></Label>
                <Label title="Start date"><input name={`${namespace}_editor_${index}_start`} value={item.startDate} onChange={(e) => onChange({ startDate: e.target.value })} placeholder="YYYY-MM-DD" className={field} /></Label>
                <Label title="End date"><input name={`${namespace}_editor_${index}_end`} value={item.endDate ?? ''} onChange={(e) => onChange({ endDate: e.target.value || undefined })} placeholder="YYYY-MM-DD" className={field} /></Label>
                <Label title="Primary link"><input name={`${namespace}_editor_${index}_link`} value={item.link ?? ''} onChange={(e) => onChange({ link: e.target.value || undefined })} className={field} /></Label>
                <Label title="External links - one per line"><textarea name={`${namespace}_editor_${index}_external`} value={external} onChange={(e) => onChange({ externalLink: toLines(e.target.value) })} rows={2} className={field} /></Label>
                <label className={`${toggle} md:col-span-2`}><input type="checkbox" name={`${namespace}_editor_${index}_ongoing`} checked={item.isOngoing} onChange={(e) => onChange({ isOngoing: e.target.checked })} className="size-4" /> Current / ongoing role</label>
                <Label title="Description" wide><textarea name={`${namespace}_editor_${index}_description`} value={item.description} onChange={(e) => onChange({ description: e.target.value })} rows={4} className={field} /></Label>
                <Label title="Skills - one per line" wide><textarea name={`${namespace}_editor_${index}_skills`} value={lines(item.skills)} onChange={(e) => onChange({ skills: toLines(e.target.value) })} rows={4} className={field} /></Label>
                <Label title="Responsibilities - one per line" wide><textarea name={`${namespace}_editor_${index}_responsibilities`} value={lines(item.responsibilities)} onChange={(e) => onChange({ responsibilities: toLines(e.target.value) })} rows={5} className={field} /></Label>
                <Label title="Impact - one per line" wide><textarea name={`${namespace}_editor_${index}_impact`} value={lines(item.impact)} onChange={(e) => onChange({ impact: toLines(e.target.value) })} rows={4} className={field} /></Label>
                <Label title="Key learnings - one per line" wide><textarea name={`${namespace}_editor_${index}_learnings`} value={lines(item.keyLearnings)} onChange={(e) => onChange({ keyLearnings: toLines(e.target.value) })} rows={4} className={field} /></Label>
            </div>
        </motion.section>
    );
}

function PartnerEditor({ item, index, onChange, onRemove }: { item: PartnerLogo; index: number; onChange: (patch: Partial<PartnerLogo>) => void; onRemove: () => void }) {
    const legacy = Boolean(item.src && !isSvgSource(item.src));
    return (
        <motion.section layout className={panel}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
                        {item.src.startsWith('/') ? <Image src={item.src} alt="" fill unoptimized className="object-contain p-2" /> : <span className="px-2 text-center text-[9px] font-semibold uppercase tracking-wider text-black/50">Remote SVG</span>}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{item.name || `Partner ${index + 1}`}</p>
                        <p className={`mt-1 text-xs ${legacy ? 'text-amber-300' : 'text-emerald-300'}`}>{legacy ? 'Legacy image - replace with .svg when edited' : 'SVG ready'}</p>
                    </div>
                </div>
                <button type="button" onClick={onRemove} className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10"><Trash2 className="size-3.5" /> Remove</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Label title="Name"><input required name={`partner_editor_${index}_name`} value={item.name} onChange={(e) => onChange({ name: e.target.value })} className={field} /></Label>
                <Label title="ID"><input name={`partner_editor_${index}_id`} value={item.id} onChange={(e) => onChange({ id: e.target.value })} className={field} /></Label>
                <Label title="SVG path / URL" wide><input required name={`partner_editor_${index}_src`} value={item.src} onChange={(e) => onChange({ src: e.target.value })} placeholder="/assets/partner-logo.svg" className={`${field} ${legacy ? 'border-amber-400/25' : ''}`} /><span className="mt-2 block text-[11px] text-white/35">New or changed files must end in <strong className="text-white/60">.svg</strong>. Local paths and http/https SVG URLs are accepted.</span></Label>
                <Label title="Partner website" wide><input name={`partner_editor_${index}_href`} value={item.href ?? ''} onChange={(e) => onChange({ href: e.target.value || undefined })} placeholder="https://…" className={field} /></Label>
                <label className={`${toggle} md:col-span-2`}><input type="checkbox" name={`partner_editor_${index}_enabled`} checked={item.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="size-4" /> Show this logo</label>
            </div>
        </motion.section>
    );
}

function ExperienceCategories({ content }: { content: ExperienceContent }) {
    return (
        <section className={panel}>
            <p className="text-xs uppercase tracking-[0.25em] text-white/35">Experience categories</p>
            <p className="mt-2 text-sm text-white/40">An archive record is included when its Record ID starts with the configured prefix.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {content.categories.map((category, index) => (
                    <div key={category.id} className="rounded-xl border border-white/10 p-4">
                        <Toggle name={`category_${index}_enabled`} checked={category.enabled} label={`Show ${category.label}`} />
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Label title="Label"><input name={`category_${index}_label`} defaultValue={category.label} className={field} /></Label>
                            <Label title="ID prefix"><input name={`category_${index}_prefix`} defaultValue={category.prefix} className={field} /></Label>
                            <Label title="Description" wide><textarea name={`category_${index}_description`} defaultValue={category.description} rows={2} className={field} /></Label>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function HighlightEditor({ id, content }: { id: ExperienceTabId; content: ExperienceContent }) {
    const item = content.highlights[id];
    const cap = id[0].toUpperCase() + id.slice(1);
    return (
        <section className={`${panel} grid gap-4 md:grid-cols-2`}>
            <div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.25em] text-white/35">{cap} highlight block</p></div>
            <div className="md:col-span-2"><Toggle name={`${id}HighlightEnabled`} checked={item.enabled} label={`Show ${cap} highlight`} /></div>
            <Label title="Title"><input name={`${id}HighlightTitle`} defaultValue={item.title} className={field} /></Label>
            <Label title="Highlighted text"><input name={`${id}HighlightText`} defaultValue={item.highlight} className={field} /></Label>
            <Label title="Description" wide><textarea name={`${id}HighlightDescription`} defaultValue={item.description} rows={3} className={field} /></Label>
        </section>
    );
}

function SectionHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-400/[0.06] to-violet-400/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-white/40">{description}</p></div>
            <button type="button" onClick={onAction} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"><Plus className="size-4" />{actionLabel}</button>
        </div>
    );
}

function EditorHeader({ title, subtitle, onRemove }: { title: string; subtitle?: string; onRemove: () => void }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><h4 className="truncate text-lg font-semibold text-white">{title}</h4>{subtitle && <p className="mt-1 truncate text-xs text-white/35">{subtitle}</p>}</div>
            <button type="button" onClick={onRemove} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-400/10"><Trash2 className="size-3.5" />Remove</button>
        </div>
    );
}

function EmptyEditorState({ label }: { label: string }) {
    return <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">{label}</div>;
}

function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) {
    return <label className={toggle}><input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-cyan-400" />{label}</label>;
}

function Label({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
    return <label className={`block text-sm text-white/60 ${wide ? 'md:col-span-2' : ''}`}><span>{title}</span>{children}</label>;
}
