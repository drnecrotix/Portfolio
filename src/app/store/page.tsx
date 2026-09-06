import type { Metadata } from 'next';
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
        <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background px-4 pb-24 pt-28 text-foreground sm:px-7 sm:pb-28 sm:pt-32 md:px-10 lg:px-14 xl:px-20">
            <div className="mx-auto min-w-0 w-full max-w-[1500px]">
                <h1 className="sr-only">Necrotix Lab Digital Store</h1>
                <StoreCatalogClient products={catalogProducts} categories={categories} />
            </div>
        </main>
    );
}
