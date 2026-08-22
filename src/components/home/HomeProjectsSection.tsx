'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '@/types';

type Props = { projects: Project[]; title: string; subtitle: string };

export function HomeProjectsSection({ projects, title, subtitle }: Props) {
    if (!projects.length) return null;
    return (
        <section id="home-projects" className="scroll-mt-20 border-t border-black/10 bg-background px-6 py-20 dark:border-white/10 md:px-16 md:py-28 lg:px-24">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-8 flex flex-col gap-5 border-b border-black/10 pb-8 dark:border-white/10 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Portfolio</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>
                    </div>
                    <Link href="/projects" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground">View all projects <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
                </div>
                <div className="divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
                    {projects.map((project, index) => (
                        <Link key={project.id} href={`/projects/${project.slug}`} className="group grid gap-4 py-6 transition md:grid-cols-[64px_minmax(0,1fr)_180px_120px_32px] md:items-center">
                            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                            <div className="min-w-0"><h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary md:text-2xl">{project.title}</h3><p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{project.description}</p></div>
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{project.category || 'Project'}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{project.status}</div>
                            <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
