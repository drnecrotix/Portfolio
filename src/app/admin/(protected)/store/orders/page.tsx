import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function StoreOrdersPage() {
    const orders = await prisma.storeOrder.findMany({
        include: { items: true, downloadGrants: true },
        orderBy: { createdAt: 'desc' },
        take: 250,
    });

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Commerce</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Orders</h1><p className="mt-2 text-sm text-muted-foreground">Verified Lemon Squeezy orders and download usage.</p></div>
                <Link href="/admin/store" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back to Store</Link>
            </header>

            <section className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.015]">
                {orders.length ? orders.map((order) => (
                    <article key={order.id} className="border-b border-foreground/10 p-4 last:border-b-0 sm:p-5 md:grid md:grid-cols-[minmax(0,1fr)_150px_100px_130px] md:items-center md:gap-4">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{order.email}</p><p className="mt-1 truncate text-xs text-muted-foreground">#{order.providerOrderId} · {order.items.map((item) => item.title).join(', ') || 'No item'}</p></div>
                        <p className="mt-3 text-sm font-bold md:mt-0">{money(order.totalCents, order.currency)}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:mt-0">{order.status}</p>
                        <div className="mt-1 text-xs text-muted-foreground md:mt-0"><p>{order.createdAt.toLocaleDateString('en-GB')}</p><p>{order.downloadGrants.reduce((sum, grant) => sum + grant.downloads, 0)} downloads</p></div>
                    </article>
                )) : <div className="px-5 py-14 text-center text-sm text-muted-foreground">No store orders have been recorded yet.</div>}
            </section>
        </div>
    );
}
