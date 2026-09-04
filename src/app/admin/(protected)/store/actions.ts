'use server';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deleteDigitalProductFile, uploadDigitalProductFile, validateDigitalProductFile } from '@/lib/store-storage';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
type ProductStatus = (typeof STATUSES)[number];

export type StoreProductSaveResult = { ok: true; id: string; created: boolean } | { ok: false; error: string; field?: string };

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

function value(formData: FormData, name: string, max: number, required = false) {
    const result = String(formData.get(name) ?? '').trim();
    if (required && !result) throw new Error(`${name} is required.`);
    if (result.length > max) throw new Error(`${name} is too long.`);
    return result;
}

function cents(formData: FormData, name: string, required = false) {
    const raw = value(formData, name, 32, required).replace(',', '.');
    if (!raw && !required) return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${name} must be a valid price.`);
    const result = Math.round(Number(raw) * 100);
    if (!Number.isSafeInteger(result) || result < 0 || result > 100_000_000) throw new Error(`${name} is invalid.`);
    return result;
}

function optionalUrl(formData: FormData, name: string) {
    const raw = value(formData, name, 1000);
    if (!raw) return null;
    if (raw.startsWith('/')) return raw;
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${name} must use http(s).`);
    return parsed.toString();
}

function readForm(formData: FormData) {
    const title = value(formData, 'title', 180, true);
    const slug = value(formData, 'slug', 140, true).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('slug must use lowercase letters, numbers and hyphens only.');
    const rawStatus = value(formData, 'status', 20) || 'DRAFT';
    if (!STATUSES.includes(rawStatus as ProductStatus)) throw new Error('Invalid product status.');
    const status = rawStatus as ProductStatus;
    const priceCents = cents(formData, 'price', true)!;
    const compareAtPriceCents = cents(formData, 'compareAtPrice');
    const downloadLimit = Math.max(1, Math.min(100, Math.trunc(Number(formData.get('downloadLimit') || 5) || 5)));
    const lemonSqueezyVariantId = value(formData, 'lemonSqueezyVariantId', 120) || null;
    if (status === 'PUBLISHED' && !lemonSqueezyVariantId) throw new Error('Lemon Squeezy variant ID is required before publishing.');

    return {
        title,
        slug,
        excerpt: value(formData, 'excerpt', 500) || null,
        description: value(formData, 'description', 50_000, true),
        category: value(formData, 'category', 120) || null,
        tags: value(formData, 'tags', 2000).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 30),
        priceCents,
        compareAtPriceCents,
        currency: 'EUR',
        coverImageUrl: optionalUrl(formData, 'coverImageUrl'),
        lemonSqueezyVariantId,
        status,
        featured: formData.get('featured') === 'on',
        downloadLimit,
        seoTitle: value(formData, 'seoTitle', 180) || null,
        seoDescription: value(formData, 'seoDescription', 320) || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
    };
}

function uploadFrom(formData: FormData) {
    const candidate = formData.get('digitalFile');
    return candidate instanceof File && candidate.size > 0 ? candidate : null;
}

function safeName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 140) || 'download.bin';
}

function invalidate(slug?: string) {
    revalidatePath('/store');
    if (slug) revalidatePath(`/store/${slug}`);
    revalidatePath('/admin/store');
    revalidatePath('/sitemap.xml');
}

function saveError(error: unknown): StoreProductSaveResult {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { ok: false, field: 'slug', error: 'A store product with this slug already exists.' };
    }
    if (error instanceof Error) {
        const message = error.message;
        if (/^(title|slug|description|price|compareAtPrice|Lemon Squeezy|Invalid product|Digital product|Cloudflare R2|coverImageUrl|seoTitle|seoDescription|category|tags)/.test(message)) {
            return { ok: false, error: message };
        }
    }
    console.error('[Store Admin] Product save failed:', error);
    return { ok: false, error: 'Product could not be saved. Check the server logs if the problem continues.' };
}

export async function createStoreProduct(_previous: StoreProductSaveResult | null, formData: FormData): Promise<StoreProductSaveResult> {
    let productId = '';
    try {
        await requireEditor();
        const data = readForm(formData);
        const file = uploadFrom(formData);
        if (data.status === 'PUBLISHED' && !file) throw new Error('Digital product file is required before publishing.');
        if (file) validateDigitalProductFile(file);

        const product = await prisma.storeProduct.create({ data });
        productId = product.id;
        if (file) {
            const storageKey = `store/products/${product.id}/${randomUUID()}-${safeName(file.name)}`;
            await uploadDigitalProductFile(product.id, file, storageKey);
            await prisma.storeProductFile.create({
                data: { productId: product.id, fileName: file.name.slice(0, 220), storageKey, mimeType: file.type || 'application/octet-stream', size: file.size },
            });
        }
        invalidate(product.slug);
        return { ok: true, id: product.id, created: true };
    } catch (error) {
        if (productId) await prisma.storeProduct.delete({ where: { id: productId } }).catch(() => null);
        return saveError(error);
    }
}

export async function updateStoreProduct(productId: string, _previous: StoreProductSaveResult | null, formData: FormData): Promise<StoreProductSaveResult> {
    try {
        await requireEditor();
        const current = await prisma.storeProduct.findUnique({ where: { id: productId }, include: { _count: { select: { files: true } } } });
        if (!current) return { ok: false, error: 'Product not found.' };
        const data = readForm(formData);
        const file = uploadFrom(formData);
        if (file) validateDigitalProductFile(file);
        if (data.status === 'PUBLISHED' && current._count.files === 0 && !file) throw new Error('Digital product file is required before publishing.');

        await prisma.storeProduct.update({ where: { id: productId }, data });
        if (file) {
            const storageKey = `store/products/${productId}/${randomUUID()}-${safeName(file.name)}`;
            await uploadDigitalProductFile(productId, file, storageKey);
            await prisma.storeProductFile.create({
                data: { productId, fileName: file.name.slice(0, 220), storageKey, mimeType: file.type || 'application/octet-stream', size: file.size, sortOrder: current._count.files },
            });
        }
        invalidate(current.slug);
        if (current.slug !== data.slug) invalidate(data.slug);
        revalidatePath(`/admin/store/${productId}`);
        return { ok: true, id: productId, created: false };
    } catch (error) {
        return saveError(error);
    }
}

export async function removeStoreProductFile(fileId: string) {
    await requireEditor();
    const file = await prisma.storeProductFile.findUnique({ where: { id: fileId }, include: { product: true } });
    if (!file) return;
    await deleteDigitalProductFile(file.storageKey);
    await prisma.storeProductFile.delete({ where: { id: file.id } });
    invalidate(file.product.slug);
    revalidatePath(`/admin/store/${file.productId}`);
}
