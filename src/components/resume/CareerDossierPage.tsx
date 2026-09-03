import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    Briefcase,
    CircleDot,
    Download,
    ExternalLink,
    FileText,
    Folder,
    Github,
    Instagram,
    Linkedin,
    Wrench,
} from 'lucide-react';
import type { ExperienceContent } from '@/lib/experience-content';
import type { PublicIdentity } from '@/lib/public-identity';
import type { PersonalWikiContent } from '@/lib/wiki-content';
import type { ResumeSettings } from '@/lib/resume-settings';
import type { Education, Experience } from '@/types';

function period(item: Pick<Experience, 'startDate' | 'endDate' | 'isOngoing'>) {
    return `${item.startDate || '-'} - ${item.isOngoing ? 'Present' : item.endDate || '-'}`;
}

function educationPeriod(item: Education) {
    return `${item.startDate || '-'} - ${item.isOngoing ? 'Present' : item.endDate || '-'}`;
}

function aggregateSkills(entries: Experience[]) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        for (const skill of new Set(entry.skills.map((item) => item.trim()).filter(Boolean))) counts.set(skill, (counts.get(skill) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}

function RoleCard({ item, index }: { item: Experience; index: number }) {
    return (
        <article className="grid gap-4 border-t border-foreground/10 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-6">
            <div>
                <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{String(index + 1).padStart(2, '0')}</div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{period(item)}</div>
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="text-xl font-black tracking-[-0.03em] sm:text-2xl">{item.position}</h3><p className="mt-1 text-sm font-semibold text-foreground/68">{item.company}{item.location ? ` · ${item.location}` : ''}</p></div>
                    {item.isOngoing ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400"><CircleDot className="size-3" /> Current</span> : null}
                </div>
                {item.description ? <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p> : null}
                {item.skills.length ? <div className="mt-4 flex flex-wrap gap-1.5">{item.skills.slice(0, 7).map((skill) => <span key={skill} className="rounded-full border border-foreground/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{skill}</span>)}</div> : null}
            </div>
        </article>
    );
}

export function CareerDossierPage({ identity, wiki, experience, resume }: { identity: PublicIdentity; wiki: PersonalWikiContent; experience: ExperienceContent; resume: ResumeSettings }) {
    const roles = experience.journeyEntries;
    const education = experience.educationEntries;
    const skills = aggregateSkills(roles.length ? roles : experience.experienceEntries);
    const current = roles.filter((item) => item.isOngoing);
    const portrait = wiki.portrait || identity.avatar || '/dr-necrotix-mark.svg';
    const displayName = wiki.title || identity.name;
    const roleLine = current[0]?.position || roles[0]?.position || 'Creative technologist & independent builder';
    const selectedRoles = roles.slice(0, 5);

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <header className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <div className="border-b border-foreground/10 pb-10 sm:pb-14">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground"><FileText className="size-4" /> Career Dossier · live profile</div>
                        <div className="flex flex-wrap gap-2">
                            <a href={resume.webViewPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.035] px-3.5 py-2 text-[10px] font-semibold text-foreground/75 transition hover:border-foreground/25 hover:bg-foreground/[0.06] hover:text-foreground"><ExternalLink className="size-3.5" /> {resume.webViewLabel}</a>
                            <a href="/api/resume/download" className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-[10px] font-semibold text-sky-700 transition hover:border-sky-500/45 hover:bg-sky-500/15 dark:text-sky-300"><Download className="size-3.5" /> {resume.downloadLabel}</a>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                        <div>
                            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Work / systems / creative technology</p>
                            <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-[-0.06em] sm:text-7xl lg:text-[6.5rem] lg:leading-[0.92]">{displayName}</h1>
                            <p className="mt-6 max-w-3xl text-lg font-semibold leading-7 text-foreground/78 sm:text-xl">{roleLine}</p>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">A selective professional view generated from the same public Journey records used across the portfolio. Biography and deeper personal context stay in the Wiki.</p>
                        </div>
                        <div className="rounded-[1.6rem] border border-foreground/10 bg-foreground/[0.018] p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={portrait} alt={displayName} className="aspect-square w-full rounded-[1.2rem] border border-foreground/10 bg-foreground/[0.03] object-cover" />
                            {wiki.aliases.length ? <div className="mt-3 flex flex-wrap gap-1.5">{wiki.aliases.slice(0, 4).map((alias) => <span key={alias} className="rounded-full border border-foreground/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{alias}</span>)}</div> : null}
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)_290px] lg:px-10">
                <aside className="hidden lg:block"><div className="sticky top-28 space-y-7"><nav className="border-l border-foreground/10 pl-4"><p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Dossier</p><a href="#profile" className="block py-1.5 text-xs font-semibold text-foreground">Profile</a><a href="#experience" className="block py-1.5 text-xs text-muted-foreground transition hover:text-foreground">Experience</a><a href="#education" className="block py-1.5 text-xs text-muted-foreground transition hover:text-foreground">Education</a><a href="#capabilities" className="block py-1.5 text-xs text-muted-foreground transition hover:text-foreground">Capabilities</a>{resume.showDocumentCard ? <a href="#document" className="block py-1.5 text-xs text-muted-foreground transition hover:text-foreground">CV document</a> : null}</nav><div className="border-l border-foreground/10 pl-4"><p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Explore</p><Link href="/journey" className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"><Briefcase className="size-3.5" /> Full Journey</Link><Link href="/projects" className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"><Folder className="size-3.5" /> Projects</Link><Link href="/wiki" className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"><BookOpen className="size-3.5" /> Personal Wiki</Link><Link href="/lab" className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"><Wrench className="size-3.5" /> The Lab</Link></div></div></aside>

                <div className="min-w-0">
                    <section id="profile" className="scroll-mt-28 border-b border-foreground/10 pb-12"><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">01 · Profile</div><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Professional signal, not another biography.</h2><p className="mt-5 max-w-3xl text-base leading-8 text-foreground/72">Career Dossier is intentionally selective. It summarizes public work, training and evidence-backed capabilities, while Journey keeps the full chronology and the Personal Wiki remains the factual biographical reference.</p><div className="mt-6 flex flex-wrap gap-2"><Link href="/journey" className="inline-flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300">Explore full Journey <ArrowRight className="size-3.5" /></Link><Link href="/wiki" className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Biography in Wiki <ArrowRight className="size-3.5" /></Link></div></section>

                    <section id="experience" className="scroll-mt-28 border-b border-foreground/10 py-12"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">02 · Selected experience</div><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Work that shaped the system.</h2></div><Link href="/journey" className="text-xs font-semibold text-muted-foreground transition hover:text-foreground">Full archive →</Link></div><div className="mt-8">{selectedRoles.length ? selectedRoles.map((item, index) => <RoleCard key={item.id} item={item} index={index} />) : <p className="text-sm text-muted-foreground">No public Journey records are available yet.</p>}</div></section>

                    <section id="education" className="scroll-mt-28 border-b border-foreground/10 py-12"><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">03 · Education</div><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Foundations & training.</h2><div className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">{education.length ? education.slice(0, 5).map((item) => <div key={item.id} className="grid gap-3 py-6 sm:grid-cols-[140px_minmax(0,1fr)]"><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{educationPeriod(item)}</div><div><h3 className="text-lg font-black tracking-tight">{item.degree}{item.major ? ` · ${item.major}` : ''}</h3><p className="mt-1 text-sm text-muted-foreground">{item.institution}</p></div></div>) : <div className="py-6 text-sm text-muted-foreground">No public education records are available yet.</div>}</div></section>

                    <section id="capabilities" className="scroll-mt-28 py-12"><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">04 · Capability index</div><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Evidence over percentages.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Capabilities are aggregated from skills attached to public Journey roles instead of arbitrary proficiency bars.</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{skills.slice(0, 14).map((skill, index) => <div key={skill.name} className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/[0.015] px-3.5 py-3"><div className="flex items-center gap-3"><span className="font-mono text-[8px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span><span className="text-sm font-semibold">{skill.name}</span></div><span className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">{skill.count} role{skill.count === 1 ? '' : 's'}</span></div>)}</div></section>
                </div>

                <aside><div className="space-y-4 lg:sticky lg:top-28"><section className="rounded-[1.4rem] border border-foreground/10 bg-foreground/[0.018] p-5"><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Current signal</div>{current.length ? <div className="mt-4 space-y-4">{current.slice(0, 2).map((item) => <div key={item.id}><div className="flex items-center gap-2 text-xs font-black"><CircleDot className="size-3.5 text-emerald-500" /> {item.position}</div><p className="mt-1 pl-5 text-[11px] leading-5 text-muted-foreground">{item.company}</p></div>)}</div> : <p className="mt-3 text-xs leading-5 text-muted-foreground">No role is currently marked as ongoing in Journey.</p>}</section>

                    {resume.showDocumentCard ? <section id="document" className="scroll-mt-28 rounded-[1.4rem] border border-sky-500/20 bg-sky-500/[0.035] p-5"><FileText className="size-6 text-sky-500" /><h2 className="mt-4 text-xl font-black tracking-tight">{resume.documentTitle}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{resume.documentDescription}</p><div className="mt-5 grid gap-2"><a href={resume.webViewPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between rounded-xl border border-foreground/10 bg-background/40 px-3 py-2.5 text-xs font-semibold transition hover:bg-foreground/[0.03]">{resume.webViewLabel} <ExternalLink className="size-3.5" /></a><a href="/api/resume/download" className="inline-flex items-center justify-between rounded-xl bg-foreground px-3 py-2.5 text-xs font-bold text-background">{resume.downloadLabel} <Download className="size-3.5" /></a></div></section> : null}

                    {(identity.githubUrl || identity.linkedinUrl || identity.instagramUrl) ? <section className="rounded-[1.4rem] border border-foreground/10 p-5"><div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Profiles</div><div className="mt-3 grid gap-1">{identity.githubUrl ? <a href={identity.githubUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"><span className="flex items-center gap-2"><Github className="size-3.5" /> GitHub</span><ExternalLink className="size-3" /></a> : null}{identity.linkedinUrl ? <a href={identity.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"><span className="flex items-center gap-2"><Linkedin className="size-3.5" /> LinkedIn</span><ExternalLink className="size-3" /></a> : null}{identity.instagramUrl ? <a href={identity.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs text-muted-foreground transition hover:bg-foreground/[0.03] hover:text-foreground"><span className="flex items-center gap-2"><Instagram className="size-3.5" /> Instagram</span><ExternalLink className="size-3" /></a> : null}</div></section> : null}</div></aside>
            </div>

            <footer className="mx-auto mt-6 max-w-7xl px-5 sm:px-8 lg:px-10"><div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-6 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground"><span>Career Dossier · sourced from Journey CMS</span><Link href="/contact" className="inline-flex items-center gap-1.5 font-bold text-foreground/70 transition hover:text-foreground">Contact <ArrowRight className="size-3" /></Link></div></footer>
        </main>
    );
}
