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

type IntegrationInput = {
    provider: IntegrationProvider;
    model: string;
    apiKey: string;
    clearApiKey: boolean;
};

export async function saveAssistantIntegration(input: IntegrationInput): Promise<{ ok: boolean; message: string }> {
    try {
        await requireAssistantAdmin();

        const provider: IntegrationProvider = ['openai', 'groq', 'gemini', 'openrouter'].includes(input.provider)
            ? input.provider
            : 'openrouter';
        const model = String(input.model || '').trim().slice(0, 160);
        const apiKey = String(input.apiKey || '').trim().slice(0, 1000);
        if (!model) return { ok: false, message: 'Choose or enter a model before saving the integration.' };

        const existing = await prisma.siteSettings.findUnique({
            where: { id: 'default' },
            select: { assistantSettings: true },
        });
        const settings = normalizeAssistantSettings(existing?.assistantSettings);
        let openaiPriority = settings.openaiPriority;
        let groqPriority = settings.groqPriority;
        let geminiPriority = settings.geminiPriority;
        let openaiModel = settings.openaiModel;
        let groqModel = settings.groqModel;
        let geminiModel = settings.geminiModel;
        let customProviders = settings.customProviders.map((item) => ({ ...item }));

        const ensureFallbackPriorities = () => {
            if (openaiPriority <= 0) openaiPriority = 10;
            if (groqPriority <= 0) groqPriority = 20;
            if (geminiPriority <= 0) geminiPriority = 30;
            customProviders = customProviders.map((item) => item.id === 'openrouter' && item.priority <= 0 ? { ...item, priority: 40 } : item);
        };

        ensureFallbackPriorities();

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
            const existingOpenRouter = customProviders.find((item) => item.id === 'openrouter');
            const openRouter = {
                id: 'openrouter',
                name: 'OpenRouter',
                enabled: true,
                baseUrl: 'https://openrouter.ai/api/v1',
                model,
                apiKeyEnv: 'OPENROUTER_API_KEY',
                priority: 0,
                timeoutMs: existingOpenRouter?.timeoutMs ?? 20_000,
            };
            customProviders = existingOpenRouter
                ? customProviders.map((item) => item.id === 'openrouter' ? openRouter : item)
                : [...customProviders, openRouter];
        }

        const nextSettings = normalizeAssistantSettings({
            ...settings,
            openaiModel,
            groqModel,
            geminiModel,
            openaiPriority,
            groqPriority,
            geminiPriority,
            customProviders,
        });
        const merged = withAssistantApiKey(
            existing?.assistantSettings,
            publicSettingsRecord(nextSettings),
            provider,
            apiKey,
            Boolean(input.clearApiKey),
        );

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
        return { ok: true, message: `${provider === 'openrouter' ? 'OpenRouter' : provider} is now the first AI provider using ${model}.${keyMessage}` };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Unable to save AI integration.' };
    }
}
