'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultHomepageContent, type HomepageContent } from '@/lib/homepage-content';
import { safeCmsMediaUrl } from '@/lib/sanitize-cms-html';

function getString(form: FormData, key: keyof HomepageContent, max: number) {
    const value = String(form.get(key) ?? '').trim();
    if (value.length > max) throw new Error(`${String(key)} is too long.`);
    return value;
}

function safeLink(value: string, fallback: string) {
    const raw = value || fallback;
    if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) throw new Error('Invalid homepage link.');
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Homepage links must be local paths or HTTP/HTTPS URLs without embedded credentials.');
    return parsed.toString();
}

export async function updateHomepage(form: FormData) {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

    const homepageContent: HomepageContent = {
        intro: getString(form, 'intro', 320) || defaultHomepageContent.intro,
        lineOne: getString(form, 'lineOne', 80) || defaultHomepageContent.lineOne,
        lineTwoPrefix: getString(form, 'lineTwoPrefix', 40) || defaultHomepageContent.lineTwoPrefix,
        lineTwoSuffix: getString(form, 'lineTwoSuffix', 80) || defaultHomepageContent.lineTwoSuffix,
        lineThreePrefix: getString(form, 'lineThreePrefix', 40) || defaultHomepageContent.lineThreePrefix,
        lineThreeSuffix: getString(form, 'lineThreeSuffix', 80) || defaultHomepageContent.lineThreeSuffix,
        collaboration: getString(form, 'collaboration', 360) || defaultHomepageContent.collaboration,
        workspaceUrl: safeLink(getString(form, 'workspaceUrl', 2048), defaultHomepageContent.workspaceUrl),
        workspaceTooltip: getString(form, 'workspaceTooltip', 120) || defaultHomepageContent.workspaceTooltip,
        assistantTooltip: getString(form, 'assistantTooltip', 120) || defaultHomepageContent.assistantTooltip,
        availabilityLabel: getString(form, 'availabilityLabel', 120) || defaultHomepageContent.availabilityLabel,
        profileTitle: getString(form, 'profileTitle', 160) || defaultHomepageContent.profileTitle,
        profileDescription: getString(form, 'profileDescription', 600) || defaultHomepageContent.profileDescription,
        profileImage: safeCmsMediaUrl(getString(form, 'profileImage', 2048)),
        socialImage: safeCmsMediaUrl(getString(form, 'socialImage', 2048)),
        openGraphImage: safeCmsMediaUrl(getString(form, 'openGraphImage', 2048)),
        twitterImage: safeCmsMediaUrl(getString(form, 'twitterImage', 2048)),
        customMetaTags: getString(form, 'customMetaTags', 12000),
    };

    await prisma.siteSettings.upsert({ where: { id: 'default' }, create: { id: 'default', homepageContent }, update: { homepageContent } });
    revalidatePath('/');
    revalidatePath('/admin/homepage');
}
