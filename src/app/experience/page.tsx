import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { ExperiencePageClient } from '@/components/experience/ExperiencePageClient';

export const revalidate = 60;

export default async function ExperiencePage() {
    const configPage = await prisma.page.findUnique({
        where: { slug: '__experience-config' },
        select: { content: true },
    }).catch(() => null);

    const content = normalizeExperienceContent(configPage?.content);
    return <ExperiencePageClient content={content} />;
}
