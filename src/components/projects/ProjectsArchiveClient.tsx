'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type FilterType = 'all' | 'ongoing' | 'completed';

function ProjectListItem({ project, index, onClick }: { project: Project; index: number; onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const isOngoing = project.status === 'ongoing';
    const displayIndex = String(index + 1).padStart(2, '0');

    return (
        <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.25) }} className="group relative border-b border-foreground/10" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <button type="button" onClick={onClick} className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden px-2 py-5 text-left transition-colors hover:bg-foreground/[0.025] sm:items-center sm:gap-8 sm:px-8 sm:py-10">
                <motion.span animate={{ x: isHovered ? 5 : 0, scale: isHovered ? 1.06 : 1 }} transition={{ duration: 0.25 }} className={cn('shrink-0 text-2xl font-black tabular-nums transition-colors sm:text-4xl md:text-5xl', isHovered ? (isOngoing ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400') : 'text-muted-foreground/20')}>{displayIndex}</motion.span>

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-4">
                        <motion.h2 animate={{ x: isHovered ? 8 : 0 }} transition={{ duration: 0.25 }} className="min-w-0 break-words text-lg font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-4xl">{project.title}</motion.h2>
                        <span className={cn('shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider sm:text-xs', isOngoing ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400')}>{isOngoing ? 'ongoing' : project.status === 'completed' ? 'done' : 'planned'}</span>
                    </div>
                    <p className="line-clamp-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-base sm:leading-6">{project.description}</p>
                    {project.techStack.length > 0 && <p className={cn('mt-3 hidden break-words font-mono text-xs tracking-wide sm:block', isOngoing ? 'text-emerald-600/60 dark:text-emerald-400/60' : 'text-blue-600/60 dark:text-blue-400/60')}>{project.techStack.join(' • ')}</p>}
                </div>

                <motion.div animate={{ x: isHovered ? 5 : 0, opacity: isHovered ? 1 : 0.45 }} transition={{ duration: 0.25 }} className="hidden shrink-0 items-center gap-2 sm:flex"><span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">view</span><ArrowRight className={cn('h-5 w-5 transition-colors', isHovered ? (isOngoing ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400') : 'text-muted-foreground')} /></motion.div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground sm:hidden" />
            </button>
        </motion.article>
    );
}

export function ProjectsArchiveClient({ projects }: { projects: Project[] }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterType>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const categories = useMemo(() => ['all', ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean) as string[]))], [projects]);
    const filteredProjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return projects.filter((project) => {
            const matchesSearch = !query || project.title.toLowerCase().includes(query) || project.description.toLowerCase().includes(query) || project.techStack.some((tech) => tech.toLowerCase().includes(query));
            return matchesSearch && (statusFilter === 'all' || project.status === statusFilter) && (categoryFilter === 'all' || project.category === categoryFilter);
        });
    }, [projects, searchQuery, statusFilter, categoryFilter]);

    return (
        <main className="min-h-screen bg-background text-foreground">
            <section className="mx-auto w-full max-w-[110rem] px-4 pb-20 pt-24 sm:px-6 sm:pt-28 md:px-12 md:pt-32">
                <header className="mb-8 border-b border-foreground/10 pb-6 md:mb-14 md:pb-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                        <div className="min-w-0">
                            <div className="mb-5 flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-500" /><p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground sm:text-sm sm:tracking-[0.35em]">Projects Archive</p><span className="rounded-md border border-foreground/10 px-2 py-1 font-mono text-[10px] text-muted-foreground">{projects.length}</span></div>
                            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
                                <nav className="flex w-max min-w-full gap-6 lg:w-auto lg:flex-wrap lg:gap-x-7 lg:gap-y-3" aria-label="Project categories">
                                    {categories.map((category) => <button key={category} type="button" onClick={() => setCategoryFilter(category)} className={cn('shrink-0 border-b pb-2 text-xs transition-colors sm:text-sm', categoryFilter === category ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{category === 'all' ? 'All Projects' : category}</button>)}
                                </nav>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[420px]">
                            <label className="relative block"><Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search projects..." className="w-full border-b border-foreground/10 bg-transparent py-3 pl-7 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground lg:min-w-[320px]" /></label>
                            <div className="grid grid-cols-3 rounded-xl border border-foreground/10 p-1">{(['all', 'ongoing', 'completed'] as FilterType[]).map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={cn('min-w-0 rounded-lg px-2 py-2 text-[11px] font-medium capitalize transition-colors sm:px-4 sm:text-sm', statusFilter === filter ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>{filter}</button>)}</div>
                        </div>
                    </div>
                </header>

                <section aria-label="Projects list" className="border-t border-foreground/10">{filteredProjects.length > 0 ? filteredProjects.map((project, index) => <ProjectListItem key={project.id} project={project} index={index} onClick={() => router.push(`/projects/${project.slug}`)} />) : <div className="py-20 text-center"><p className="text-lg font-medium text-foreground">No projects found</p><p className="mt-2 text-sm text-muted-foreground">Try another search term or filter.</p></div>}</section>
            </section>
        </main>
    );
}
