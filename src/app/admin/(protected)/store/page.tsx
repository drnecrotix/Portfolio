import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function money(cents: number, currency = 'EUR') {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function AdminStorePage() {
    const [products, paidOrders, revenue] = await Promise.all([
        prisma.storeProduct.findMany({
            include: { _count: { select: { files: true, orderItems: true } } },
            orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        }),
        prisma.storeOrder.count({ where: { status: 'PAID' } }),
        prisma.storeOrder.aggregate({ where: { status: 'PAID' }, _sum: { totalCents: true } }),
    ]);

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Commerce</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Digital Store</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage downloadable products, private files and Lemon Squeezy product mappings.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/store/orders" className="inline-flex min-h-11 items-center rounded-xl border border-foreground/10 px-4 py-2.5 text-sm font-semibold">Orders</Link>
                    <Link href="/admin/store/new" className="inline-flex min-h-11 items-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">New product</Link>
                </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Products</p><p className="mt-2 text-2xl font-black">{products.length}</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Paid orders</p><p className="mt-2 text-2xl font-black">{paidOrders}</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Recorded revenue</p><p className="mt-2 text-2xl font-black">{money(revenue._sum.totalCents ?? 0)}</p></div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.015]">
                {products.length ? products.map((product) => (
                    <Link key={product.id} href={`/admin/store/${product.id}`} className="block border-b border-foreground/10 p-4 transition last:border-b-0 hover:bg-foreground/[0.035] sm:p-5 md:grid md:grid-cols-[minmax(0,1fr)_130px_110px_110px] md:items-center md:gap-4">
                        <div className="min-w-0"><p className="font-semibold">{product.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">/store/{product.slug}</p></div>
                        <p className="mt-3 text-sm font-bold md:mt-0">{money(product.priceCents, product.currency)}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:mt-0">{product.status}</p>
                        <p className="mt-1 text-xs text-muted-foreground md:mt-0">{product._count.files} files · {product._count.orderItems} sales</p>
                    </Link>
                )) : <div className="px-5 py-14 text-center text-sm text-muted-foreground">No digital products yet. Create the first product to start building the Store.</div>}
            </section>
        </div>
    );
}
