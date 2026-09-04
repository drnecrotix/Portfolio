import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Download, ShoppingBag } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Order | Necrotix Lab', robots: { index: false, follow: false } };

export default async function StoreThanksPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
    const { session: rawSession } = await searchParams;
    const session = String(rawSession ?? '').trim();
    const checkout = /^[A-Za-z0-9_-]{20,80}$/.test(session)
        ? await prisma.storeCheckoutSession.findUnique({
            where: { token: session },
            include: { product: { include: { files: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } } },
        })
        : null;

    if (!checkout || checkout.expiresAt.getTime() <= Date.now()) {
        return (
            <main className="min-h-screen bg-background px-6 pb-24 pt-36 text-foreground">
                <div className="mx-auto max-w-2xl rounded-3xl border border-foreground/10 bg-foreground/[0.025] p-8 text-center sm:p-12">
                    <ShoppingBag className="mx-auto h-9 w-9 text-foreground/25" />
                    <h1 className="mt-5 text-3xl font-black">Order session unavailable</h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">This purchase session is invalid or has expired. If you completed a payment and need help, contact Necrotix Lab with your order information.</p>
                    <Link href="/store" className="mt-7 inline-flex rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background">Return to Store</Link>
                </div>
            </main>
        );
    }

    const grant = checkout.orderId
        ? await prisma.storeDownloadGrant.findUnique({ where: { orderId_productId: { orderId: checkout.orderId, productId: checkout.productId } } })
        : null;

    return (
        <main className="min-h-screen bg-background px-6 pb-24 pt-36 text-foreground">
            <div className="mx-auto max-w-2xl rounded-3xl border border-foreground/10 bg-foreground/[0.025] p-8 sm:p-12">
                {grant ? (
                    <>
                        <CheckCircle2 className="h-10 w-10" />
                        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Payment confirmed</p>
                        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Your files are ready.</h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{checkout.product.title} is linked to this purchase. Keep this page private because its download links grant access to the files.</p>
                        <div className="mt-8 space-y-3">
                            {checkout.product.files.map((file) => (
                                <a
                                    key={file.id}
                                    href={`/store/download/${grant.token}?file=${encodeURIComponent(file.id)}`}
                                    className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.025] px-4 py-3 transition hover:bg-foreground/[0.06]"
                                >
                                    <span className="min-w-0 truncate text-sm font-semibold">{file.fileName}</span>
                                    <Download className="h-4 w-4 shrink-0" />
                                </a>
                            ))}
                        </div>
                        <p className="mt-6 text-xs leading-5 text-muted-foreground">Download allowance: {grant.maxDownloads} total file downloads for this purchase. Used: {grant.downloads}.</p>
                    </>
                ) : (
                    <>
                        <ShoppingBag className="h-10 w-10 text-foreground/35" />
                        <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Checkout returned</p>
                        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Finalizing your download.</h1>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">The store has not received the signed payment confirmation yet. Refresh this page after the payment confirmation is processed. No file is unlocked until the webhook verifies the order.</p>
                    </>
                )}
                <Link href="/store" className="mt-8 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">Back to Store</Link>
            </div>
        </main>
    );
}
