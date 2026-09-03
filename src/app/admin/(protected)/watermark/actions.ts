'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CONTENT_WATERMARK_CONFIG_SLUG, normalizeContentWatermarkSettings } from '@/lib/content-watermark';

export type ContentWatermarkSaveResult = {
    ok: boolean;
    message: string;
    savedAt?: string;
};

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

export async function saveContentWatermark(form: FormData): Promise<ContentWatermarkSaveResult> {
    try {
        await requireEditor();
        const settings = normalizeContentWatermarkSettings({
            enabled: form.get('enabled') === 'on',
            text: String(form.get('text') ?? '').trim(),
            opacity: Number(form.get('opacity') ?? 0.35),
            position: String(form.get('position') ?? 'bottom-right'),
            size: String(form.get('size') ?? 'small'),
        });

        const saved = await prisma.page.upsert({
            where: { slug: CONTENT_WATERMARK_CONFIG_SLUG },
            update: {
                title: 'Blog and Projects watermark',
                status: 'DRAFT',
                content: settings as unknown as Prisma.InputJsonValue,
            },
            create: {
                slug: CONTENT_WATERMARK_CONFIG_SLUG,
                title: 'Blog and Projects watermark',
                status: 'DRAFT',
                content: settings as unknown as Prisma.InputJsonValue,
            },
            select: { updatedAt: true },
        });

        revalidatePath('/admin/watermark');
        revalidatePath('/blog');
        revalidatePath('/projects');

        return {
            ok: true,
            message: settings.enabled ? 'Global Blog + Projects watermark saved.' : 'Global Blog + Projects watermark disabled.',
            savedAt: saved.updatedAt.toISOString(),
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Watermark settings could not be saved.',
        };
    }
}
