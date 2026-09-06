import type { Metadata } from 'next';
import { StoreCatalogClient } from '@/components/store/StoreCatalogClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Digital Store | Necrotix Lab',
    description: 'Digital products, creative resources, templates and downloadable assets from Necrotix Lab.',
    alternates: { canonical: '/store' },
};

const STORE_PAGE_SIZE = 18;

export default async function StorePage() {
    const now = new Date();
    const publishedWhere = {
        status: 'PUBLISHED' as const,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    };

    const [products, totalProducts, categoryGroups] = await Promise.all([
        prisma.storeProduct.findMany({
            where: publishedWhere,
            select: {
                id: true,
                slug: true,
                title: true,
                excerpt: true,
                description: true,
                category: true,
                priceCents: true,
                compareAtPriceCents: true,
                currency: true,
                coverImageUrl: true,
                featured: true,
                createdAt: true,
                _count: { select: { files: true } },
            },
            orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
            take: STORE_PAGE_SIZE,
        }),
        prisma.storeProduct.count({ where: publishedWhere }),
        prisma.storeProduct.groupBy({
            by: ['category'],
            where: publishedWhere,
            _count: { _all: true },
        }),
    ]);

    const categories = categoryGroups
        .filter((group): group is typeof group & { category: string } => Boolean(group.category))
        .map((group) => ({ name: group.category, count: group._count._all }))
        .sort((a, b) => a.name.localeCompare(b.name));

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
                <StoreCatalogClient initialProducts={catalogProducts} categories={categories} totalProducts={totalProducts} />
            </div>
        </main>
    );
}
