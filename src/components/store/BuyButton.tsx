'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, ShoppingBag, ShoppingCart } from 'lucide-react';
import { addStoreCartItem } from '@/lib/store-cart';

export function BuyButton({
    slug,
    title,
    priceCents,
    currency,
    coverImageUrl,
    label = 'Buy now',
}: {
    slug: string;
    title: string;
    priceCents: number;
    currency: string;
    coverImageUrl?: string | null;
    label?: string;
}) {
    const [loading, setLoading] = useState(false);
    const [added, setAdded] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState('');
    const isFree = priceCents === 0;

    async function startCheckout() {
        if (loading) return;
        if (!termsAccepted) {
            setError('Please accept the Terms & Digital Content Policy before continuing.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, acceptedDigitalTerms: true }),
            });
            const payload = await response.json() as { url?: string; error?: string };
            if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
            window.location.assign(payload.url);
        } catch (checkoutError) {
            setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
            setLoading(false);
        }
    }

    function addToCart() {
        addStoreCartItem({ slug, title, priceCents, currency, coverImageUrl });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
    }

    return (
        <div className="min-w-0 max-w-full space-y-3">
            <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                    type="button"
                    onClick={startCheckout}
                    disabled={loading || !termsAccepted}
                    className="inline-flex min-h-12 min-w-0 w-full max-w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5"
                >
                    {isFree ? <Download className="h-4 w-4 shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{loading ? (isFree ? 'Preparing download...' : 'Opening checkout...') : label}</span>
                </button>
                <button
                    type="button"
                    onClick={addToCart}
                    className="inline-flex min-h-12 min-w-0 w-full max-w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-muted sm:w-auto sm:px-5"
                >
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span className="truncate">{added ? 'Added' : 'Add to cart'}</span>
                </button>
            </div>
            <label className="flex min-w-0 max-w-full items-start gap-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3.5 py-3 text-[11px] leading-5 text-muted-foreground">
                <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setError(''); }} className="mt-0.5 h-4 w-4 shrink-0 accent-foreground" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    I agree to the <Link href="/terms" className="font-bold text-foreground underline underline-offset-2">Terms & Digital Content Policy</Link> and request immediate digital delivery. I understand that once delivery/download begins I may lose the withdrawal right, without affecting mandatory rights for faulty or non-conforming digital content.
                </span>
            </label>
            {error ? <p role="alert" className="max-w-full break-words text-sm text-red-500 [overflow-wrap:anywhere]">{error}</p> : null}
        </div>
    );
}
