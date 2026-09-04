'use client';

export type StoreCartItem = {
    slug: string;
    title: string;
    priceCents: number;
    currency: string;
    coverImageUrl?: string | null;
};

const STORAGE_KEY = 'necrotixlab.store.cart.v1';
export const STORE_CART_EVENT = 'necrotixlab:store-cart-change';

function validItem(value: unknown): value is StoreCartItem {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const item = value as Partial<StoreCartItem>;
    return typeof item.slug === 'string'
        && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
        && typeof item.title === 'string'
        && item.title.length > 0
        && Number.isSafeInteger(item.priceCents)
        && Number(item.priceCents) >= 0
        && typeof item.currency === 'string'
        && /^[A-Z]{3}$/.test(item.currency);
}

export function readStoreCart(): StoreCartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(validItem).slice(0, 25);
    } catch {
        return [];
    }
}

function writeStoreCart(items: StoreCartItem[]) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 25)));
    window.dispatchEvent(new CustomEvent(STORE_CART_EVENT));
}

export function addStoreCartItem(item: StoreCartItem) {
    const current = readStoreCart();
    const withoutExisting = current.filter((entry) => entry.slug !== item.slug);
    writeStoreCart([item, ...withoutExisting]);
}

export function removeStoreCartItem(slug: string) {
    writeStoreCart(readStoreCart().filter((item) => item.slug !== slug));
}

export function clearStoreCart() {
    writeStoreCart([]);
}
