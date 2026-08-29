'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeAssistantSettings } from '@/lib/assistant-settings';
import {
    mergeAssistantPrivateFields,
    toAssistantSettingsJson,
    withAssistantApiKey,
} from '@/lib/assistant-credentials';

function parseJson(value: FormDataEntryValue | null, fallback: unknown) {
    try { return JSON.parse(String(value ?? '')) as unknown; } catch { return fallback; }
}

async function requireAssistantAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function publicSettingsRecord(settings: ReturnType<typeof normalizeAssistantSettings>) {
    return { ...settings } as Record<string, unknown>;
}

export async function updateAssistantSettings(form: FormData) {
    let destination = '/admin/assistant?saved=1';
    try {
        await requireAssistantAdmin();
        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { assistantSettings: true },
        });
        const current = normalizeAssistantSettings(existing?.assistantSettings);
        const responseTemplates = parseJson(form.get('responseTemplates'), current.responseTemplates);

        const settings = normalizeAssistantSettings({
            ...current,
            enabled: form.has('enabled'),
            assistantName: String(form.get('assistantName') || current.assistantName),
            headerSubtitle: String(form.get('headerSubtitle') || current.headerSubtitle),
            welcomeMessage: String(form.get('welcomeMessage') || current.welcomeMessage),
            inputPlaceholder: String(form.get('inputPlaceholder') || current.inputPlaceholder),
            extraInstructions: String(form.get('extraInstructions') || ''),
            responseTemplates,
            // Quick replies are now the single source of truth for chat suggestions.
            suggestedQuestions: Array.isArray(responseTemplates)
                ? responseTemplates
                    .filter((item): item is { enabled?: boolean; triggers?: unknown[] } => Boolean(item && typeof item === 'object'))
                    .filter((item) => item.enabled !== false)
                    .map((item) => String(item.triggers?.[0] || '').trim())
                    .filter(Boolean)
                : current.suggestedQuestions,
            // Legacy proactive messages are intentionally disabled in the simplified flow.
            proactiveEnabled: false,
        });

        const merged = mergeAssistantPrivateFields(existing?.assistantSettings, publicSettingsRecord(settings));
        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', assistantSettings: toAssistantSettingsJson(merged) },
            update: { assistantSettings: toAssistantSettingsJson(merged) },
        });
        revalidatePath('/admin/assistant');
        revalidatePath('/', 'layout');
        revalidatePath('/api/chat');
    } catch (error) {
        destination = `/admin/assistant?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unable to save assistant settings.')}`;
    }
    redirect(destination);
}

type IntegrationProvider = 'openai' | 'groq' | 'gemini' | 'openrouter';
type IntegrationInput = { provider: IntegrationProvider; model: string; apiKey: string; clearApiKey: boolean };

export async function saveAssistantIntegration(input: IntegrationInput): Promise<{ ok: boolean; message: string }> {
    try {
        await requireAssistantAdmin();
        const provider: IntegrationProvider = ['openai', 'groq', 'gemini', 'openrouter'].includes(input.provider) ? input.provider : 'openrouter';
        const model = String(input.model || '').trim().slice(0, 160);
        const apiKey = String(input.apiKey || '').trim().slice(0, 1000);
        if (!model) return { ok: false, message: 'Choose or enter a model before saving the integration.' };

        const existing = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { assistantSettings: true } });
        const current = normalizeAssistantSettings(existing?.assistantSettings);
        let openaiModel = current.openaiModel;
        let groqModel = current.groqModel;
        let geminiModel = current.geminiModel;
        let openaiPriority = 100;
        let groqPriority = 100;
        let geminiPriority = 100;
        let customProviders = current.customProviders.filter((item) => item.id === 'openrouter').map((item) => ({ ...item, priority: 100, enabled: true }));

        if (provider === 'openai') {
            openaiModel = model;
            openaiPriority = 0;
        } else if (provider === 'groq') {
            groqModel = model;
            groqPriority = 0;
        } else if (provider === 'gemini') {
            geminiModel = model;
            geminiPriority = 0;
        } else {
            const previous = customProviders.find((item) => item.id === 'openrouter');
            customProviders = [{
                id: 'openrouter',
                name: 'OpenRouter',
                enabled: true,
                baseUrl: 'https://openrouter.ai/api/v1',
                model,
                apiKeyEnv: 'OPENROUTER_API_KEY',
                priority: 0,
                timeoutMs: previous?.timeoutMs ?? 20_000,
            }];
        }

        const nextSettings = normalizeAssistantSettings({
            ...current,
            openaiModel,
            groqModel,
            geminiModel,
            openaiPriority,
            groqPriority,
            geminiPriority,
            customProviders,
        });
        const merged = withAssistantApiKey(existing?.assistantSettings, publicSettingsRecord(nextSettings), provider, apiKey, Boolean(input.clearApiKey));

        await prisma.siteSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', assistantSettings: toAssistantSettingsJson(merged) },
            update: { assistantSettings: toAssistantSettingsJson(merged) },
        });
        revalidatePath('/admin/assistant');
        revalidatePath('/', 'layout');
        revalidatePath('/api/chat');

        const keyMessage = input.clearApiKey
            ? ' Stored CMS API key removed.'
            : apiKey
                ? ' API key encrypted and stored.'
                : ' Existing API key kept unchanged.';
        return { ok: true, message: `${provider === 'openrouter' ? 'OpenRouter' : provider} selected for free-form questions using ${model}.${keyMessage}` };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to save AI integration.' };
    }
}
