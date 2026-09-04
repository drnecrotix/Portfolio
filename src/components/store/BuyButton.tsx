'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

export function BuyButton({ slug, label = 'Buy now' }: { slug: string; label?: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function startCheckout() {
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/store/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            const payload = await response.json() as { url?: string; error?: string };
            if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
            window.location.assign(payload.url);
        } catch (checkoutError) {
            setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={startCheckout}
                disabled={loading}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
                <ShoppingBag className="h-4 w-4" />
                {loading ? 'Opening checkout...' : label}
            </button>
            {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
        </div>
    );
}
