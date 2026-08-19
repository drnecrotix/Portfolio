'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, keywordsFromForm, type SeoDefaults } from '@/lib/seo-settings';
import { safeCmsMediaUrl } from '@/lib/sanitize-cms-html';

function value(form: FormData, key: keyof SeoDefaults, max: number) {
    const result = String(form.get(key) ?? '').trim();
    if (result.length > max) throw new Error(`${String(key)} is too long.`);
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

export async function updateSeoSettings(form: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

    const locale = value(form, 'locale', 20) || defaultSeoDefaults.locale;
    if (!/^[a-zA-Z]{2,3}(?:[-_][a-zA-Z]{2,8})?$/.test(locale)) throw new Error('SEO locale is invalid.');

    const twitterCreator = value(form, 'twitterCreator', 32);
    if (twitterCreator && !/^@[A-Za-z0-9_]{1,15}$/.test(twitterCreator)) {
        throw new Error('Twitter/X creator must be a valid @handle.');
    }

    const googleVerification = value(form, 'googleVerification', 256);
    if (/[<>\s]/.test(googleVerification)) throw new Error('Google verification token is invalid.');

    const seoDefaults: SeoDefaults = {
        titleDefault: value(form, 'titleDefault', 120) || defaultSeoDefaults.titleDefault,
        titleTemplate: value(form, 'titleTemplate', 160) || defaultSeoDefaults.titleTemplate,
        description: value(form, 'description', 320) || defaultSeoDefaults.description,
        keywords: safeKeywords(form),
        authorName: value(form, 'authorName', 120) || defaultSeoDefaults.authorName,
        creatorName: value(form, 'creatorName', 120) || defaultSeoDefaults.creatorName,
        locale,
        ogTitle: value(form, 'ogTitle', 120) || defaultSeoDefaults.ogTitle,
        ogDescription: value(form, 'ogDescription', 320) || defaultSeoDefaults.ogDescription,
        ogImage: safeCmsMediaUrl(value(form, 'ogImage', 2048)),
        twitterTitle: value(form, 'twitterTitle', 120) || defaultSeoDefaults.twitterTitle,
        twitterDescription: value(form, 'twitterDescription', 320) || defaultSeoDefaults.twitterDescription,
        twitterImage: safeCmsMediaUrl(value(form, 'twitterImage', 2048)),
        twitterCreator,
        indexSite: form.get('indexSite') === 'on',
        followLinks: form.get('followLinks') === 'on',
        googleVerification,
    };

    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', seoDefaults },
        update: { seoDefaults },
    });

    revalidatePath('/admin/seo');
    revalidatePath('/', 'layout');
}
