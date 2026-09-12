'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SERVICE_PRICING_CONFIG_SLUG } from '@/modules/service-requests/pricing-settings';
import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';

export async function updateServicePricing(form: FormData) {
    let destination = '/admin/service-pricing?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
        const websiteBuildBase: Record<string, { min: number; max: number }> = {};
        for (const key of Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType)) {
            const min = Number(form.get(`${key}-min`));
            const max = Number(form.get(`${key}-max`));
            if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > 50000) throw new Error(`Invalid range for ${key}.`);
            websiteBuildBase[key] = { min, max };
        }
        await prisma.page.upsert({
            where: { slug: SERVICE_PRICING_CONFIG_SLUG },
            create: { slug: SERVICE_PRICING_CONFIG_SLUG, title: 'Service pricing configuration', status: 'DRAFT', content: { websiteBuildBase } },
            update: { content: { websiteBuildBase } },
        });
        revalidatePath('/services/website');
        revalidatePath('/services/pricing');
        revalidatePath('/admin/service-pricing');
    } catch (error) {
        destination = `/admin/service-pricing?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save pricing.')}`;
    }
    redirect(destination);
}
