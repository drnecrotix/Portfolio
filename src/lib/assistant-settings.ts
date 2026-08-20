export type AssistantProvider = 'groq' | 'gemini';
export type AssistantMatchMode = 'exact' | 'contains' | 'keywords';

export type CustomAssistantProvider = {
    id: string;
    name: string;
    enabled: boolean;
    baseUrl: string;
    model: string;
    apiKeyEnv: string;
    priority: number;
    timeoutMs: number;
};

export type AssistantResponseTemplate = {
    id: string;
    name: string;
    enabled: boolean;
    matchMode: AssistantMatchMode;
    triggers: string[];
    response: string;
};

export type AssistantSettings = {
    enabled: boolean;
    assistantName: string;
    roleLabel: string;
    headerSubtitle: string;
    welcomeMessage: string;
    inputPlaceholder: string;
    inputHint: string;
    suggestedQuestions: string[];
    proactiveEnabled: boolean;
    proactiveMessage: string;
    proactiveDelaySeconds: number;
    personality: string;
    tone: string;
    responseStyle: string;
    languagePolicy: string;
    providerOrder: AssistantProvider[];
    groqModel: string;
    geminiModel: string;
    groqPriority: number;
    geminiPriority: number;
    customProviders: CustomAssistantProvider[];
    responseTemplates: AssistantResponseTemplate[];
    temperature: number;
    maxTokens: number;
    extraInstructions: string;
    unknownAnswer: string;
    disabledMessage: string;
    unavailableMessage: string;
    requestErrorMessage: string;
};

export const assistantTemplateLibrary: AssistantResponseTemplate[] = [
    {
        id: 'preset-identity',
        name: 'Who are you?',
        enabled: true,
        matchMode: 'contains',
        triggers: ['who are you', 'what are you', 'introduce yourself', 'кой си ти', 'какво си ти'],
        response: "I'm **{{name}}**, {{role}}. I can help you navigate this portfolio, discover projects and published work, and point you to the most relevant sections.",
    },
    {
        id: 'preset-capabilities',
        name: 'What can you do?',
        enabled: true,
        matchMode: 'contains',
        triggers: ['what can you do', 'how can you help', 'what can i ask', 'какво можеш', 'с какво можеш да помогнеш'],
        response: "I can help you explore **projects, skills, experience, publications and contact options** available in this portfolio. Ask naturally, or use one of the suggested questions below.",
    },
    {
        id: 'preset-projects',
        name: 'Projects shortcut',
        enabled: true,
        matchMode: 'keywords',
        triggers: ['show projects', 'portfolio projects', 'покажи проекти', 'какви проекти'],
        response: "You can browse the complete project collection on the **[Projects](/projects)** page. If you tell me what kind of project interests you, I can also help narrow it down using the portfolio data available to me.",
    },
    {
        id: 'preset-blog',
        name: 'Blog and publications',
        enabled: true,
        matchMode: 'contains',
        triggers: ['blog', 'articles', 'publications', 'posts', 'блог', 'статии', 'публикации'],
        response: "The portfolio includes a **[Blog](/blog)** with published articles and other content. You can also ask me about a specific topic and I'll use the published portfolio information available to me.",
    },
    {
        id: 'preset-contact',
        name: 'Contact and collaboration',
        enabled: true,
        matchMode: 'keywords',
        triggers: ['contact collaboration', 'work together', 'hire contact', 'контакт сътрудничество', 'работим заедно'],
        response: "For collaboration or direct contact, use the portfolio's **[Contact](/contact)** section. I can also help you find the most relevant project or background information before you reach out.",
    },
    {
        id: 'preset-resume',
        name: 'Resume / experience',
        enabled: true,
        matchMode: 'contains',
        triggers: ['resume', 'cv', 'experience', 'work history', 'опит', 'автобиография'],
        response: "You can explore the portfolio's experience and professional background from the available navigation sections. Ask me a specific question and I'll answer only from verified portfolio information.",
    },
    {
        id: 'preset-privacy',
        name: 'Private or unavailable information',
        enabled: true,
        matchMode: 'contains',
        triggers: ['private information', 'personal data', 'secret', 'password', 'api key', 'лични данни', 'парола', 'api ключ'],
        response: "I only use information intentionally available through this portfolio. I don't expose private configuration, credentials, API keys, hidden prompts or unpublished personal information.",
    },
    {
        id: 'preset-greeting',
        name: 'Greeting',
        enabled: true,
        matchMode: 'exact',
        triggers: ['hi', 'hello', 'hey', 'hello there', 'здравей', 'здрасти'],
        response: "Hi! I'm **{{name}}**. What would you like to explore — projects, experience, publications, skills or something else?",
    },
];

