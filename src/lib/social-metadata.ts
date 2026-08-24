export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

const FALLBACK_SITE_URL = 'https://necrotixlab.com';

export function getPublicSiteUrl() {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;

    try {
        const url = new URL(configured);
        if (!['http:', 'https:'].includes(url.protocol)) return FALLBACK_SITE_URL;
        return url.toString().replace(/\/$/, '');
    } catch {
        return FALLBACK_SITE_URL;
    }
}

export function absoluteSocialMediaUrl(value?: string | null) {
    const source = value?.trim();
    if (!source) return undefined;

    const siteUrl = getPublicSiteUrl();

    try {
        const url = new URL(source, `${siteUrl}/`);
        if (!['http:', 'https:'].includes(url.protocol)) return undefined;

        const site = new URL(siteUrl);
        if (url.hostname === site.hostname && site.protocol === 'https:' && url.protocol === 'http:') {
            url.protocol = 'https:';
        }

        return url.toString();
    } catch {
        return undefined;
    }
}

export function socialImageDescriptor(value: string | undefined, alt: string) {
    if (!value) return undefined;

    return {
        url: value,
        width: SOCIAL_IMAGE_WIDTH,
        height: SOCIAL_IMAGE_HEIGHT,
        alt,
    };
}
