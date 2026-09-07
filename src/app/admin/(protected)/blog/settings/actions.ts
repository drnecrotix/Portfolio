'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultBlogSettings, normalizeBlogSettings, withBlogSettingsInSiteEnvelope } from '@/lib/blog-settings';

function field(form: FormData, key: string, max = 500) {
    return String(form.get(key) ?? '').trim().slice(0, max);
}

export async function updateBlogSettings(form: FormData) {
    let destination = '/admin/blog/settings?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

        const titleEffect = field(form, 'titleEffect', 20);
        const rotationIntervalMs = Math.min(10_000, Math.max(1_200, Number(form.get('rotationIntervalMs')) || defaultBlogSettings.rotationIntervalMs));
        const next = normalizeBlogSettings({
            eyebrow: field(form, 'eyebrow', 120),
            title: field(form, 'title', 180),
            subtitle: field(form, 'subtitle', 320),
            titleEffect,
            rotatingEnabled: form.get('rotatingEnabled') === 'on',
            titlePrefix: field(form, 'titlePrefix', 120),
            rotatingWords: Array.from({ length: 8 }, (_, index) => field(form, `rotatingWord${index}`, 100)).filter(Boolean),
            titleSuffix: field(form, 'titleSuffix', 40),
            rotationIntervalMs,
        });

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { integrationSettings: true },
        });
        const envelope = JSON.parse(JSON.stringify(withBlogSettingsInSiteEnvelope(existing?.integrationSettings, next))) as Prisma.InputJsonValue;

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', integrationSettings: envelope },
            update: { integrationSettings: envelope },
        });

        revalidatePath('/blog');
        revalidatePath('/admin/blog');
        revalidatePath('/admin/blog/settings');
    } catch (error) {
        destination = `/admin/blog/settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save Blog settings.')}`;
    }
    redirect(destination);
}
