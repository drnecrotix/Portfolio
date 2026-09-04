import 'server-only';

import { getRuntimeCreemConfig } from '@/lib/integration-runtime';

const TEST_API_BASE = 'https://test-api.creem.io';
const LIVE_API_BASE = 'https://api.creem.io';

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

export function resolveCreemEnvironment(apiKey: string) {
    if (apiKey.startsWith('creem_test_')) return { mode: 'test' as const, baseUrl: TEST_API_BASE };
    if (apiKey.startsWith('creem_live_') || apiKey.startsWith('creem_')) return { mode: 'live' as const, baseUrl: LIVE_API_BASE };
    throw new Error('CREEM_API_KEY has an unsupported format.');
}

async function apiFetch(path: string, init?: RequestInit) {
    const config = await getRuntimeCreemConfig();
    const apiKey = required(config.apiKey, 'CREEM_API_KEY');
    const environment = resolveCreemEnvironment(apiKey);
    const response = await fetch(`${environment.baseUrl}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[Store] Creem API error', response.status, body.slice(0, 1000));
        throw new Error(`Creem returned HTTP ${response.status}.`);
    }
    return response;
}

export async function testCreemConnection() {
    const config = await getRuntimeCreemConfig();
    const apiKey = required(config.apiKey, 'CREEM_API_KEY');
    const environment = resolveCreemEnvironment(apiKey);
    const response = await apiFetch('/v1/products/search?page_number=1&page_size=1');
    const payload = await response.json() as { pagination?: { total_records?: number } };
    return {
        mode: environment.mode,
        productCount: Number(payload.pagination?.total_records ?? 0),
        webhookConfigured: Boolean(config.webhookSecret),
    };
}

export async function createCreemCheckout(input: {
    creemProductId: string;
    productId: string;
    sessionToken: string;
    redirectUrl: string;
}) {
    const creemProductId = required(input.creemProductId, 'Creem Product ID');
    const response = await apiFetch('/v1/checkouts', {
        method: 'POST',
        body: JSON.stringify({
            product_id: creemProductId,
            request_id: input.sessionToken,
            units: 1,
            success_url: input.redirectUrl,
            metadata: {
                product_id: input.productId,
                checkout_session: input.sessionToken,
                source: 'necrotixlab-store',
            },
        }),
    });

    const payload = await response.json() as { checkout_url?: string };
    if (!payload.checkout_url) throw new Error('Creem checkout URL was not returned.');
    return payload.checkout_url;
}
