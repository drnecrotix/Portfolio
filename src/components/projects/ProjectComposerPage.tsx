'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    ArrowLeft,
    Box,
    Clock,
    Code,
    Download,
    ExternalLink,
    Github,
    Layers,
    LayoutGrid,
    Maximize2,
    Sparkles,
    Terminal,
    Users,
    X,
    Zap,
} from 'lucide-react';
import type { Project, ProjectContentBlock } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { ProjectPlaceholder } from './ProjectPlaceholder';

const BLOCK_TOKEN = /^\[\[(mission|features|chronicles|installation)\]\]$/i;
const BLOCK_SPLIT = /(\[\[(?:mission|features|chronicles|installation)\]\])/gi;

function normalizeLayout(layout: string) {
    return layout
        .replace(/&lbrack;&lbrack;(mission|features|chronicles|installation)&rbrack;&rbrack;/gi, '[[$1]]')
        .replace(
            /<p[^>]*>\s*(?:<(?:strong|em|s)[^>]*>\s*)*\[\[(mission|features|chronicles|installation)\]\](?:\s*<\/(?:strong|em|s)>)*\s*<\/p>/gi,
            '[[$1]]',
        );
}

function layoutParts(layout: string) {
    return normalizeLayout(layout).split(BLOCK_SPLIT).filter((part) => part.trim().length > 0);
}

function isBlock(part: string): ProjectContentBlock | null {
    const match = part.trim().match(BLOCK_TOKEN);
    return match ? (match[1].toLowerCase() as ProjectContentBlock) : null;
}

function TerminalBlock({ title, code }: { title: string; code: string }) {
    return (
        <div className="overflow-hidden rounded-xl border border-black/15 bg-slate-50 shadow-xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-black/10 bg-slate-200/50 px-4 py-2 dark:border-white/5 dark:bg-white/5">
                <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="font-mono text-[10px] text-slate-500 dark:text-white/30">{title}</span>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-emerald-700 dark:text-emerald-400"><code>{code}</code></pre>
        </div>
    );
}

