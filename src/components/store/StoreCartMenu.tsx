'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, ShoppingCart, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { readStoreCart, removeStoreCartItem, STORE_CART_EVENT, type StoreCartItem } from '@/lib/store-cart';

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export function StoreCartMenu({ visible }: { visible: boolean }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<StoreCartItem[]>([]);
    const [loadingSlug, setLoadingSlug] = useState('');
    const [error, setError] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sync = () => setItems(readStoreCart());
        sync();
        window.addEventListener(STORE_CART_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(STORE_CART_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    useEffect(() => {
        if (!visible) setOpen(false);
    }, [visible]);

    useEffect(() => {
        if (!open) return;
        const closeOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', closeEscape);
        return () => {
            document.removeEventListener('mousedown', closeOutside);
            document.removeEventListener('keydown', closeEscape);
        };
    }, [open]);

    if (!visible) return null;

    async function checkout(item: StoreCartItem) {
        if (loadingSlug) return;
        setLoadingSlug(item.slug);
        setError('');
        try {
            const response = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: item.slug }),
            });
            const payload = await response.json() as { url?: string; error?: string };
            if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
            window.location.assign(payload.url);
        } catch (checkoutError) {
            setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
            setLoadingSlug('');
        }
    }

    return (
        <div ref={rootRef} className="relative">
            <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOpen((value) => !value)}
                className="relative flex rounded-full bg-muted/80 p-2 text-foreground transition-colors hover:bg-muted md:p-2.5"
                aria-label={`Shopping cart${items.length ? ` with ${items.length} item${items.length === 1 ? '' : 's'}` : ''}`}
                aria-expanded={open}
                title="Shopping cart"
            >
                <ShoppingCart className="h-4 w-4" />
                {items.length ? (
                    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-black leading-none text-background">
                        {items.length > 9 ? '9+' : items.length}
                    </span>
                ) : null}
            </motion.button>

            {open ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[120] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
                        <div>
                            <p className="text-sm font-black">Shopping cart</p>
                            <p className="text-[11px] text-muted-foreground">{items.length} saved item{items.length === 1 ? '' : 's'}</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close cart"><X className="h-4 w-4" /></button>
                    </div>

                    {items.length ? (
                        <div className="max-h-[420px] overflow-y-auto p-2">
                            {items.map((item) => {
                                const free = item.priceCents === 0;
                                return (
                                    <div key={item.slug} className="rounded-xl p-2.5 transition hover:bg-muted/50">
                                        <div className="flex gap-3">
                                            <Link
                                                href={`/store/${item.slug}`}
                                                onClick={() => setOpen(false)}
                                                className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-foreground/10 bg-muted bg-cover bg-center"
                                                style={item.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(item.coverImageUrl).slice(1, -1)})` } : undefined}
                                                aria-label={`Open ${item.title}`}
                                            >
                                                {!item.coverImageUrl ? <span className="flex h-full items-center justify-center"><ShoppingCart className="h-4 w-4 text-muted-foreground" /></span> : null}
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <Link href={`/store/${item.slug}`} onClick={() => setOpen(false)} className="block truncate text-sm font-bold hover:underline">{item.title}</Link>
                                                <p className="mt-1 text-xs font-semibold text-muted-foreground">{free ? 'Free download' : money(item.priceCents, item.currency)}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <button type="button" onClick={() => checkout(item)} disabled={Boolean(loadingSlug)} className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-bold text-background disabled:cursor-wait disabled:opacity-60">
                                                        {free ? <Download className="h-3 w-3" /> : null}
                                                        {loadingSlug === item.slug ? (free ? 'Preparing...' : 'Opening...') : (free ? 'Download' : 'Checkout')}
                                                    </button>
                                                    <button type="button" onClick={() => removeStoreCartItem(item.slug)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`Remove ${item.title} from cart`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-5 py-8 text-center">
                            <ShoppingCart className="mx-auto h-6 w-6 text-foreground/20" />
                            <p className="mt-3 text-sm font-semibold">Your cart is empty.</p>
                            <Link href="/store" onClick={() => setOpen(false)} className="mt-3 inline-flex rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background">Browse Store</Link>
                        </div>
                    )}

                    {error ? <p role="alert" className="border-t border-foreground/10 px-4 py-3 text-xs text-red-500">{error}</p> : null}
                    <div className="border-t border-foreground/10 px-4 py-3 text-[10px] leading-4 text-muted-foreground">Paid products are checked out separately through their configured provider. Free products download without payment.</div>
                </div>
            ) : null}
        </div>
    );
}
