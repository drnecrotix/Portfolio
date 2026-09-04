import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export type LegalIdentity = {
    siteName: string;
    siteUrl: string;
    contactEmail: string;
    location: string;
};

export async function getLegalIdentity(): Promise<LegalIdentity> {
    let site = null;
    try {
        site = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    } catch {
        // Legal pages must remain available even if the CMS database is temporarily unavailable.
    }

    const settings = normalizeGeneralSiteSettings(site);
    return {
        siteName: settings.siteName || 'NecrotixLab',
        siteUrl: settings.contactDetails.website || getPublicSiteUrl(),
        contactEmail: settings.contactDetails.email,
        location: settings.contactDetails.location || 'Bulgaria',
    };
}
