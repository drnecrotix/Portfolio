import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity, defaultPublicIdentity } from '@/lib/public-identity';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    let rawContent: unknown = null;
    let identity = defaultPublicIdentity;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        rawContent = settings?.homepageContent;
        const homepage = normalizeHomepageContent(rawContent);
        identity = buildPublicIdentity(settings, homepage.profileImage);
    } catch {
        // Keep the protected public hero available even if the CMS database is temporarily unavailable.
    }

    return <HomeClient content={normalizeHomepageContent(rawContent)} identity={identity} />;
}
