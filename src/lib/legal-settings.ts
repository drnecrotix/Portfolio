import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export type LegalIdentity = {
    siteName: string;
    controllerName: string;
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
    const siteName = settings.siteName || 'NecrotixLab';
    return {
        siteName,
        controllerName: process.env.LEGAL_CONTROLLER_NAME?.trim() || siteName,
        siteUrl: settings.contactDetails.website || getPublicSiteUrl(),
        contactEmail: process.env.PRIVACY_CONTACT_EMAIL?.trim() || settings.contactDetails.email,
        location: process.env.LEGAL_CONTROLLER_LOCATION?.trim() || settings.contactDetails.location || 'Bulgaria',
    };
}
