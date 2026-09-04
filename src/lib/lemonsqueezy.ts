import 'server-only';

import { getRuntimeLemonSqueezyConfig } from '@/lib/integration-runtime';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

async function apiFetch(path: string, init?: RequestInit) {
    const config = await getRuntimeLemonSqueezyConfig();
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${required(config.apiKey, 'LEMON_SQUEEZY_API_KEY')}`,
            ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error('[Store] Lemon Squeezy API error', response.status, body.slice(0, 1000));
        throw new Error(`Lemon Squeezy returned HTTP ${response.status}.`);
    }
    return response;
}

export async function testLemonSqueezyConnection() {
    const config = await getRuntimeLemonSqueezyConfig();
    const storeId = required(config.storeId, 'LEMON_SQUEEZY_STORE_ID');
    const response = await apiFetch(`/stores/${encodeURIComponent(storeId)}`);
    const payload = await response.json() as { data?: { attributes?: { name?: string } } };
    return payload.data?.attributes?.name || `Store ${storeId}`;
}

export type LemonSqueezyCatalogVariant = {
    id: string;
    productId: string;
    productName: string;
    variantName: string;
    priceCents: number;
    priceFormatted: string;
    status: string;
    testMode: boolean;
};

export async function listLemonSqueezyVariants(): Promise<LemonSqueezyCatalogVariant[]> {
    const config = await getRuntimeLemonSqueezyConfig();
    const storeId = required(config.storeId, 'LEMON_SQUEEZY_STORE_ID');
    const response = await apiFetch(`/products?filter[store_id]=${encodeURIComponent(storeId)}&include=variants&page[size]=100`);
    const payload = await response.json() as {
        data?: Array<{ id?: string; attributes?: { name?: string } }>;
        included?: Array<{
            type?: string;
            id?: string;
            attributes?: {
                product_id?: number | string;
                name?: string;
                price?: number;
                price_formatted?: string;
                status?: string;
                test_mode?: boolean;
            };
        }>;
    };
    const productNames = new Map((payload.data ?? []).map((product) => [String(product.id || ''), String(product.attributes?.name || product.id || 'Product')]));
    return (payload.included ?? [])
        .filter((item) => item.type === 'variants' && item.id)
        .map((item) => {
            const productId = String(item.attributes?.product_id || '');
            return {
                id: String(item.id),
                productId,
                productName: productNames.get(productId) || `Product ${productId}`,
                variantName: String(item.attributes?.name || 'Default'),
                priceCents: Number(item.attributes?.price || 0),
                priceFormatted: String(item.attributes?.price_formatted || ''),
                status: String(item.attributes?.status || ''),
                testMode: Boolean(item.attributes?.test_mode),
            };
        });
}

export async function createLemonSqueezyCheckout(input: {
    variantId: string;
    productId: string;
    sessionToken: string;
    redirectUrl: string;
}) {
    const config = await getRuntimeLemonSqueezyConfig();
    const storeId = required(config.storeId, 'LEMON_SQUEEZY_STORE_ID');
    const variantId = required(input.variantId, 'Lemon Squeezy variant ID');

    const response = await apiFetch('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'checkouts',
                attributes: {
                    product_options: {
                        redirect_url: input.redirectUrl,
                    },
                    checkout_data: {
                        custom: {
                            product_id: input.productId,
                            checkout_session: input.sessionToken,
                        },
                    },
                },
                relationships: {
                    store: { data: { type: 'stores', id: String(storeId) } },
                    variant: { data: { type: 'variants', id: String(variantId) } },
                },
            },
        }),
    });

    const payload = await response.json() as { data?: { attributes?: { url?: string } } };
    const url = payload.data?.attributes?.url;
    if (!url) throw new Error('Lemon Squeezy checkout URL was not returned.');
    return url;
}
