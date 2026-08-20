export type AssistantProvider = 'groq' | 'gemini';

export type AssistantSettings = {
    enabled: boolean;
    assistantName: string;
    providerOrder: AssistantProvider[];
    groqModel: string;
    geminiModel: string;
    temperature: number;
    maxTokens: number;
    extraInstructions: string;
};

export const defaultAssistantSettings: AssistantSettings = {
    enabled: true,
    assistantName: 'Portfolio Assistant',
    providerOrder: ['groq', 'gemini'],
    groqModel: 'llama-3.1-8b-instant',
    geminiModel: 'gemini-2.5-flash',
    temperature: 0.4,
    maxTokens: 800,
    extraInstructions: '',
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeAssistantSettings(value: unknown): AssistantSettings {
    const raw = record(value);
    const order = Array.isArray(raw.providerOrder)
        ? raw.providerOrder.filter((item): item is AssistantProvider => item === 'groq' || item === 'gemini')
        : defaultAssistantSettings.providerOrder;

    const temperature = Number(raw.temperature);
    const maxTokens = Number(raw.maxTokens);

    return {
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaultAssistantSettings.enabled,
        assistantName: typeof raw.assistantName === 'string' && raw.assistantName.trim()
            ? raw.assistantName.trim().slice(0, 80)
            : defaultAssistantSettings.assistantName,
        providerOrder: order.length ? [...new Set(order)] : defaultAssistantSettings.providerOrder,
        groqModel: typeof raw.groqModel === 'string' && raw.groqModel.trim()
            ? raw.groqModel.trim().slice(0, 120)
            : defaultAssistantSettings.groqModel,
        geminiModel: typeof raw.geminiModel === 'string' && raw.geminiModel.trim()
            ? raw.geminiModel.trim().slice(0, 120)
            : defaultAssistantSettings.geminiModel,
        temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : defaultAssistantSettings.temperature,
        maxTokens: Number.isInteger(maxTokens) ? Math.min(4000, Math.max(128, maxTokens)) : defaultAssistantSettings.maxTokens,
        extraInstructions: typeof raw.extraInstructions === 'string' ? raw.extraInstructions.trim().slice(0, 6000) : '',
    };
}
