'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckSquare2, Download, ShoppingCart, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { readStoreCart, removeStoreCartItem, STORE_CART_EVENT, type StoreCartItem } from '@/lib/store-cart';

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export function StoreCartMenu() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<StoreCartItem[]>([]);
    const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loadingSlug, setLoadingSlug] = useState('');
    const [error, setError] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sync = () => {
            const nextItems = readStoreCart();
            setItems(nextItems);
            setSelectedSlugs((current) => {
                const currentSet = new Set(current);
                const nextSlugs = nextItems.map((item) => item.slug);
                if (!current.length) return nextSlugs;
                return nextSlugs.filter((slug) => currentSet.has(slug));
            });
        };
        sync();
        window.addEventListener(STORE_CART_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(STORE_CART_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

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

    const selectedSet = new Set(selectedSlugs);
    const allSelected = items.length > 0 && selectedSlugs.length === items.length;

    function toggleSelected(slug: string) {
        setSelectedSlugs((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
        setError('');
    }

    async function checkout(item: StoreCartItem) {
        if (loadingSlug) return;
        if (!selectedSet.has(item.slug)) {
            setError('Select this item before starting checkout.');
            return;
        }
        if (!termsAccepted) {
            setError('Please accept the Terms and Digital Content Policy before continuing.');
            return;
        }
        setLoadingSlug(item.slug);
        setError('');
        try {
            const response = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: item.slug, acceptedDigitalTerms: true }),
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
        <div ref={rootRef} className="relative min-w-0">
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
                <div className="fixed inset-x-3 top-20 z-[120] max-h-[calc(100dvh-6rem)] min-w-0 overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:max-h-none sm:w-[min(94vw,390px)]">
                    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-foreground/10 px-4 py-3">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black">Shopping cart</p>
                            <p className="truncate text-[11px] text-muted-foreground">{items.length} saved item{items.length === 1 ? '' : 's'} · {selectedSlugs.length} selected</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close cart"><X className="h-4 w-4" /></button>
                    </div>

                    {items.length ? (
                        <>
                            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-foreground/10 px-4 py-2.5 text-[11px]">
                                <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-muted-foreground"><CheckSquare2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Choose items</span></span>
                                <button type="button" onClick={() => setSelectedSlugs(allSelected ? [] : items.map((item) => item.slug))} className="shrink-0 font-bold text-foreground hover:underline">{allSelected ? 'Clear' : 'Select all'}</button>
                            </div>
                            <div className="max-h-[44dvh] overflow-y-auto overscroll-contain p-2 sm:max-h-[360px]">
                                {items.map((item) => {
                                    const free = item.priceCents === 0;
                                    const selected = selectedSet.has(item.slug);
                                    return (
                                        <div key={item.slug} className={`min-w-0 max-w-full rounded-xl border p-2.5 transition ${selected ? 'border-foreground/12 bg-foreground/[0.025]' : 'border-transparent opacity-70 hover:bg-muted/40'}`}>
                                            <div className="flex min-w-0 gap-2.5">
                                                <label className="flex shrink-0 items-start pt-4" aria-label={`Select ${item.title}`}>
                                                    <input type="checkbox" checked={selected} onChange={() => toggleSelected(item.slug)} className="h-4 w-4 accent-foreground" />
                                                </label>
                                                <Link
                                                    href={`/store/${item.slug}`}
                                                    onClick={() => setOpen(false)}
                                                    className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-foreground/10 bg-muted bg-cover bg-center sm:h-14 sm:w-14"
                                                    style={item.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(item.coverImageUrl).slice(1, -1)})` } : undefined}
                                                    aria-label={`Open ${item.title}`}
                                                >
                                                    {!item.coverImageUrl ? <span className="flex h-full items-center justify-center"><ShoppingCart className="h-4 w-4 text-muted-foreground" /></span> : null}
                                                </Link>
                                                <div className="min-w-0 flex-1">
                                                    <Link href={`/store/${item.slug}`} onClick={() => setOpen(false)} className="block truncate text-sm font-bold hover:underline">{item.title}</Link>
                                                    <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{free ? 'Free download' : money(item.priceCents, item.currency)}</p>
                                                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                                                        <button type="button" onClick={() => checkout(item)} disabled={Boolean(loadingSlug) || !selected || !termsAccepted} className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-bold text-background disabled:cursor-not-allowed disabled:opacity-35">
                                                            {free ? <Download className="h-3 w-3 shrink-0" /> : null}
                                                            <span className="truncate">{loadingSlug === item.slug ? (free ? 'Preparing...' : 'Opening...') : (free ? 'Download' : 'Checkout')}</span>
                                                        </button>
                                                        <button type="button" onClick={() => removeStoreCartItem(item.slug)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`Remove ${item.title} from cart`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="border-t border-foreground/10 p-4">
                                <label className="flex min-w-0 items-start gap-2.5 text-[11px] leading-5 text-muted-foreground">
                                    <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setError(''); }} className="mt-0.5 h-4 w-4 shrink-0 accent-foreground" />
                                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                        I agree to the <Link href="/terms" onClick={() => setOpen(false)} className="font-bold text-foreground underline underline-offset-2">Terms & Digital Content Policy</Link> and request immediate digital delivery. I understand that once delivery/download begins I may lose the statutory withdrawal right, without affecting mandatory rights for faulty or non-conforming digital content.
                                    </span>
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="px-5 py-8 text-center">
                            <ShoppingCart className="mx-auto h-6 w-6 text-foreground/20" />
                            <p className="mt-3 text-sm font-semibold">Your cart is empty.</p>
                            <Link href="/store" onClick={() => setOpen(false)} className="mt-3 inline-flex rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background">Browse Store</Link>
                        </div>
                    )}

                    {error ? <p role="alert" className="break-words border-t border-foreground/10 px-4 py-3 text-xs text-red-500 [overflow-wrap:anywhere]">{error}</p> : null}
                    <div className="break-words border-t border-foreground/10 px-4 py-3 text-[10px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">Paid products are checked out separately through their configured provider. Selection lets you control which saved items are ready for checkout.</div>
                </div>
            ) : null}
        </div>
    );
}
