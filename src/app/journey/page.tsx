import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { entryIsPublic, normalizeJourneyEntryState } from '@/lib/journey-entry-state';
import { ExperiencePageClient } from '@/components/experience/ExperiencePageClient';

const CONFIG_SLUG = '__experience-config';
const ENTRY_STATE_SLUG = '__journey-entry-state';
const LEGACY_PAGE_TITLE = 'Experience page configuration';

export const revalidate = 60;

function pageName(title?: string | null) {
    return title && title !== LEGACY_PAGE_TITLE ? title : 'Journey';
}

export async function generateMetadata(): Promise<Metadata> {
    const configPage = await prisma.page.findUnique({
        where: { slug: CONFIG_SLUG },
        select: { title: true },
    }).catch(() => null);

    return {
        title: pageName(configPage?.title),
        alternates: { canonical: '/journey' },
    };
}

export default async function JourneyPage() {
    const [configPage, entryStatePage] = await Promise.all([
        prisma.page.findUnique({ where: { slug: CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        prisma.page.findUnique({ where: { slug: ENTRY_STATE_SLUG }, select: { content: true } }).catch(() => null),
    ]);

    const content = normalizeExperienceContent(configPage?.content);
    const entryState = normalizeJourneyEntryState(entryStatePage?.content);
    const publicContent = {
        ...content,
        educationEntries: content.educationEntries.filter((item) => entryIsPublic(entryState, 'education', item.id)),
        journeyEntries: content.journeyEntries.filter((item) => entryIsPublic(entryState, 'journey', item.id)),
        experienceEntries: content.experienceEntries.filter((item) => entryIsPublic(entryState, 'experience', item.id)),
    };

    return <ExperiencePageClient content={publicContent} />;
}
