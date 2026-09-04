import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStoredAssistantApiKeys } from '@/lib/assistant-credentials';
import { getIntegrationTests, getStoredIntegrationValues } from '@/lib/integration-credentials';
import { ApiIntegrationsManager, type ApiIntegrationCard, type ApiIntegrationField } from '@/components/admin/ApiIntegrationsManager';

function envConfigured(name: string) {
    return Boolean(String(process.env[name] ?? '').trim());
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function githubUsernameFromUrl(value: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const url = new URL(raw);
        if (!/(^|\.)github\.com$/i.test(url.hostname)) return '';
        return url.pathname.split('/').filter(Boolean)[0] ?? '';
    } catch {
        return '';
    }
}

export default async function ApiIntegrationsPage() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin');

    const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { integrationSettings: true, assistantSettings: true, socialLinks: true },
    });

    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    const assistantKeys = getStoredAssistantApiKeys(settings?.assistantSettings);
    const tests = getIntegrationTests(settings?.integrationSettings);
    const siteGithubUsername = githubUsernameFromUrl(record(settings?.socialLinks).github);

    const field = (key: string, label: string, envName: string, secret = true, help?: string): ApiIntegrationField => {
        const provider = key.split('.')[0];
        const cms = Boolean(stored[key]);
        const legacyAssistant = key.endsWith('.apiKey') && Boolean(assistantKeys[provider]);
        const environment = envConfigured(envName);
        const source: ApiIntegrationField['source'] = cms ? 'cms' : legacyAssistant ? 'assistant' : environment ? 'environment' : 'missing';
        return { key, label, envName, secret, configured: source !== 'missing', source, help };
    };

    const githubUsernameField: ApiIntegrationField = stored['github.username']
        ? { key: 'github.username', label: 'GitHub username', envName: 'GITHUB_USERNAME', secret: false, configured: true, source: 'cms', help: 'Used by The Lab public repository fallback.' }
        : envConfigured('GITHUB_USERNAME')
            ? { key: 'github.username', label: 'GitHub username', envName: 'GITHUB_USERNAME', secret: false, configured: true, source: 'environment', help: 'Used by The Lab public repository fallback.' }
            : siteGithubUsername
                ? { key: 'github.username', label: 'GitHub username', envName: 'GITHUB_USERNAME', secret: false, configured: true, source: 'site', help: `Inferred from Site Settings → Social links (${siteGithubUsername}).` }
                : { key: 'github.username', label: 'GitHub username', envName: 'GITHUB_USERNAME', secret: false, configured: false, source: 'missing', help: 'Set the username here or add a GitHub profile URL in Site Settings → Social links.' };

    const githubTokenField: ApiIntegrationField = {
        ...field('github.apiKey', 'Personal access token', 'GITHUB_TOKEN', true, 'Optional for The Lab REST fallback. CMS value overrides GITHUB_TOKEN from the environment.'),
        required: false,
    };

    const cards: ApiIntegrationCard[] = [
        {
            id: 'github',
            name: 'GitHub',
            category: 'Development data',
            description: 'Reads your public GitHub repositories, languages, activity and repository metadata.',
            usedBy: ['The Lab - Used in real work', 'GitHub statistics', 'Language statistics', 'Recent GitHub activity'],
            docsHint: 'The Lab first tries authenticated GraphQL for richer framework detection. If GraphQL is unavailable or the token has restrictive scopes, it automatically uses the public REST repository API. A token is optional for the Lab fallback but recommended for richer data and higher rate limits.',
            fields: [githubUsernameField, githubTokenField],
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
            id: 'lemonsqueezy',
            name: 'Lemon Squeezy',
            category: 'Commerce & payments',
            description: 'Creates checkout sessions for Necrotix Lab digital products and verifies paid orders through signed webhooks.',
            usedBy: ['Digital Store checkout', 'Order verification', 'Secure download grants'],
            docsHint: 'Create an API key and webhook in Lemon Squeezy. Point the webhook to /api/store/webhook and subscribe to order_created and order_refunded. The webhook signing secret must match the value entered here.',
            fields: [
                field('lemonsqueezy.apiKey', 'API Key', 'LEMON_SQUEEZY_API_KEY', true),
                field('lemonsqueezy.storeId', 'Store ID', 'LEMON_SQUEEZY_STORE_ID', false),
                field('lemonsqueezy.webhookSecret', 'Webhook Secret', 'LEMON_SQUEEZY_WEBHOOK_SECRET', true),
            ],
            lastTest: tests.lemonsqueezy ?? null,
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
            category: 'Media & private file storage',
            description: 'Stores managed media uploads and private digital product files. Store files use private object keys and are never served from the public media URL.',
            usedBy: ['Media Library uploads', 'Blog media', 'Project media', 'Journey media', 'Digital Store private files'],
            docsHint: 'Create an R2 API token with object read/write access to the selected bucket. Public Base URL is used only for public media; Store downloads are proxied through verified purchase access.',
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
