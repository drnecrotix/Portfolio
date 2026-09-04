import type { Metadata } from 'next';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { StoreCatalogClient } from '@/components/store/StoreCatalogClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Digital Store | Necrotix Lab',
    description: 'Digital products, creative resources, templates and downloadable assets from Necrotix Lab.',
    alternates: { canonical: '/store' },
};

export default async function StorePage() {
    const products = await prisma.storeProduct.findMany({
        where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
        include: { _count: { select: { files: true } } },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const categories = [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
    const catalogProducts = products.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        excerpt: product.excerpt,
        description: product.description,
        category: product.category,
        priceCents: product.priceCents,
        compareAtPriceCents: product.compareAtPriceCents,
        currency: product.currency,
        coverImageUrl: product.coverImageUrl,
        featured: product.featured,
        fileCount: product._count.files,
        createdAt: product.createdAt.toISOString(),
    }));

    return (
        <main className="min-h-screen bg-background px-5 pb-28 pt-32 text-foreground sm:px-7 md:px-10 lg:px-14 xl:px-20">
            <div className="mx-auto max-w-[1500px]">
                <header className="relative overflow-hidden rounded-[2.4rem] border border-foreground/10 bg-foreground/[0.018] px-6 py-9 shadow-[0_30px_100px_rgba(0,0,0,0.14)] sm:px-9 sm:py-12 lg:px-12 lg:py-14">
                    <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-foreground/[0.045] blur-3xl" />
                    <div className="relative max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-xl">
                            <ShoppingBag className="h-3.5 w-3.5" /> Necrotix Lab Marketplace
                        </div>
                        <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">Creative digital goods, built in the Lab.</h1>
                        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Original digital art, downloadable resources, templates and software-related assets. Every product is delivered digitally with protected access.</p>
                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
                            <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Curated releases</span>
                            <span>Instant digital delivery</span>
                            <span>{products.length} product{products.length === 1 ? '' : 's'} available</span>
                        </div>
                    </div>
                </header>

                <StoreCatalogClient products={catalogProducts} categories={categories} />
            </div>
        </main>
    );
}
