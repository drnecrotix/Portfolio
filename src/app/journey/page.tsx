import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { ExperiencePageClient } from '@/components/experience/ExperiencePageClient';

const CONFIG_SLUG = '__experience-config';
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
    const configPage = await prisma.page.findUnique({
        where: { slug: CONFIG_SLUG },
        select: { content: true },
    }).catch(() => null);

    const content = normalizeExperienceContent(configPage?.content);
    return <ExperiencePageClient content={content} />;
}
