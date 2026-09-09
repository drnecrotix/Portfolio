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
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) redirect('/admin/login');

    const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { integrationSettings: true, assistantSettings: true, socialLinks: true },
    });

    const stored = getStoredIntegrationValues(settings?.integrationSettings);
    const tests = getIntegrationTests(settings?.integrationSettings);
    const assistant = getStoredAssistantApiKeys(settings?.assistantSettings);
    const social = record(settings?.socialLinks);
    const siteGithubUsername = githubUsernameFromUrl(social.github);

    const field = (key: string, label: string, envName: string, secret: boolean, help?: string, required?: boolean): ApiIntegrationField => {
        const cms = Boolean(stored[key]);
        const fromAssistant = Boolean((assistant as Record<string, string>)[key]);
        const environment = envConfigured(envName);
        const source = cms ? 'cms' : fromAssistant ? 'assistant' : environment ? 'environment' : 'missing';
        return { key, label, envName, secret, configured: source !== 'missing', source, help, required };
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
            id: 'smtp',
            name: 'SMTP email delivery',
            category: 'Email & verification',
            description: 'SMTP delivery settings available to site features that send transactional messages.',
            usedBy: ['Transactional site email'],
            docsHint: 'For Gmail, enable two-step verification and create an App Password. The password is encrypted before storage and is never returned to the browser.',
            fields: [
                field('smtp.user', 'Email / SMTP user', 'EMAIL_USER', false),
                field('smtp.password', 'SMTP app password', 'EMAIL_APP_PASSWORD', true),
                field('smtp.host', 'SMTP host', 'SMTP_HOST', false),
                field('smtp.port', 'SMTP port', 'SMTP_PORT', false),
                field('smtp.secure', 'Secure connection (true/false)', 'SMTP_SECURE', false),
            ],
            lastTest: tests.smtp ?? null,
        },
        {
            id: 'hibp',
            name: 'Have I Been Pwned',
            category: 'Digital Footprint',
            description: 'Email breach lookup used by the public Digital Footprint tool.',
            usedBy: ['Digital Footprint scan'],
            docsHint: 'Get a key at haveibeenpwned.com/API/Key. Store it here or as HIBP_API_KEY.',
            fields: [field('hibp.apiKey', 'API key', 'HIBP_API_KEY', true)],
            lastTest: (tests as Record<string, typeof tests.smtp>).hibp ?? null,
        },
        {
            id: 'holehe',
            name: 'Holehe',
            category: 'Digital Footprint',
            description: 'Email → registered service signals via the Holehe sidecar.',
            usedBy: ['Digital Footprint related accounts'],
            docsHint: 'Point apiUrl at your Holehe FastAPI sidecar and set a shared bearer token.',
            fields: [
                field('holehe.apiUrl', 'API base URL', 'HOLEHE_API_URL', false, 'Example: http://127.0.0.1:8000'),
                field('holehe.apiToken', 'Bearer token', 'HOLEHE_API_TOKEN', true),
            ],
            lastTest: (tests as Record<string, typeof tests.smtp>).holehe ?? null,
        },
        {
            id: 'emailrep',
            name: 'EmailRep',
            category: 'Digital Footprint',
            description: 'Email reputation and risk signals for Digital Footprint.',
            usedBy: ['Digital Footprint scan'],
            docsHint: 'API key from emailrep.io.',
            fields: [field('emailrep.apiKey', 'API key', 'EMAILREP_API_KEY', true)],
            lastTest: (tests as Record<string, typeof tests.smtp>).emailrep ?? null,
        },
        {
            id: 'leakcheck',
            name: 'LeakCheck Pro',
            category: 'Digital Footprint',
            description: 'Optional paid LeakCheck API for structured breach records. Passwords are redacted in the UI.',
            usedBy: ['Digital Footprint scan'],
            docsHint: 'Requires a LeakCheck Pro key. Public mode works without a key.',
            fields: [field('leakcheck.apiKey', 'API key', 'LEAKCHECK_API_KEY', true)],
            lastTest: (tests as Record<string, typeof tests.smtp>).leakcheck ?? null,
        },
        {
            id: 'dehashed',
            name: 'DeHashed',
            category: 'Digital Footprint',
            description: 'Optional DeHashed search for structured identity records. Secrets are never displayed.',
            usedBy: ['Digital Footprint scan'],
            docsHint: 'Use the email associated with your DeHashed account plus the API key.',
            fields: [
                field('dehashed.email', 'Account email', 'DEHASHED_EMAIL', false),
                field('dehashed.apiKey', 'API key', 'DEHASHED_API_KEY', true),
            ],
            lastTest: (tests as Record<string, typeof tests.smtp>).dehashed ?? null,
        },
        {
            id: 'github',
            name: 'GitHub',
            category: 'Development data',
            description: 'Public repository fallback used by The Lab when the live GitHub API needs a configured identity.',
            usedBy: ['The Lab'],
            docsHint: 'Username can come from CMS, environment or Site Settings social links.',
            fields: [githubUsernameField, githubTokenField],
            lastTest: tests.github ?? null,
        },
        {
            id: 'wakatime',
            name: 'WakaTime',
            category: 'Coding metrics',
            description: 'Coding activity stats for the public site.',
            usedBy: ['Coding stats widgets'],
            docsHint: 'API key from wakatime.com.',
            fields: [field('wakatime.apiKey', 'API key', 'WAKATIME_API_KEY', true)],
            lastTest: tests.wakatime ?? null,
        },
        {
            id: 'creem',
            name: 'Creem',
            category: 'Commerce & payments',
            description: 'Payment provider for the Digital Store.',
            usedBy: ['Digital Store checkout'],
            docsHint: 'API key and webhook secret from Creem.',
            fields: [
                field('creem.apiKey', 'API key', 'CREEM_API_KEY', true),
                field('creem.webhookSecret', 'Webhook secret', 'CREEM_WEBHOOK_SECRET', true),
            ],
            lastTest: tests.creem ?? null,
        },
        {
            id: 'lemonsqueezy',
            name: 'Lemon Squeezy',
            category: 'Commerce & payments',
            description: 'Alternative payment provider for the Digital Store.',
            usedBy: ['Digital Store checkout'],
            docsHint: 'API key, store ID and webhook secret.',
            fields: [
                field('lemonsqueezy.apiKey', 'API key', 'LEMON_SQUEEZY_API_KEY', true),
                field('lemonsqueezy.storeId', 'Store ID', 'LEMON_SQUEEZY_STORE_ID', false),
                field('lemonsqueezy.webhookSecret', 'Webhook secret', 'LEMON_SQUEEZY_WEBHOOK_SECRET', true),
            ],
            lastTest: tests.lemonsqueezy ?? null,
        },
        {
            id: 'openai',
            name: 'OpenAI',
            category: 'AI provider',
            description: 'OpenAI models for the AI Assistant.',
            usedBy: ['AI Assistant'],
            docsHint: 'API key overrides Assistant CMS and environment.',
            fields: [field('openai.apiKey', 'API key', 'OPENAI_API_KEY', true)],
            lastTest: tests.openai ?? null,
        },
        {
            id: 'groq',
            name: 'Groq',
            category: 'AI provider',
            description: 'Groq models for the AI Assistant.',
            usedBy: ['AI Assistant'],
            docsHint: 'API key from console.groq.com.',
            fields: [field('groq.apiKey', 'API key', 'GROQ_API_KEY', true)],
            lastTest: tests.groq ?? null,
        },
        {
            id: 'gemini',
            name: 'Google Gemini',
            category: 'AI provider',
            description: 'Gemini models for the AI Assistant.',
            usedBy: ['AI Assistant'],
            docsHint: 'API key from Google AI Studio.',
            fields: [field('gemini.apiKey', 'API key', 'GEMINI_API_KEY', true)],
            lastTest: tests.gemini ?? null,
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            category: 'AI provider',
            description: 'OpenRouter gateway for multiple models.',
            usedBy: ['AI Assistant'],
            docsHint: 'API key from openrouter.ai.',
            fields: [field('openrouter.apiKey', 'API key', 'OPENROUTER_API_KEY', true)],
            lastTest: tests.openrouter ?? null,
        },
        {
            id: 'r2',
            name: 'Cloudflare R2',
            category: 'Media & private file storage',
            description: 'Stores public managed media and paid digital product files.',
            usedBy: ['Media Library', 'Digital Store private files'],
            docsHint: 'Use separate public media and private store buckets.',
            fields: [
                field('r2.accountId', 'Account ID', 'R2_ACCOUNT_ID', false),
                field('r2.accessKeyId', 'Access Key ID', 'R2_ACCESS_KEY_ID', true),
                field('r2.secretAccessKey', 'Secret Access Key', 'R2_SECRET_ACCESS_KEY', true),
                field('r2.bucket', 'Public media bucket', 'R2_BUCKET', false),
                field('r2.storeBucket', 'Private Store bucket', 'R2_STORE_BUCKET', false),
                field('r2.publicBaseUrl', 'Public Media Base URL', 'R2_PUBLIC_BASE_URL', false),
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
