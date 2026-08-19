'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultHomepageContent, type HomepageContent } from '@/lib/homepage-content';

function getString(form: FormData, key: keyof HomepageContent) {
    return String(form.get(key) ?? '').trim();
}

export async function updateHomepage(form: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const homepageContent: HomepageContent = {
        intro: getString(form, 'intro') || defaultHomepageContent.intro,
        lineOne: getString(form, 'lineOne') || defaultHomepageContent.lineOne,
        lineTwoPrefix: getString(form, 'lineTwoPrefix') || defaultHomepageContent.lineTwoPrefix,
        lineTwoSuffix: getString(form, 'lineTwoSuffix') || defaultHomepageContent.lineTwoSuffix,
        lineThreePrefix: getString(form, 'lineThreePrefix') || defaultHomepageContent.lineThreePrefix,
        lineThreeSuffix: getString(form, 'lineThreeSuffix') || defaultHomepageContent.lineThreeSuffix,
        collaboration: getString(form, 'collaboration') || defaultHomepageContent.collaboration,
        locationLabel: getString(form, 'locationLabel') || defaultHomepageContent.locationLabel,
        yearLabel: getString(form, 'yearLabel') || defaultHomepageContent.yearLabel,
        resumeLabel: getString(form, 'resumeLabel') || defaultHomepageContent.resumeLabel,
        resumeHref: getString(form, 'resumeHref') || defaultHomepageContent.resumeHref,
        workspaceUrl: getString(form, 'workspaceUrl') || defaultHomepageContent.workspaceUrl,
        workspaceTooltip: getString(form, 'workspaceTooltip') || defaultHomepageContent.workspaceTooltip,
        assistantTooltip: getString(form, 'assistantTooltip') || defaultHomepageContent.assistantTooltip,
        availabilityLabel: getString(form, 'availabilityLabel') || defaultHomepageContent.availabilityLabel,
        profileTitle: getString(form, 'profileTitle') || defaultHomepageContent.profileTitle,
        profileDescription: getString(form, 'profileDescription') || defaultHomepageContent.profileDescription,
        profileImage: getString(form, 'profileImage'),
    };

    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', homepageContent },
        update: { homepageContent },
    });

    revalidatePath('/');
    revalidatePath('/admin/homepage');
}
