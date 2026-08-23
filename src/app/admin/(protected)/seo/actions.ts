'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, keywordsFromForm, type SeoDefaults, type SeoImagePreview, type SeoReferrerPolicy } from '@/lib/seo-settings';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { safeCmsMediaUrl } from '@/lib/sanitize-cms-html';

function value(form: FormData, key: keyof SeoDefaults, max: number) {
    const result = String(form.get(key) ?? '').trim();
    if (result.length > max) throw new Error(`${String(key)} is too long.`);
    return result;
}

function plainValue(form: FormData, key: string, max: number) {
    const result = String(form.get(key) ?? '').trim();
    if (result.length > max) throw new Error(`${key} is too long.`);
    return result;
}

function safeKeywords(form: FormData) {
    const keywords = keywordsFromForm(form.get('keywords'));
    if (keywords.length > 30) throw new Error('A maximum of 30 SEO keywords is allowed.');
    for (const keyword of keywords) {
        if (keyword.length > 80) throw new Error('SEO keywords must be 80 characters or fewer.');
    }
    return keywords;
}

function safeCanonicalUrl(form: FormData) {
    const raw = value(form, 'canonicalUrl', 2048);
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        return parsed.toString();
    } catch {
        throw new Error('Canonical URL must be a valid http(s) URL.');
    }
}

function boundedNumber(form: FormData, key: keyof SeoDefaults, fallback: number) {
    const raw = Number(form.get(key) ?? fallback);
    return Number.isFinite(raw) ? Math.max(-1, Math.min(10000, Math.round(raw))) : fallback;
}

async function requireAdmin() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function revalidatePublicCache() {
    revalidatePath('/', 'layout');
    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath('/projects');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');
    revalidatePath('/robots.txt');
}

export async function purgePublicCache() {
    await requireAdmin();
    revalidatePublicCache();
}

export async function updateSeoSettings(form: FormData) {
    let destination = '/admin/seo?saved=1';

    try {
        await requireAdmin();

        const locale = value(form, 'locale', 20) || defaultSeoDefaults.locale;
        if (!/^[a-zA-Z]{2,3}(?:[-_][a-zA-Z]{2,8})?$/.test(locale)) throw new Error('SEO locale is invalid.');

        const twitterCreator = value(form, 'twitterCreator', 32);
        if (twitterCreator && !/^@[A-Za-z0-9_]{1,15}$/.test(twitterCreator)) throw new Error('Twitter/X creator must be a valid @handle.');

        const googleVerification = value(form, 'googleVerification', 256);
        if (/[<>\s]/.test(googleVerification)) throw new Error('Google verification token is invalid.');

        const rssItemLimitRaw = Number(form.get('rssItemLimit') ?? defaultSeoDefaults.rssItemLimit);
        const rssItemLimit = Number.isFinite(rssItemLimitRaw)
            ? Math.min(100, Math.max(1, Math.round(rssItemLimitRaw)))
            : defaultSeoDefaults.rssItemLimit;

        const referrerPolicies: SeoReferrerPolicy[] = ['no-referrer', 'origin', 'no-referrer-when-downgrade', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'];
        const requestedReferrer = String(form.get('referrerPolicy') ?? defaultSeoDefaults.referrerPolicy) as SeoReferrerPolicy;
        const referrerPolicy = referrerPolicies.includes(requestedReferrer) ? requestedReferrer : defaultSeoDefaults.referrerPolicy;
        const imagePreviews: SeoImagePreview[] = ['none', 'standard', 'large'];
        const requestedImagePreview = String(form.get('maxImagePreview') ?? defaultSeoDefaults.maxImagePreview) as SeoImagePreview;
        const maxImagePreview = imagePreviews.includes(requestedImagePreview) ? requestedImagePreview : defaultSeoDefaults.maxImagePreview;

        const seoDefaults: SeoDefaults = {
            titleDefault: value(form, 'titleDefault', 120) || defaultSeoDefaults.titleDefault,
            titleTemplate: value(form, 'titleTemplate', 160) || defaultSeoDefaults.titleTemplate,
            description: value(form, 'description', 320) || defaultSeoDefaults.description,
            keywords: safeKeywords(form),
            authorName: value(form, 'authorName', 120) || defaultSeoDefaults.authorName,
            creatorName: value(form, 'creatorName', 120) || defaultSeoDefaults.creatorName,
            publisherName: value(form, 'publisherName', 120) || defaultSeoDefaults.publisherName,
            applicationName: value(form, 'applicationName', 120) || defaultSeoDefaults.applicationName,
            locale,
            canonicalUrl: safeCanonicalUrl(form),
            referrerPolicy,
            ogTitle: value(form, 'ogTitle', 120) || defaultSeoDefaults.ogTitle,
            ogDescription: value(form, 'ogDescription', 320) || defaultSeoDefaults.ogDescription,
            ogImage: safeCmsMediaUrl(value(form, 'ogImage', 2048)),
            twitterTitle: value(form, 'twitterTitle', 120) || defaultSeoDefaults.twitterTitle,
            twitterDescription: value(form, 'twitterDescription', 320) || defaultSeoDefaults.twitterDescription,
            twitterImage: safeCmsMediaUrl(value(form, 'twitterImage', 2048)),
            twitterCreator,
            indexSite: form.get('indexSite') === 'on',
            followLinks: form.get('followLinks') === 'on',
            noArchive: form.get('noArchive') === 'on',
            noSnippet: form.get('noSnippet') === 'on',
            noImageIndex: form.get('noImageIndex') === 'on',
            noTranslate: form.get('noTranslate') === 'on',
            maxSnippet: boundedNumber(form, 'maxSnippet', defaultSeoDefaults.maxSnippet),
            maxImagePreview,
            maxVideoPreview: boundedNumber(form, 'maxVideoPreview', defaultSeoDefaults.maxVideoPreview),
            googleVerification,
            sitemapEnabled: form.get('sitemapEnabled') === 'on',
            sitemapAutoUpdate: form.get('sitemapAutoUpdate') === 'on',
            sitemapIncludeBlog: form.get('sitemapIncludeBlog') === 'on',
            sitemapIncludeProjects: form.get('sitemapIncludeProjects') === 'on',
            sitemapIncludePages: form.get('sitemapIncludePages') === 'on',
            rssEnabled: form.get('rssEnabled') === 'on',
            rssAutoUpdate: form.get('rssAutoUpdate') === 'on',
            rssTitle: value(form, 'rssTitle', 160) || defaultSeoDefaults.rssTitle,
            rssDescription: value(form, 'rssDescription', 320) || defaultSeoDefaults.rssDescription,
            rssItemLimit,
            rssIncludeProjects: form.get('rssIncludeProjects') === 'on',
        };

        const current = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        const homepage = normalizeHomepageContent(current?.homepageContent);
        const homepageContent = {
            ...homepage,
            socialImage: safeCmsMediaUrl(plainValue(form, 'socialImage', 2048)),
            openGraphImage: '',
            twitterImage: '',
            customMetaTags: plainValue(form, 'customMetaTags', 12000),
        };

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', seoDefaults, homepageContent },
            update: { seoDefaults, homepageContent },
        });

        revalidatePath('/admin/seo');
        revalidatePath('/admin/homepage');
        revalidatePublicCache();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save SEO settings.';
        destination = `/admin/seo?error=${encodeURIComponent(message)}`;
    }

    redirect(destination);
}
