'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type Props = { projects: Project[] };

export function HomeProjectsSection({ projects }: Props) {
    const visibleProjects = projects.slice(0, 5);
    if (!visibleProjects.length) return null;

    return (
        <section id="home-projects" className="scroll-mt-24 border-t border-foreground/10 bg-background px-6 py-12 md:px-16 md:py-14 lg:scroll-mt-28 lg:px-24 lg:py-16">
            <div className="mx-auto w-full max-w-[1400px]">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-5 border-b border-foreground/10 pb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <p className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-foreground/80">Projects</p>
                        <span className="rounded-md border border-foreground/10 px-2 py-1 font-mono text-[10px] text-muted-foreground">{visibleProjects.length}</span>
                    </div>
                    <Link href="/projects" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground/65 transition hover:text-foreground">
                        View all projects <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="border-t border-foreground/10">
                    {visibleProjects.map((project, index) => {
                        const isOngoing = project.status === 'ongoing';
                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.slug}`}
                                className="group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-4 border-b border-foreground/10 px-1 py-5 transition-colors hover:bg-foreground/[0.025] sm:grid-cols-[48px_168px_minmax(0,1fr)_120px_28px] sm:gap-6 sm:px-4 sm:py-6"
                            >
                                <span className={cn('font-mono text-[11px] tabular-nums transition-colors sm:text-xs', isOngoing ? 'text-emerald-500/80' : 'text-muted-foreground/60')}>{String(index + 1).padStart(2, '0')}</span>

                                <div className="hidden h-24 w-40 overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.025] sm:block">
                                    {project.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={project.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                    ) : null}
                                </div>

                                <div className="min-w-0">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                                        <h3 className="truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">{project.title}</h3>
                                        <span className={cn('rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider sm:text-[10px]', isOngoing ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400')}>{project.status === 'completed' ? 'done' : project.status}</span>
                                    </div>
                                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground sm:text-[15px] sm:leading-6">{project.description}</p>
                                    {project.techStack.length > 0 ? <p className={cn('mt-1.5 hidden truncate font-mono text-[10px] tracking-wide md:block', isOngoing ? 'text-emerald-600/60 dark:text-emerald-400/60' : 'text-blue-600/60 dark:text-blue-400/60')}>{project.techStack.join(' • ')}</p> : null}
                                </div>

                                <span className="hidden text-right text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">{project.category || 'Project'}</span>
                                <ArrowRight className={cn('size-4 text-muted-foreground transition group-hover:translate-x-1', isOngoing && 'group-hover:text-emerald-500')} />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
