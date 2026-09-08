'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function requireAdministrator() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

export async function updateFootprintSettings(form: FormData) {
    let destination = '/admin/digital-footprint?saved=1';
    try {
        await requireAdministrator();
        const botCheckEnabled = form.has('botCheckEnabled');

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const next = {
            ...asRecord(existing?.integrationSettings),
            'footprint.botCheckEnabled': botCheckEnabled,
        } as Prisma.InputJsonValue;

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', integrationSettings: next },
            update: { integrationSettings: next },
        });

        revalidatePath('/digital-footprint');
        revalidatePath('/api/digital-footprint/challenge');
        revalidatePath('/api/digital-footprint/scan');
        revalidatePath('/admin/digital-footprint');
    } catch (error) {
        destination = `/admin/digital-footprint?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save.')}`;
    }
    redirect(destination);
}
