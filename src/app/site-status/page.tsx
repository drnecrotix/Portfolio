import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { resolveSiteMode } from '@/lib/site-mode';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';
import { SiteModeExperience } from '@/components/site/SiteModeExperience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    robots: { index: false, follow: false, nocache: true },
};

const defaults = {
    MAINTENANCE: { title: 'Temporarily offline', message: 'The portfolio is being updated. Please check back soon.' },
    COMING_SOON: { title: 'Something new is taking shape', message: 'The portfolio is not public yet, but it will be available soon.' },
    PRIVATE: { title: 'Private access only', message: 'This portfolio is currently restricted. Enter the access password to continue.' },
    ARCHIVE: { title: 'This edition is archived', message: 'The portfolio has been preserved in archive mode and is not currently available for normal browsing.' },
} as const;

type StatusMode = keyof typeof defaults;

export default async function SiteStatusPage() {
    const [settings, rawGeneralSettings] = await Promise.all([
        prisma.siteModeSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    ]);
    const generalSettings = normalizeGeneralSiteSettings(rawGeneralSettings);
    const socialLinks = Object.entries({
        GitHub: generalSettings.socialLinks.github,
        Instagram: generalSettings.socialLinks.instagram,
        LinkedIn: generalSettings.socialLinks.linkedin,
        X: generalSettings.socialLinks.twitter,
        Discord: generalSettings.socialLinks.discord,
        Spotify: generalSettings.socialLinks.spotify,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0);

    const now = new Date();
    const effective = resolveSiteMode(settings, now);
    const mode: StatusMode = ['MAINTENANCE', 'COMING_SOON', 'PRIVATE', 'ARCHIVE'].includes(effective.mode)
        ? effective.mode as StatusMode
        : settings.mode === 'ARCHIVE'
            ? 'ARCHIVE'
            : 'MAINTENANCE';
    const copy = defaults[mode];

    return (
        <SiteModeExperience
            mode={mode}
            template={settings.template || 'hero'}
            title={settings.title || copy.title}
            message={settings.message || copy.message}
            startsAt={settings.startsAt?.toISOString() ?? null}
            endsAt={settings.endsAt?.toISOString() ?? null}
            initialNow={now.getTime()}
            hasPrivatePassword={Boolean(settings.passwordHash)}
            showContact={settings.showContact}
            socialLinks={settings.showSocials ? socialLinks : []}
            siteName={generalSettings.siteName || 'Dr Necrotix'}
        />
    );
}