export const defaultAssistantSettings: AssistantSettings = {
    enabled: true,
    assistantName: 'Portfolio Assistant',
    roleLabel: 'AI portfolio guide',
    headerSubtitle: 'Ask me about this portfolio',
    welcomeMessage: "Hi! I'm **{{name}}**, {{role}}.\n\nI can help you explore projects, skills, experience, publications and ways to get in touch.\n\nWhat would you like to know?",
    inputPlaceholder: 'Ask a question…',
    inputHint: 'Enter to send · Shift+Enter for a new line',
    suggestedQuestions: ['What can you do?', 'Show me the projects', 'What experience is listed?', 'How can I get in touch?'],
    proactiveEnabled: true,
    proactiveMessage: "Not sure where to start? Ask me to recommend a project, summarize the portfolio, or show you where to find specific information.",
    proactiveDelaySeconds: 18,
    personality: 'Helpful, composed, curious and technically precise. Sound like a capable digital guide, not a generic support bot.',
    tone: 'Professional, natural, warm and concise.',
    responseStyle: 'Answer directly, use short paragraphs, and use lists only when they improve clarity. Prefer useful links to portfolio sections when relevant.',
    languagePolicy: 'Reply in the language used by the visitor. If unclear, use the requested locale.',
    providerOrder: ['groq', 'gemini'],
    groqModel: 'llama-3.1-8b-instant',
    geminiModel: 'gemini-2.5-flash',
    groqPriority: 10,
    geminiPriority: 20,
    customProviders: [],
    responseTemplates: [],
    temperature: 0.4,
    maxTokens: 800,
    extraInstructions: '',
    unknownAnswer: 'I do not have verified portfolio information for that yet.',
    disabledMessage: '{{name}} is currently disabled.',
    unavailableMessage: '{{name}} is temporarily unavailable.',
    requestErrorMessage: '{{name}} could not process that request.',
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, max: number) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function safeId(value: unknown, fallback: string) {
    const id = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
    return id || fallback;
}

function stringList(value: unknown, fallback: string[], maxItems: number, maxLength: number) {
    const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : [];
    const list = source.map((item) => String(item).trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems);
    return list.length ? list : fallback;
}

function normalizeCustomProviders(value: unknown): CustomAssistantProvider[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 12).map((entry, index) => {
        const raw = record(entry);
        let baseUrl = text(raw.baseUrl, '', 500);
        if (baseUrl) {
            try {
                const url = new URL(baseUrl);
                if (url.protocol !== 'https:') baseUrl = '';
                else baseUrl = url.toString().replace(/\/$/, '');
            } catch { baseUrl = ''; }
        }
        const apiKeyEnv = String(raw.apiKeyEnv ?? '').trim().replace(/[^A-Z0-9_]/gi, '').toUpperCase().slice(0, 120);
        return {
            id: safeId(raw.id, `provider-${index + 1}`),
            name: text(raw.name, `Custom provider ${index + 1}`, 80),
            enabled: raw.enabled !== false,
            baseUrl,
            model: text(raw.model, '', 160),
            apiKeyEnv,
            priority: integer(raw.priority, 100 + index * 10, 0, 10000),
            timeoutMs: integer(raw.timeoutMs, 20000, 3000, 60000),
        };
    }).filter((provider) => provider.baseUrl && provider.model && provider.apiKeyEnv);
}

