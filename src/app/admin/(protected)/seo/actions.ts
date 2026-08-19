'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, keywordsFromForm, type SeoDefaults } from '@/lib/seo-settings';

function value(form: FormData, key: keyof SeoDefaults) {
    return String(form.get(key) ?? '').trim();
}

export async function updateSeoSettings(form: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

    const seoDefaults: SeoDefaults = {
        titleDefault: value(form, 'titleDefault') || defaultSeoDefaults.titleDefault,
        titleTemplate: value(form, 'titleTemplate') || defaultSeoDefaults.titleTemplate,
        description: value(form, 'description') || defaultSeoDefaults.description,
        keywords: keywordsFromForm(form.get('keywords')),
        authorName: value(form, 'authorName') || defaultSeoDefaults.authorName,
        creatorName: value(form, 'creatorName') || defaultSeoDefaults.creatorName,
        locale: value(form, 'locale') || defaultSeoDefaults.locale,
        ogTitle: value(form, 'ogTitle') || defaultSeoDefaults.ogTitle,
        ogDescription: value(form, 'ogDescription') || defaultSeoDefaults.ogDescription,
        ogImage: value(form, 'ogImage'),
        twitterTitle: value(form, 'twitterTitle') || defaultSeoDefaults.twitterTitle,
        twitterDescription: value(form, 'twitterDescription') || defaultSeoDefaults.twitterDescription,
        twitterImage: value(form, 'twitterImage'),
        twitterCreator: value(form, 'twitterCreator'),
        indexSite: form.get('indexSite') === 'on',
        followLinks: form.get('followLinks') === 'on',
        googleVerification: value(form, 'googleVerification'),
    };

    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', seoDefaults },
        update: { seoDefaults },
    });

    revalidatePath('/admin/seo');
    revalidatePath('/', 'layout');
}
