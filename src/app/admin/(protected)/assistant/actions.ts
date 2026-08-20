'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';

function parseJson(value: FormDataEntryValue | null, fallback: unknown) {
    try { return JSON.parse(String(value ?? '')) as unknown; } catch { return fallback; }
}

export async function updateAssistantSettings(form: FormData) {
    let destination = '/admin/assistant?saved=1';
    try {
        const session = await auth();
        if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');

        const settings = normalizeAssistantSettings({
            enabled: form.has('enabled'),
            assistantName: String(form.get('assistantName') || ''),
            roleLabel: String(form.get('roleLabel') || ''),
            headerSubtitle: String(form.get('headerSubtitle') || ''),
            welcomeMessage: String(form.get('welcomeMessage') || ''),
            inputPlaceholder: String(form.get('inputPlaceholder') || ''),
            inputHint: String(form.get('inputHint') || ''),
            suggestedQuestions: String(form.get('suggestedQuestions') || '').split('\n'),
            proactiveEnabled: form.has('proactiveEnabled'),
            proactiveMessage: String(form.get('proactiveMessage') || ''),
            proactiveDelaySeconds: Number(form.get('proactiveDelaySeconds')),
            personality: String(form.get('personality') || ''),
            tone: String(form.get('tone') || ''),
            responseStyle: String(form.get('responseStyle') || ''),
            languagePolicy: String(form.get('languagePolicy') || ''),
            providerOrder: ['openai', 'groq', 'gemini'],
            openaiModel: String(form.get('openaiModel') || ''),
            groqModel: String(form.get('groqModel') || ''),
            geminiModel: String(form.get('geminiModel') || ''),
            openaiPriority: Number(form.get('openaiPriority')),
            groqPriority: Number(form.get('groqPriority')),
            geminiPriority: Number(form.get('geminiPriority')),
            customProviders: parseJson(form.get('customProviders'), []),
            responseTemplates: parseJson(form.get('responseTemplates'), []),
            temperature: Number(form.get('temperature')),
            maxTokens: Number(form.get('maxTokens')),
            extraInstructions: String(form.get('extraInstructions') || ''),
            unknownAnswer: String(form.get('unknownAnswer') || ''),
            disabledMessage: String(form.get('disabledMessage') || ''),
            unavailableMessage: String(form.get('unavailableMessage') || ''),
            requestErrorMessage: String(form.get('requestErrorMessage') || ''),
        });

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', assistantSettings: settings },
            update: { assistantSettings: settings },
        });
        revalidatePath('/admin/assistant');
        revalidatePath('/', 'layout');
        revalidatePath('/api/chat');
    } catch (error) {
        destination = `/admin/assistant?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save assistant settings.')}`;
    }
    redirect(destination);
}
