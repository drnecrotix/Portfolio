import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canAccessManagedPage, getManagedPageAccessSettings } from '@/lib/page-access';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 24;
const MAX_OFFSET = 10_000;

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
    try {
        const [pageAccess, session] = await Promise.all([
            getManagedPageAccessSettings(),
            auth().catch(() => null),
        ]);
        const isAdmin = Boolean(session?.user && ['OWNER', 'ADMIN'].includes(session.user.role));
        if (!canAccessManagedPage(pageAccess, 'store', isAdmin)) {
            return NextResponse.json({ error: 'Store is unavailable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
        }

        const url = new URL(request.url);
        const query = (url.searchParams.get('q') || '').trim().slice(0, 80);
        const category = (url.searchParams.get('category') || '').trim().slice(0, 80);
        const sort = url.searchParams.get('sort') || 'featured';
        const offset = clampInteger(url.searchParams.get('offset'), 0, 0, MAX_OFFSET);
        const limit = clampInteger(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
        const now = new Date();

        const filters: Prisma.StoreProductWhereInput[] = [];
        if (category) filters.push({ category });
        if (query) {
            filters.push({
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { excerpt: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { category: { contains: query, mode: 'insensitive' } },
                ],
            });
        }

        const where: Prisma.StoreProductWhereInput = {
            status: 'PUBLISHED',
            OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
            ...(filters.length ? { AND: filters } : {}),
        };

        const orderBy: Prisma.StoreProductOrderByWithRelationInput[] = sort === 'price-low'
            ? [{ priceCents: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }]
            : sort === 'price-high'
                ? [{ priceCents: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }]
                : sort === 'newest'
                    ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }]
                    : [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];

        const [products, total] = await Promise.all([
            prisma.storeProduct.findMany({
                where,
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
                orderBy,
                skip: offset,
                take: limit,
            }),
            prisma.storeProduct.count({ where }),
        ]);

        const items = products.map((product) => ({
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

        return NextResponse.json(
            { products: items, total, hasMore: offset + items.length < total },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
    } catch (error) {
        console.error('Store catalog pagination failed:', error);
        return NextResponse.json(
            { error: 'Unable to load Store products.' },
            { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
    }
}