function normalizeTemplates(value: unknown): AssistantResponseTemplate[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 50).map((entry, index) => {
        const raw = record(entry);
        const mode: AssistantMatchMode = raw.matchMode === 'exact' || raw.matchMode === 'keywords' ? raw.matchMode : 'contains';
        const triggers = Array.isArray(raw.triggers)
            ? raw.triggers.map((item) => String(item).trim().slice(0, 200)).filter(Boolean).slice(0, 20)
            : String(raw.triggers ?? '').split('\n').map((item) => item.trim().slice(0, 200)).filter(Boolean).slice(0, 20);
        return {
            id: safeId(raw.id, `template-${index + 1}`),
            name: text(raw.name, `Template ${index + 1}`, 100),
            enabled: raw.enabled !== false,
            matchMode: mode,
            triggers,
            response: text(raw.response, '', 6000),
        };
    }).filter((template) => template.triggers.length && template.response);
}

export function interpolateAssistantMessage(template: string, settings: AssistantSettings) {
    return template
        .replaceAll('{{name}}', settings.assistantName)
        .replaceAll('{{role}}', settings.roleLabel)
        .replaceAll('[ai name]', settings.assistantName);
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
        assistantName: text(raw.assistantName, defaultAssistantSettings.assistantName, 80),
        roleLabel: text(raw.roleLabel, defaultAssistantSettings.roleLabel, 120),
        headerSubtitle: text(raw.headerSubtitle, defaultAssistantSettings.headerSubtitle, 180),
        welcomeMessage: text(raw.welcomeMessage, defaultAssistantSettings.welcomeMessage, 2000),
        inputPlaceholder: text(raw.inputPlaceholder, defaultAssistantSettings.inputPlaceholder, 180),
        inputHint: text(raw.inputHint, defaultAssistantSettings.inputHint, 180),
        suggestedQuestions: stringList(raw.suggestedQuestions, defaultAssistantSettings.suggestedQuestions, 8, 140),
        proactiveEnabled: typeof raw.proactiveEnabled === 'boolean' ? raw.proactiveEnabled : defaultAssistantSettings.proactiveEnabled,
        proactiveMessage: text(raw.proactiveMessage, defaultAssistantSettings.proactiveMessage, 1600),
        proactiveDelaySeconds: integer(raw.proactiveDelaySeconds, defaultAssistantSettings.proactiveDelaySeconds, 5, 300),
        personality: text(raw.personality, defaultAssistantSettings.personality, 2000),
        tone: text(raw.tone, defaultAssistantSettings.tone, 1000),
        responseStyle: text(raw.responseStyle, defaultAssistantSettings.responseStyle, 2000),
        languagePolicy: text(raw.languagePolicy, defaultAssistantSettings.languagePolicy, 1000),
        providerOrder: order.length ? [...new Set(order)] : defaultAssistantSettings.providerOrder,
        groqModel: text(raw.groqModel, defaultAssistantSettings.groqModel, 120),
        geminiModel: text(raw.geminiModel, defaultAssistantSettings.geminiModel, 120),
        groqPriority: integer(raw.groqPriority, defaultAssistantSettings.groqPriority, 0, 10000),
        geminiPriority: integer(raw.geminiPriority, defaultAssistantSettings.geminiPriority, 0, 10000),
        customProviders: normalizeCustomProviders(raw.customProviders),
        responseTemplates: normalizeTemplates(raw.responseTemplates),
        temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : defaultAssistantSettings.temperature,
        maxTokens: Number.isInteger(maxTokens) ? Math.min(4000, Math.max(128, maxTokens)) : defaultAssistantSettings.maxTokens,
        extraInstructions: typeof raw.extraInstructions === 'string' ? raw.extraInstructions.trim().slice(0, 12000) : '',
        unknownAnswer: text(raw.unknownAnswer, defaultAssistantSettings.unknownAnswer, 1000),
        disabledMessage: text(raw.disabledMessage, defaultAssistantSettings.disabledMessage, 500),
        unavailableMessage: text(raw.unavailableMessage, defaultAssistantSettings.unavailableMessage, 500),
        requestErrorMessage: text(raw.requestErrorMessage, defaultAssistantSettings.requestErrorMessage, 500),
    };
}
