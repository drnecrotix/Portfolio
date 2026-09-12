'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SERVICE_PRICING_CONFIG_SLUG } from '@/modules/service-requests/pricing-settings';
import { SERVICE_PRICING } from '@/modules/service-requests/pricing';
import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';

function number(form: FormData, name: string, optional = false) {
    const raw = String(form.get(name) ?? '').trim();
    if (optional && !raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 50000) throw new Error(`Invalid price in ${name}.`);
    return value;
}

function range(form: FormData, prefix: string, optionalMax = false) {
    const min = number(form, `${prefix}-min`) as number;
    const max = number(form, `${prefix}-max`, optionalMax);
    if (max !== null && max < min) throw new Error(`Maximum price must not be lower than minimum price in ${prefix}.`);
    return { min, max };
}

export async function updateServicePricing(form: FormData) {
    let destination = '/admin/service-pricing?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
        const websiteBuildBase = Object.fromEntries(Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType).map((id) => [id, range(form, id)]));
        const oneOff = Object.fromEntries(SERVICE_PRICING.oneOff.map((item) => [item.id, range(form, `oneoff-${item.id}`, item.priceTo === null)]));
        const monthly = Object.fromEntries(SERVICE_PRICING.monthly.map((item) => [item.id, number(form, `monthly-${item.id}-price`)]));
        const supportOneOff = Object.fromEntries(SERVICE_PRICING.supportOneOff.map((item) => [item.id, range(form, `support-${item.id}`)]));
        const supportMonthly = Object.fromEntries(SERVICE_PRICING.supportMonthly.map((item) => [item.id, number(form, `care-${item.id}-price`)]));
        await prisma.page.upsert({
            where: { slug: SERVICE_PRICING_CONFIG_SLUG },
            create: { slug: SERVICE_PRICING_CONFIG_SLUG, title: 'Service pricing configuration', status: 'DRAFT', content: { websiteBuildBase, oneOff, monthly, supportOneOff, supportMonthly } },
            update: { content: { websiteBuildBase, oneOff, monthly, supportOneOff, supportMonthly } },
        });
        for (const path of ['/services/website', '/services/support', '/services/pricing', '/admin/service-pricing']) revalidatePath(path);
    } catch (error) {
        destination = `/admin/service-pricing?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save pricing.')}`;
    }
    redirect(destination);
}
