import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const content = normalizeHomepageContent(settings?.homepageContent);

    return <HomeClient content={content} />;
}
