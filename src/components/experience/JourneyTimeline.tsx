'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { Experience } from '@/types';
import type { ExperienceContent } from '@/lib/experience-content';
import { formatDate } from '@/lib/utils';
import { Timeline } from '@/components/ui/timeline';

function logoClasses(logo?: string) {
    const src = logo || '';
    const invertDark = src.includes('McKinsey')
        || src.includes('TelkomUniversity')
        || src.includes('softagelogo')
        || src.includes('dinas-pangan')
        || src.includes('yotlogo')
        || src.includes('youth-ranger')
        || src.includes('aiesec')
        || src.includes('microsot')
        || src.includes('dicoding')
        || src.includes('cisometric');
    const removeWhiteDark = src.includes('logobei') || src.includes('birulangit');
    const invertLight = src.includes('flyrank') || src.includes('FlyRank');

    if (removeWhiteDark) return 'dark:invert dark:hue-rotate-180';
    if (invertDark) return 'dark:invert';
    if (invertLight) return 'invert dark:invert-0';
    return '';
}

export function JourneyTimeline({ content, entries }: { content: ExperienceContent; entries: Experience[] }) {
    const grouped = useMemo(() => {
        const groups: Record<string, Experience[]> = {};
        const sorted = [...entries].sort(
            (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
        );

        for (const experience of sorted) {
            const parsedYear = new Date(experience.startDate).getFullYear();
            const year = Number.isFinite(parsedYear) ? parsedYear.toString() : 'Other';
            if (!groups[year]) groups[year] = [];
            groups[year].push(experience);
        }

        return Object.keys(groups)
            .sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return Number(b) - Number(a);
            })
            .map((year) => ({ title: year, experiences: groups[year] }));
    }, [entries]);

    const data = grouped.map((group) => ({
        title: group.title,
        content: (
            <div className="space-y-12">
                {group.experiences.map((experience) => (
                    <JourneyTimelineEntry key={experience.id} experience={experience} content={content} />
                ))}
            </div>
        ),
    }));

    if (data.length === 0) {
        return <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">{content.emptyState}</div>;
    }

    return <Timeline data={data} />;
}

function JourneyTimelineEntry({ experience, content }: { experience: Experience; content: ExperienceContent }) {
    const specificLogoClasses = logoClasses(experience.logo);

    return (
        <article className="group/timeline relative border-l-2 border-neutral-200 pl-8 dark:border-neutral-800">
            <div className="absolute -left-[9px] top-0 size-4 rounded-full border-2 border-white bg-neutral-200 dark:border-black dark:bg-neutral-800" />

            {experience.logo && (
                <div className="pointer-events-none absolute right-full top-0 mr-6 hidden h-10 w-32 -translate-x-4 items-center justify-end opacity-0 transition-all duration-300 group-hover/timeline:translate-x-0 group-hover/timeline:opacity-100 md:flex md:h-16 md:w-40">
                    <div className="relative size-full">
                        <Image
                            src={experience.logo}
                            alt={`${experience.company} Logo`}
                            fill
                            unoptimized
                            className={`object-contain object-right ${specificLogoClasses}`}
                        />
                    </div>
                </div>
            )}

            <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-xl font-bold leading-tight text-neutral-900 dark:text-white">
                        {experience.position}
                    </h3>
                    <p className="text-lg font-medium text-primary">{experience.company}</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                    <span className="w-fit rounded bg-neutral-100 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                        {experience.startDate ? formatDate(experience.startDate) : 'Undated'} - {experience.endDate ? formatDate(experience.endDate) : experience.isOngoing ? 'Present' : 'Open'}
                    </span>
                </div>
            </div>

            {experience.description && (
                <p className="mb-6 text-justify text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 md:text-base">
                    {experience.description}
                </p>
            )}

            {content.showResponsibilities && experience.responsibilities && experience.responsibilities.length > 0 && (
                <ul className="mb-8 space-y-3">
                    {experience.responsibilities.slice(0, 3).map((responsibility) => (
                        <li key={responsibility} className="flex items-start gap-2.5 text-justify text-xs text-neutral-500 dark:text-neutral-400 md:text-sm">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/40" />
                            <span>{responsibility}</span>
                        </li>
                    ))}
                </ul>
            )}

            {content.showSkills && experience.skills.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-2">
                    {experience.skills.map((skill) => (
                        <span
                            key={skill}
                            className="cursor-default rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-200 hover:text-neutral-900 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
