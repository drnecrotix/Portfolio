'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    Award,
    BookOpen,
    Briefcase,
    CalendarDays,
    ChevronDown,
    ExternalLink,
    GraduationCap,
    MapPin,
    Rocket,
    Sparkles,
} from 'lucide-react';
import { portfolioData } from '@/data/portfolio';
import type { Education, Experience } from '@/types';
import type { ExperienceContent, ExperienceTabId } from '@/lib/experience-content';
import { cn, formatDate } from '@/lib/utils';
import ExperienceMarquee from '@/components/sections/ExperienceMarquee';

const icons: Record<ExperienceTabId, typeof GraduationCap> = {
    education: GraduationCap,
    journey: Rocket,
    experience: Briefcase,
};

function enabledTabs(content: ExperienceContent) {
    return [
        content.showEducation ? 'education' : null,
        content.showJourney ? 'journey' : null,
        content.showExperience ? 'experience' : null,
    ].filter(Boolean) as ExperienceTabId[];
}

function linkIsExternal(url: string) {
    return /^https?:\/\//i.test(url);
}

export function ExperiencePageClient({ content }: { content: ExperienceContent }) {
    const availableTabs = useMemo(() => enabledTabs(content), [content]);
    const firstTab = availableTabs.includes(content.defaultTab) ? content.defaultTab : availableTabs[0] ?? 'journey';
    const [activeTab, setActiveTab] = useState<ExperienceTabId>(firstTab);

    if (!content.pageEnabled) {
        return (
            <main className="min-h-[70vh] bg-background px-6 py-32 text-foreground">
                <div className="mx-auto max-w-3xl rounded-[2rem] border border-border/60 bg-card/40 p-10 text-center">
                    <Sparkles className="mx-auto mb-5 size-8 text-muted-foreground" />
                    <h1 className="text-3xl font-semibold">Experience is currently unavailable</h1>
                    <p className="mt-3 text-muted-foreground">This page has been temporarily disabled.</p>
                    <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium">Back home <ArrowRight className="size-4" /></Link>
                </div>
            </main>
        );
    }

    return (
        <main className="relative overflow-hidden bg-background text-foreground">
            {content.showDecorations && <BackgroundDecorations />}
            {content.showHero && <Hero content={content} />}

            {content.showMarquee && (
                <section className="relative z-10 border-y border-border/40 py-12 md:py-16">
                    <div className="mx-auto mb-7 max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">{content.marqueeTitle}</p>
                    </div>
                    <ExperienceMarquee />
                </section>
            )}

            {availableTabs.length > 0 && (
                <section id="experience-content" className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 md:py-28">
                    {content.showTabs && (
                        <TabNavigation content={content} availableTabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.3 }}
                            className={content.showTabs ? 'mt-12' : ''}
                        >
                            {activeTab === 'education' && <EducationView content={content} />}
                            {activeTab === 'journey' && <JourneyView content={content} />}
                            {activeTab === 'experience' && <ArchiveView content={content} />}
                        </motion.div>
                    </AnimatePresence>
                </section>
            )}
        </main>
    );
}

function BackgroundDecorations() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 top-32 size-[32rem] rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -left-40 top-[45rem] size-[30rem] rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute left-1/2 top-[90rem] size-[28rem] -translate-x-1/2 rounded-full bg-fuchsia-500/5 blur-3xl" />
        </div>
    );
}

function Hero({ content }: { content: ExperienceContent }) {
    return (
        <section className="relative z-10 flex min-h-[76vh] items-center border-b border-border/40 px-4 py-28 sm:px-6 lg:px-8">
            <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
                <div>
                    <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-400">
                        {content.heroEyebrow}
                    </motion.p>
                    <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="max-w-5xl text-5xl font-black tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-8xl">
                        {content.heroTitle}{' '}
                        <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">{content.heroHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }} className="mt-7 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                        {content.heroDescription}
                    </motion.p>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-9 flex flex-wrap gap-3">
                        <SmartLink href={content.heroPrimaryUrl} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background">
                            {content.heroPrimaryLabel}<ArrowRight className="size-4" />
                        </SmartLink>
                        <SmartLink href={content.heroSecondaryUrl} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-6 py-3 text-sm font-semibold backdrop-blur">
                            {content.heroSecondaryLabel}<ExternalLink className="size-4" />
                        </SmartLink>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Stat value={portfolioData.experiences.length} label="Experience records" />
                    <Stat value={portfolioData.education.length} label="Education records" />
                    <Stat value={new Set(portfolioData.experiences.flatMap((item) => item.skills)).size} label="Skills represented" />
                    <Stat value={portfolioData.experiences.filter((item) => item.isOngoing).length} label="Current roles" />
                </div>
            </div>
        </section>
    );
}

function SmartLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
    if (linkIsExternal(href)) return <a href={href} target="_blank" rel="noreferrer" className={className}>{children}</a>;
    return <Link href={href || '#experience-content'} className={className}>{children}</Link>;
}

function Stat({ value, label }: { value: number; label: string }) {
    return (
        <div className="rounded-3xl border border-border/60 bg-card/55 p-5 backdrop-blur-sm">
            <div className="text-3xl font-black tracking-tight">{value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        </div>
    );
}

function TabNavigation({ content, availableTabs, activeTab, onChange }: { content: ExperienceContent; availableTabs: ExperienceTabId[]; activeTab: ExperienceTabId; onChange: (tab: ExperienceTabId) => void }) {
    const copy: Record<ExperienceTabId, { label: string; description: string }> = {
        education: { label: content.educationLabel, description: content.educationDescription },
        journey: { label: content.journeyLabel, description: content.journeyDescription },
        experience: { label: content.experienceLabel, description: content.experienceDescription },
    };

    return (
        <div>
            <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <p className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">{content.tabIntro}</p>
                <p className="text-sm text-muted-foreground">{availableTabs.length} view{availableTabs.length === 1 ? '' : 's'} enabled</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                {availableTabs.map((id) => {
                    const Icon = icons[id];
                    const selected = id === activeTab;
                    return (
                        <button key={id} type="button" onClick={() => onChange(id)} className={cn('group rounded-3xl border p-5 text-left transition-all', selected ? 'border-foreground bg-foreground text-background shadow-xl' : 'border-border/60 bg-card/40 hover:-translate-y-1 hover:bg-card')}>
                            <div className="flex items-center justify-between gap-3">
                                <Icon className="size-5" />
                                <ArrowRight className={cn('size-4 transition-transform', selected ? 'translate-x-0' : '-translate-x-1 opacity-40 group-hover:translate-x-0 group-hover:opacity-100')} />
                            </div>
                            <h2 className="mt-8 text-xl font-bold">{copy[id].label}</h2>
                            <p className={cn('mt-2 text-sm leading-6', selected ? 'text-background/65' : 'text-muted-foreground')}>{copy[id].description}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function EducationView({ content }: { content: ExperienceContent }) {
    return (
        <div>
            <div className="grid gap-5 lg:grid-cols-2">
                {portfolioData.education.map((item) => <EducationCard key={item.id} item={item} />)}
            </div>
            <Highlight content={content} id="education" />
        </div>
    );
}

function EducationCard({ item }: { item: Education }) {
    return (
        <article className="rounded-[2rem] border border-border/60 bg-card/45 p-6 md:p-8">
            <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background"><GraduationCap className="size-6" /></div>
                <div>
                    <h3 className="text-xl font-bold md:text-2xl">{item.degree}</h3>
                    <p className="mt-1 font-medium text-muted-foreground">{item.institution}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.major}</p>
                </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Present'}</span>
                {item.gpa && <span>GPA {item.gpa}</span>}
            </div>
            {item.achievements && item.achievements.length > 0 && (
                <ul className="mt-6 space-y-2 border-t border-border/50 pt-5 text-sm text-muted-foreground">
                    {item.achievements.map((achievement) => <li key={achievement} className="flex gap-2"><Award className="mt-0.5 size-4 shrink-0" />{achievement}</li>)}
                </ul>
            )}
        </article>
    );
}

function JourneyView({ content }: { content: ExperienceContent }) {
    const sorted = useMemo(() => [...portfolioData.experiences].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()), []);
    return (
        <div>
            <div className="relative space-y-5 before:absolute before:bottom-6 before:left-[23px] before:top-6 before:w-px before:bg-border md:before:left-[31px]">
                {sorted.map((item, index) => (
                    <div key={item.id} className="relative grid grid-cols-[48px_1fr] gap-4 md:grid-cols-[64px_1fr] md:gap-6">
                        <div className="relative z-10 flex size-12 items-center justify-center rounded-2xl border border-border bg-background md:size-16">
                            <span className="text-xs font-black text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <ExperienceCard item={item} content={content} />
                    </div>
                ))}
            </div>
            <Highlight content={content} id="journey" />
        </div>
    );
}

function ArchiveView({ content }: { content: ExperienceContent }) {
    const categories = content.categories.filter((category) => category.enabled);
    const [selected, setSelected] = useState(categories[0]?.id ?? '');
    const active = categories.find((category) => category.id === selected) ?? categories[0];
    const items = active ? portfolioData.experiences.filter((item) => item.id.startsWith(active.prefix)) : [];

    if (categories.length === 0) return <div className="rounded-3xl border border-border/60 p-10 text-center text-muted-foreground">{content.emptyState}</div>;

    return (
        <div>
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
                <aside className="lg:sticky lg:top-28 lg:self-start">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">{content.archiveEyebrow}</p>
                    <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">{content.archiveTitle}</h2>
                    <p className="mt-4 max-w-md leading-7 text-muted-foreground">{content.archiveDescription}</p>
                    <div className="mt-7 space-y-2">
                        {categories.map((category) => (
                            <button key={category.id} type="button" onClick={() => setSelected(category.id)} className={cn('w-full rounded-2xl border px-4 py-4 text-left transition', selected === category.id ? 'border-foreground bg-foreground text-background' : 'border-border/60 bg-card/40 hover:bg-card')}>
                                <div className="font-semibold">{category.label}</div>
                                <div className={cn('mt-1 text-xs leading-5', selected === category.id ? 'text-background/60' : 'text-muted-foreground')}>{category.description}</div>
                            </button>
                        ))}
                    </div>
                </aside>
                <div className="space-y-5">
                    {items.length > 0 ? items.map((item) => <ExperienceCard key={item.id} item={item} content={content} />) : (
                        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">{content.emptyState}</div>
                    )}
                </div>
            </div>
            <Highlight content={content} id="experience" />
        </div>
    );
}

function ExperienceCard({ item, content }: { item: Experience; content: ExperienceContent }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = (content.showResponsibilities && item.responsibilities?.length) || (content.showImpact && item.impact?.length) || (content.showKeyLearnings && item.keyLearnings?.length);

    return (
        <article className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 transition hover:border-border hover:shadow-xl">
            <button type="button" onClick={() => hasDetails && setExpanded((value) => !value)} className={cn('w-full p-6 text-left md:p-8', hasDetails && 'cursor-pointer')}>
                <div className="flex gap-4 md:gap-6">
                    <div className={cn('relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 md:size-16', item.logoBg || 'bg-background')}>
                        {item.logo ? <Image src={item.logo} alt="" fill className="object-contain p-2" unoptimized /> : <Briefcase className="size-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold md:text-2xl">{item.position}</h3>
                                <p className="mt-1 font-medium text-muted-foreground">{item.company}</p>
                            </div>
                            {hasDetails && <ChevronDown className={cn('mt-1 size-5 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground sm:text-sm">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Present'}</span>
                            {item.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{item.location}</span>}
                            <span className="capitalize">{item.type.replace('-', ' ')}</span>
                        </div>
                        {item.description && <p className="mt-5 leading-7 text-muted-foreground">{item.description}</p>}
                        {content.showSkills && item.skills.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {item.skills.map((skill) => <span key={skill} className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium">{skill}</span>)}
                            </div>
                        )}
                        {(item.link || item.externalLink) && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {item.link && <a href={item.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 text-sm font-semibold">Visit <ExternalLink className="size-3.5" /></a>}
                            </div>
                        )}
                    </div>
                </div>
            </button>

            <AnimatePresence initial={false}>
                {expanded && hasDetails && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid gap-6 border-t border-border/50 px-6 py-7 md:grid-cols-2 md:px-8">
                            {content.showResponsibilities && item.responsibilities && item.responsibilities.length > 0 && <DetailList title="Responsibilities" icon={BookOpen} items={item.responsibilities} />}
                            {content.showImpact && item.impact && item.impact.length > 0 && <DetailList title="Impact" icon={Rocket} items={item.impact} />}
                            {content.showKeyLearnings && item.keyLearnings && item.keyLearnings.length > 0 && <DetailList title="Key learnings" icon={Sparkles} items={item.keyLearnings} />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </article>
    );
}

function DetailList({ title, icon: Icon, items }: { title: string; icon: typeof BookOpen; items: string[] }) {
    return (
        <div>
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground"><Icon className="size-4" />{title}</h4>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {items.map((item) => <li key={item} className="flex gap-2"><ArrowRight className="mt-1 size-3.5 shrink-0" />{item}</li>)}
            </ul>
        </div>
    );
}

function Highlight({ content, id }: { content: ExperienceContent; id: ExperienceTabId }) {
    const item = content.highlights[id];
    if (!content.showHighlights || !item.enabled) return null;

    return (
        <section className="mt-20 overflow-hidden rounded-[2.5rem] border border-border/60 bg-foreground px-6 py-10 text-background md:px-10 md:py-14">
            <div className="grid gap-7 lg:grid-cols-[1fr_.75fr] lg:items-end">
                <h2 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl md:text-6xl">{item.title} <span className="text-background/45">{item.highlight}</span></h2>
                <p className="leading-7 text-background/65">{item.description}</p>
            </div>
        </section>
    );
}
