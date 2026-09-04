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

export type CreemCatalogProduct = {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    currency: string;
    mode: string;
    status: string;
};

export async function listCreemProducts(): Promise<CreemCatalogProduct[]> {
    const response = await apiFetch('/v1/products/search?page_number=1&page_size=100');
    const payload = await response.json() as {
        items?: Array<{
            id?: string;
            name?: string;
            description?: string;
            price?: number;
            currency?: string;
            mode?: string;
            status?: string;
            billing_type?: string;
        }>;
    };
    return (payload.items ?? [])
        .filter((item) => item.id && item.billing_type !== 'recurring')
        .map((item) => ({
            id: String(item.id),
            name: String(item.name || item.id),
            description: String(item.description || ''),
            priceCents: Number(item.price || 0),
            currency: String(item.currency || 'EUR').toUpperCase(),
            mode: String(item.mode || ''),
            status: String(item.status || ''),
        }));
}

function productImageUrl(value: string | null | undefined) {
    const raw = String(value ?? '').trim();
    if (!raw || !/\.(?:png|jpe?g)(?:\?|#|$)/i.test(raw)) return undefined;
    if (/^https?:\/\//i.test(raw)) return raw;
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://necrotixlab.com').replace(/\/$/, '');
    return raw.startsWith('/') ? `${siteUrl}${raw}` : undefined;
}

export async function createCreemStoreProduct(input: {
    name: string;
    description?: string | null;
    priceCents: number;
    currency?: string;
    coverImageUrl?: string | null;
}) {
    if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 100) {
        throw new Error('Creem requires a paid product price of at least €1.00.');
    }
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://necrotixlab.com').replace(/\/$/, '');
    const response = await apiFetch('/v1/products', {
        method: 'POST',
        body: JSON.stringify({
            name: input.name.slice(0, 180),
            description: String(input.description || '').slice(0, 5000),
            price: input.priceCents,
            currency: String(input.currency || 'EUR').toUpperCase(),
            billing_type: 'onetime',
            tax_category: 'digital-goods-service',
            default_success_url: `${siteUrl}/store/thanks`,
            ...(productImageUrl(input.coverImageUrl) ? { image_url: productImageUrl(input.coverImageUrl) } : {}),
        }),
    });
    const payload = await response.json() as { id?: string; mode?: string; status?: string };
    const id = String(payload.id || '').trim();
    if (!/^prod_[A-Za-z0-9]+$/.test(id)) throw new Error('Creem created the product but did not return a valid Product ID.');
    return { id, mode: String(payload.mode || ''), status: String(payload.status || '') };
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
