import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ShoppingBag } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Digital Store | Necrotix Lab',
    description: 'Digital products, creative resources, templates and downloadable assets from Necrotix Lab.',
    alternates: { canonical: '/store' },
};

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function StorePage() {
    const products = await prisma.storeProduct.findMany({
        where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
        include: { _count: { select: { files: true } } },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const categories = [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))];

    return (
        <main className="min-h-screen bg-background px-6 pb-24 pt-36 text-foreground md:px-12 lg:px-24">
            <div className="mx-auto max-w-7xl">
                <header className="max-w-3xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <ShoppingBag className="h-3.5 w-3.5" /> Digital Store
                    </div>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Digital goods from the Lab.</h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                        Downloadable creative assets, templates, resources and software-related products. No physical shipping - every item is delivered digitally after purchase.
                    </p>
                    {categories.length ? <p className="mt-5 text-sm text-muted-foreground">Categories: {categories.join(' · ')}</p> : null}
                </header>

                {products.length ? (
                    <section className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Digital products">
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={`/store/${product.slug}`}
                                className="group overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.025] transition hover:-translate-y-1 hover:border-foreground/20 hover:bg-foreground/[0.045]"
                            >
                                <div
                                    className="aspect-[4/3] bg-foreground/[0.04] bg-cover bg-center"
                                    style={product.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` } : undefined}
                                    aria-hidden="true"
                                >
                                    {!product.coverImageUrl ? <div className="flex h-full items-center justify-center"><Download className="h-10 w-10 text-foreground/15" /></div> : null}
                                </div>
                                <div className="p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            {product.category ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{product.category}</p> : null}
                                            <h2 className="mt-2 text-xl font-bold tracking-tight group-hover:underline">{product.title}</h2>
                                        </div>
                                        {product.featured ? <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">Featured</span> : null}
                                    </div>
                                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{product.excerpt || product.description}</p>
                                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-foreground/10 pt-4">
                                        <div>
                                            {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-xs text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                            <p className="text-lg font-black">{product.priceCents === 0 ? 'Free' : money(product.priceCents, product.currency)}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{product._count.files} {product._count.files === 1 ? 'file' : 'files'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </section>
                ) : (
                    <section className="mt-14 rounded-3xl border border-dashed border-foreground/15 px-6 py-16 text-center">
                        <Download className="mx-auto h-8 w-8 text-foreground/25" />
                        <h2 className="mt-4 text-xl font-bold">The store is being prepared.</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Digital products will appear here as soon as they are published.</p>
                    </section>
                )}
            </div>
        </main>
    );
}
