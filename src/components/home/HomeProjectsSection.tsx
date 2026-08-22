'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type Props = { projects: Project[]; title: string; subtitle: string };

export function HomeProjectsSection({ projects, title, subtitle }: Props) {
    if (!projects.length) return null;

    return (
        <section id="home-projects" className="scroll-mt-20 border-t border-foreground/10 bg-background px-6 py-14 md:px-16 md:py-18 lg:px-24">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-5">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Projects</p>
                            <span className="rounded-md border border-foreground/10 px-2 py-1 font-mono text-[9px] text-muted-foreground">{projects.length}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground/80">{title}</p>
                        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
                    </div>
                    <Link href="/projects" className="group inline-flex items-center gap-2 text-xs font-medium text-foreground/60 transition hover:text-foreground">
                        View all projects <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="border-t border-foreground/10">
                    {projects.map((project, index) => {
                        const isOngoing = project.status === 'ongoing';
                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.slug}`}
                                className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-foreground/10 px-1 py-4 transition-colors hover:bg-foreground/[0.025] sm:grid-cols-[42px_116px_minmax(0,1fr)_110px_28px] sm:gap-5 sm:px-3 sm:py-5"
                            >
                                <span className={cn('font-mono text-[10px] tabular-nums transition-colors', isOngoing ? 'text-emerald-500/75' : 'text-muted-foreground/55')}>{String(index + 1).padStart(2, '0')}</span>

                                <div className="hidden h-16 w-28 overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.025] sm:block">
                                    {project.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={project.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                    ) : null}
                                </div>

                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">{project.title}</h3>
                                        <span className={cn('rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider', isOngoing ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400')}>{project.status === 'completed' ? 'done' : project.status}</span>
                                    </div>
                                    <p className="line-clamp-1 text-xs leading-5 text-muted-foreground sm:text-sm">{project.description}</p>
                                    {project.techStack.length > 0 ? <p className={cn('mt-1 hidden truncate font-mono text-[10px] tracking-wide md:block', isOngoing ? 'text-emerald-600/55 dark:text-emerald-400/55' : 'text-blue-600/55 dark:text-blue-400/55')}>{project.techStack.join(' • ')}</p> : null}
                                </div>

                                <span className="hidden text-right text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">{project.category || 'Project'}</span>
                                <ArrowRight className={cn('size-4 text-muted-foreground transition group-hover:translate-x-1', isOngoing && 'group-hover:text-emerald-500')} />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