function ProjectBlock({ block, project }: { block: ProjectContentBlock; project: Project }) {
    const t = useTranslations('projects');

    if (block === 'mission') {
        return (
            <div id="mission" className="flex items-center gap-3 pt-2">
                <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><Box className="h-5 w-5" /></span>
                <h2 className="text-2xl font-bold text-foreground">{t('sections.missionBrief')}</h2>
            </div>
        );
    }

    if (block === 'features') {
        if (!project.features?.length) return null;
        return (
            <section id="features" className="space-y-8">
                <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-blue-500/10 p-2 text-blue-500"><Zap className="h-5 w-5" /></span>
                    <h2 className="text-2xl font-bold text-foreground">{t('sections.keyFeatures')}</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {project.features.map((group, index) => (
                        <motion.div
                            key={`${group.title}-${index}`}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="rounded-2xl border border-black/15 bg-secondary/10 p-6 dark:border-white/5 dark:bg-secondary/5"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-black/10 text-emerald-700 dark:bg-white/5 dark:text-emerald-400">
                                {index % 2 === 0 ? <Box className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                            </div>
                            <h3 className="mb-3 text-lg font-bold">{group.title}</h3>
                            <ul className="space-y-2">
                                {group.items.map((item, itemIndex) => (
                                    <li key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </section>
        );
    }

    if (block === 'chronicles') {
        if (!project.challengesAndSolutions?.length) return null;
        return (
            <section id="chronicles" className="space-y-8">
                <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><Terminal className="h-5 w-5" /></span>
                    <h2 className="text-2xl font-bold text-foreground">{t('sections.engineeringChronicles')}</h2>
                </div>
                <div className="ml-3 space-y-10 border-l border-black/25 pb-2 pl-8 dark:border-white/10">
                    {project.challengesAndSolutions.map((item, index) => (
                        <div key={`${item.problem}-${index}`} className="relative">
                            <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full border-2 border-amber-500 bg-background" />
                            <h3 className="mb-2 text-lg font-bold">{item.problem}</h3>
                            <div className="border-l border-black/20 pl-4 text-sm leading-relaxed text-muted-foreground dark:border-white/5">
                                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('sections.solution')}</span>
                                {item.solution}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!project.installation?.length) return null;
    return (
        <section id="installation" className="space-y-8">
            <div className="flex items-center gap-3">
                <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><Terminal className="h-5 w-5" /></span>
                <h2 className="text-2xl font-bold text-foreground">{t('sections.installation')}</h2>
            </div>
            <div className="space-y-6">
                {project.installation.map((step, index) => (
                    <div key={`${step.title}-${index}`}>
                        {step.type === 'code' ? (
                            <TerminalBlock title={step.title} code={step.cmd || step.code || ''} />
                        ) : (
                            <div className="rounded-2xl border border-black/10 bg-secondary/20 p-6 dark:border-white/5 dark:bg-secondary/5">
                                <h3 className="mb-3 flex items-center gap-2 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{step.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">{step.code || step.cmd}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ProjectComposerPage({ project }: { project: Project }) {
    const t = useTranslations('projects');
    const router = useRouter();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const layout = project.contentLayout?.trim() || project.description;
    const parts = layoutParts(layout);
    const blocks = project.contentBlocks ?? [];
    const isOngoing = project.status === 'ongoing';

    const handleExit = () => {
        if (typeof window !== 'undefined' && document.referrer.includes('/projects')) router.back();
        else router.push('/projects');
    };

    return (
        <div className="min-h-screen bg-background pb-24 pt-24 text-foreground sm:pt-32">
            <header className="container mx-auto mb-12 max-w-7xl px-6">
                <button onClick={handleExit} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/10 px-3.5 py-2 text-sm text-muted-foreground transition hover:bg-secondary/20 hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t('sections.backToProjects')}
                </button>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/20 bg-secondary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground dark:border-border/40 dark:bg-secondary/5">
                    <span className={cn('h-2 w-2 rounded-full', isOngoing ? 'animate-pulse bg-emerald-500' : 'bg-blue-500')} />
                    {isOngoing ? t('status.ongoing') : t('status.completed')}
                </div>
                <h1 className="mb-6 break-words text-4xl font-black uppercase leading-none tracking-tight md:text-5xl lg:text-7xl">{project.title}</h1>
                <p className="max-w-3xl text-xl font-light leading-relaxed text-muted-foreground/80 md:text-2xl">{project.description}</p>
            </header>

            <div className="container mx-auto mb-16 max-w-7xl px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55 }}
                    onClick={() => project.image && setSelectedImage(project.image)}
                    className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-black/15 bg-secondary/5 shadow-2xl md:aspect-[2/1] dark:border-border/40"
                >
                    {project.image ? (
                        <img src={project.image} alt={project.title} className="h-full w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                    ) : (
                        <ProjectPlaceholder className="rounded-none border-0 bg-transparent" title={project.title} />
                    )}
                </motion.div>
            </div>

            <div className="container mx-auto mb-20 max-w-7xl px-6">
                <div className="grid grid-cols-2 gap-6 border-y border-black/20 py-8 md:grid-cols-4 dark:border-border/40">
                    <div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Code className="h-3 w-3" />{t('metadata.role')}</span><p className="mt-2 font-bold">{project.role || t('metadata.roleValue')}</p></div>
                    <div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Clock className="h-3 w-3" />{t('metadata.timeline')}</span><p className="mt-2 font-bold">{project.customTimeline || formatDate(project.startDate)}</p></div>
                    <div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Users className="h-3 w-3" />{t('metadata.team')}</span><p className="mt-2 font-bold">{project.team || t('metadata.teamValue')}</p></div>
                    <div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Layers className="h-3 w-3" />{t('metadata.techStack')}</span><p className="mt-2 font-bold">{t('metadata.techStackValue', { count: project.techStack.length })}</p></div>
                </div>
            </div>

            <main className="container mx-auto max-w-7xl px-6">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    <article className="space-y-12 lg:col-span-8">
                        {parts.map((part, index) => {
                            const block = isBlock(part);
                            if (block) return <ProjectBlock key={`${block}-${index}`} block={block} project={project} />;
                            return (
                                <div
                                    key={`copy-${index}`}
                                    className="prose prose-lg max-w-none text-zinc-600 prose-headings:font-black prose-headings:tracking-tight prose-p:leading-loose prose-a:text-emerald-600 prose-blockquote:my-8 prose-blockquote:rounded-r-xl prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-secondary/25 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:text-lg prose-blockquote:italic prose-blockquote:text-foreground/80 dark:prose-invert dark:text-muted-foreground dark:prose-a:text-emerald-400 dark:prose-blockquote:bg-white/[0.04]"
                                    dangerouslySetInnerHTML={{ __html: part }}
                                />
                            );
                        })}

                        {project.galleryImages && project.galleryImages.length > 0 && (
                            <section id="gallery" className="space-y-8 pt-4">
                                <div className="flex items-center gap-3"><span className="rounded-lg bg-purple-500/10 p-2 text-purple-500"><LayoutGrid className="h-5 w-5" /></span><h2 className="text-2xl font-bold">{t('sections.visualGallery')}</h2></div>
                                <div className="space-y-8">
                                    {project.galleryImages.map((image, index) => (
                                        <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(image)} className="group relative block w-full overflow-hidden rounded-2xl border border-border/40 text-left">
                                            <img src={image} alt={`${project.title} ${index + 1}`} className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]" />
                                            <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><Maximize2 className="h-4 w-4" /></span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </article>

                    <aside className="relative lg:col-span-4">
                        <div className="sticky top-20 space-y-8">
                            {(project.demoUrl || project.repoUrl || project.downloadUrl) && (
                                <div className="rounded-2xl border border-black/20 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-secondary/5 dark:shadow-none">
                                    <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('sections.projectAccess')}</h3>
                                    <div className="space-y-3">
                                        {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background"><span>{t('sections.liveDemo')}</span><ExternalLink className="h-4 w-4" /></a>}
                                        {project.downloadUrl && <a href={project.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"><Download className="h-4 w-4" /><span>Download</span></a>}
                                        {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary/10 px-4 py-3 text-sm font-medium transition hover:bg-secondary/20"><Github className="h-4 w-4" /><span>{t('sections.sourceCode')}</span></a>}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="mb-5 border-b border-border/40 pb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('sections.technologies')}</h3>
                                <div className="flex flex-wrap gap-2">{project.techStack.map((tech) => <span key={tech} className="rounded-lg border border-border/40 bg-secondary/10 px-3 py-1.5 text-xs text-muted-foreground">{tech}</span>)}</div>
                            </div>

                            {(blocks.length > 0 || project.galleryImages?.length) && (
                                <div>
                                    <h3 className="mb-5 border-b border-border/40 pb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('sections.contents')}</h3>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        {blocks.includes('mission') && <li><button onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-foreground">• {t('sections.missionBrief')}</button></li>}
                                        {blocks.includes('features') && project.features && <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-foreground">• {t('sections.keyFeatures')}</button></li>}
                                        {blocks.includes('chronicles') && project.challengesAndSolutions && <li><button onClick={() => document.getElementById('chronicles')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-foreground">• {t('sections.engineeringChronicles')}</button></li>}
                                        {blocks.includes('installation') && project.installation && <li><button onClick={() => document.getElementById('installation')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-foreground">• {t('sections.installation')}</button></li>}
                                        {project.galleryImages?.length ? <li><button onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })} className="transition hover:text-foreground">• {t('sections.visualGallery')}</button></li> : null}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>

            <div className="container mx-auto mt-24 max-w-7xl border-t border-border/40 px-6 pt-12">
                <button onClick={handleExit} className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t('sections.backToProjects')}</button>
            </div>

            <AnimatePresence>
                {selectedImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="fixed inset-0 z-[200] flex cursor-zoom-out items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
                        <motion.img src={selectedImage} alt="Project media" className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl" />
                        <button className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"><X className="h-6 w-6" /></button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
