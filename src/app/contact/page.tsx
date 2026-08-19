import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { ContactV2 } from '@/components/contact/ContactV2';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
    let settings = normalizeGeneralSiteSettings(null);

    try {
        const raw = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        settings = normalizeGeneralSiteSettings(raw);
    } catch {
        // Keep the contact page available with safe defaults if CMS storage is temporarily unavailable.
    }

    return <ContactV2 contact={settings.contactDetails} socials={settings.socialLinks} />;
}
