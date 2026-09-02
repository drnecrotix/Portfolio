import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStoredAssistantApiKeys } from '@/lib/assistant-credentials';
import { getIntegrationTests, getStoredIntegrationValues } from '@/lib/integration-credentials';
import { ApiIntegrationsManager, type ApiIntegrationCard } from '@/components/admin/ApiIntegrationsManager';

function envConfigured(name: string) {
    return Boolean(String(process.env[name] ?? '').trim());
}

export default async function ApiIntegrationsPage() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { integrationSettings: true, assistantSettings: true },
    });

    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    const assistantKeys = getStoredAssistantApiKeys(settings?.assistantSettings);
    const tests = getIntegrationTests(settings?.integrationSettings);

    const field = (key: string, label: string, envName: string, secret = true, help?: string) => {
        const provider = key.split('.')[0];
        const cms = Boolean(stored[key]);
        const legacyAssistant = key.endsWith('.apiKey') && Boolean(assistantKeys[provider]);
        const environment = envConfigured(envName);
        const source = cms ? 'cms' : legacyAssistant ? 'assistant' : environment ? 'environment' : 'missing';
        return { key, label, envName, secret, configured: source !== 'missing', source, help } as const;
    };

    const cards: ApiIntegrationCard[] = [
        {
            id: 'github',
            name: 'GitHub',
            category: 'Development data',
            description: 'Reads your public GitHub repositories, languages, activity and repository metadata.',
            usedBy: ['The Lab - Used in real work', 'GitHub statistics', 'Language statistics', 'Recent GitHub activity'],
            docsHint: 'Use a GitHub personal access token that can read your public profile and repositories. Public-only access is enough for the Lab proof feature.',
            fields: [field('github.apiKey', 'Personal access token', 'GITHUB_TOKEN', true, 'CMS value overrides GITHUB_TOKEN from the environment.')],
            lastTest: tests.github ?? null,
        },
        {
            id: 'wakatime',
            name: 'WakaTime',
            category: 'Coding metrics',
            description: 'Loads coding time, weekly summaries and activity statistics shown in the portfolio.',
            usedBy: ['WakaTime statistics', 'Coding activity cards'],
            docsHint: 'Create an API key in your WakaTime account settings.',
            fields: [field('wakatime.apiKey', 'API key', 'WAKATIME_API_KEY', true)],
            lastTest: tests.wakatime ?? null,
        },
        {
            id: 'openai',
            name: 'OpenAI',
            category: 'AI provider',
            description: 'Optional AI provider for the public portfolio assistant.',
            usedBy: ['AI Assistant - free-form questions'],
            docsHint: 'The key stored here overrides both the Assistant CMS key and OPENAI_API_KEY.',
            fields: [field('openai.apiKey', 'API key', 'OPENAI_API_KEY', true)],
            lastTest: tests.openai ?? null,
        },
        {
            id: 'groq',
            name: 'Groq',
            category: 'AI provider',
            description: 'Low-latency OpenAI-compatible provider used by the public portfolio assistant.',
            usedBy: ['AI Assistant - free-form questions'],
            docsHint: 'The key stored here overrides both the Assistant CMS key and GROQ_API_KEY.',
            fields: [field('groq.apiKey', 'API key', 'GROQ_API_KEY', true)],
            lastTest: tests.groq ?? null,
        },
        {
            id: 'gemini',
            name: 'Google Gemini',
            category: 'AI provider',
            description: 'Google Gemini provider used as an optional AI backend for the portfolio assistant.',
            usedBy: ['AI Assistant - free-form questions'],
            docsHint: 'The key stored here overrides both the Assistant CMS key and GEMINI_API_KEY.',
            fields: [field('gemini.apiKey', 'API key', 'GEMINI_API_KEY', true)],
            lastTest: tests.gemini ?? null,
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            category: 'AI provider',
            description: 'OpenAI-compatible gateway that can route the assistant to models available through OpenRouter.',
            usedBy: ['AI Assistant - free-form questions'],
            docsHint: 'The key stored here overrides both the Assistant CMS key and OPENROUTER_API_KEY.',
            fields: [field('openrouter.apiKey', 'API key', 'OPENROUTER_API_KEY', true)],
            lastTest: tests.openrouter ?? null,
        },
        {
            id: 'r2',
            name: 'Cloudflare R2',
            category: 'Media storage',
            description: 'Stores managed media uploads in an R2 bucket. If it is unavailable, the site falls back to local uploads where supported.',
            usedBy: ['Media Library uploads', 'Blog media', 'Project media', 'Journey media'],
            docsHint: 'Create an R2 API token with object read/write access to the selected bucket. Public Base URL is the domain used to serve uploaded files.',
            fields: [
                field('r2.accountId', 'Account ID', 'R2_ACCOUNT_ID', false),
                field('r2.accessKeyId', 'Access Key ID', 'R2_ACCESS_KEY_ID', true),
                field('r2.secretAccessKey', 'Secret Access Key', 'R2_SECRET_ACCESS_KEY', true),
                field('r2.bucket', 'Bucket', 'R2_BUCKET', false),
                field('r2.publicBaseUrl', 'Public Base URL', 'R2_PUBLIC_BASE_URL', false, 'Example: https://media.necrotixlab.com'),
            ],
            lastTest: tests.r2 ?? null,
        },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tools</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">API Integrations</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Configure, document and test the external APIs used by the portfolio. Secrets saved here are encrypted before they are stored in PostgreSQL and override environment variables at runtime.
                </p>
            </header>

            <ApiIntegrationsManager cards={cards} />
        </div>
    );
}
