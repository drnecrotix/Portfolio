'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';

export async function updateAssistantSettings(form: FormData) {
    let destination = '/admin/assistant?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

        const providerOrder = String(form.get('providerOrder') || 'groq,gemini')
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item === 'groq' || item === 'gemini');

        const settings = normalizeAssistantSettings({
            enabled: form.has('enabled'),
            assistantName: String(form.get('assistantName') || ''),
            providerOrder,
            groqModel: String(form.get('groqModel') || ''),
            geminiModel: String(form.get('geminiModel') || ''),
            temperature: Number(form.get('temperature')),
            maxTokens: Number(form.get('maxTokens')),
            extraInstructions: String(form.get('extraInstructions') || ''),
        });

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', assistantSettings: settings },
            update: { assistantSettings: settings },
        });
        revalidatePath('/admin/assistant');
        revalidatePath('/', 'layout');
    } catch (error) {
        destination = `/admin/assistant?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save assistant settings.')}`;
    }
    redirect(destination);
}
