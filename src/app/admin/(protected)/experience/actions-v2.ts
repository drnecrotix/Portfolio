'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeJourneyEntryState } from '@/lib/journey-entry-state';
import { updateExperiencePage, type ExperienceSaveResult } from './actions';

const ENTRY_STATE_SLUG = '__journey-entry-state';

export async function updateJourneyManager(form: FormData): Promise<ExperienceSaveResult> {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        return { ok: false, error: 'You do not have permission to edit the Journey page.' };
    }

    const result = await updateExperiencePage(form);
    if (!result.ok) return result;

    try {
        const raw = String(form.get('entryStatesJson') ?? '').trim();
        const state = normalizeJourneyEntryState(raw ? JSON.parse(raw) : {});
        await prisma.page.upsert({
            where: { slug: ENTRY_STATE_SLUG },
            create: {
                slug: ENTRY_STATE_SLUG,
                title: 'Journey entry state',
                status: 'PUBLISHED',
                content: state as unknown as Prisma.InputJsonValue,
            },
            update: {
                status: 'PUBLISHED',
                content: state as unknown as Prisma.InputJsonValue,
            },
        });
        revalidatePath('/journey');
        revalidatePath('/admin/experience');
        return result;
    } catch (error) {
        console.error('Failed to save Journey entry state', error);
        return { ok: false, error: 'The Journey content was saved, but its bulk visibility state could not be saved. Please retry.' };
    }
}
