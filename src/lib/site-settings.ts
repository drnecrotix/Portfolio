export type SocialSettings = {
    github: string;
    instagram: string;
    linkedin: string;
    twitter: string;
    discord: string;
    spotify: string;
};

export type ContactSettings = {
    email: string;
    formRecipientEmail: string;
    phone: string;
    location: string;
    website: string;
};

export type GeneralSiteSettings = {
    siteName: string;
    siteDescription: string;
    faviconUrl: string;
    defaultTheme: 'dark' | 'light';
    allowDayMode: boolean;
    accentColor: string;
    locale: string;
    timezone: string;
    socialLinks: SocialSettings;
    contactDetails: ContactSettings;
};

export const defaultGeneralSiteSettings: GeneralSiteSettings = {
    siteName: 'Dr Necrotix',
    siteDescription: 'Digital portfolio, publications and creative projects by Dr Necrotix.',
    faviconUrl: '/dr-necrotix-mark.svg',
    defaultTheme: 'dark',
    allowDayMode: true,
    accentColor: '',
    locale: 'en',
    timezone: 'Europe/Sofia',
    socialLinks: {
        github: 'https://github.com/drnecrotix',
        instagram: 'https://instagram.com/dr.necrotix',
        linkedin: '',
        twitter: '',
        discord: '',
        spotify: '',
    },
    contactDetails: {
        email: '',
        formRecipientEmail: '',
        phone: '',
        location: 'Bulgaria',
        website: '',
    },
};

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

export function normalizeGeneralSiteSettings(value?: {
    siteName?: string | null;
    siteDescription?: string | null;
    faviconUrl?: string | null;
    defaultTheme?: string | null;
    allowDayMode?: boolean | null;
    accentColor?: string | null;
    locale?: string | null;
    timezone?: string | null;
    socialLinks?: unknown;
    contactDetails?: unknown;
} | null): GeneralSiteSettings {
    const social = object(value?.socialLinks);
    const contact = object(value?.contactDetails);

    return {
        siteName: value?.siteName || defaultGeneralSiteSettings.siteName,
        siteDescription: value?.siteDescription || defaultGeneralSiteSettings.siteDescription,
        faviconUrl: value?.faviconUrl || defaultGeneralSiteSettings.faviconUrl,
        defaultTheme: value?.defaultTheme === 'light' ? 'light' : 'dark',
        allowDayMode: value?.allowDayMode ?? defaultGeneralSiteSettings.allowDayMode,
        accentColor: value?.accentColor || defaultGeneralSiteSettings.accentColor,
        locale: value?.locale || defaultGeneralSiteSettings.locale,
        timezone: value?.timezone || defaultGeneralSiteSettings.timezone,
        socialLinks: {
            github: text(social.github, defaultGeneralSiteSettings.socialLinks.github),
            instagram: text(social.instagram, defaultGeneralSiteSettings.socialLinks.instagram),
            linkedin: text(social.linkedin),
            twitter: text(social.twitter),
            discord: text(social.discord),
            spotify: text(social.spotify),
        },
        contactDetails: {
            email: text(contact.email),
            formRecipientEmail: text(contact.formRecipientEmail),
            phone: text(contact.phone),
            location: text(contact.location, defaultGeneralSiteSettings.contactDetails.location),
            website: text(contact.website),
        },
    };
}
