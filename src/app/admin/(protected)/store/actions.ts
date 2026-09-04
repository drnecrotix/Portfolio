'use server';

import { randomUUID } from 'node:crypto';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { createCreemStoreProduct, listCreemProducts } from '@/lib/creem';
import {
    getStoredIntegrationValues,
    toIntegrationSettingsJson,
    updateIntegrationValues,
} from '@/lib/integration-credentials';
import { getRuntimeR2Config } from '@/lib/integration-runtime';
import { listLemonSqueezyVariants } from '@/lib/lemonsqueezy';
import { prisma } from '@/lib/prisma';
import { deleteDigitalProductFile, uploadDigitalProductFile, validateDigitalProductFile } from '@/lib/store-storage';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const PROVIDERS = ['LEMON_SQUEEZY', 'CREEM'] as const;
type ProductStatus = (typeof STATUSES)[number];
export type PaymentProvider = (typeof PROVIDERS)[number];

export type StoreProductSaveResult = { ok: true; id: string; created: boolean; message?: string } | { ok: false; error: string; field?: string };
export type StoreProviderCatalogOption = {
    id: string;
    label: string;
    detail: string;
    priceCents?: number;
    currency?: string;
};
export type StoreProviderCatalogResult = { ok: true; options: StoreProviderCatalogOption[] } | { ok: false; error: string };
export type StoreStorageSetupResult = { ok: true; bucket: string; created: boolean; message: string } | { ok: false; error: string };

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

async function requireApiAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
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
    const rawProvider = value(formData, 'paymentProvider', 32) || 'CREEM';
    if (!PROVIDERS.includes(rawProvider as PaymentProvider)) throw new Error('Invalid payment provider.');
    const paymentProvider = rawProvider as PaymentProvider;
    const submittedPrice = cents(formData, 'price') ?? 0;
    const productType = value(formData, 'productType', 16) || (submittedPrice === 0 ? 'FREE' : 'PAID');
    if (!['FREE', 'PAID'].includes(productType)) throw new Error('Invalid product type.');
    const freeDownload = productType === 'FREE';
    const priceCents = freeDownload ? 0 : submittedPrice;
    if (!freeDownload && priceCents <= 0) throw new Error('price is required for a paid product.');
    const compareAtPriceCents = freeDownload ? null : cents(formData, 'compareAtPrice');
    const downloadLimit = Math.max(1, Math.min(100, Math.trunc(Number(formData.get('downloadLimit') || 5) || 5)));
    const lemonSqueezyVariantId = freeDownload ? null : (value(formData, 'lemonSqueezyVariantId', 120) || null);
    const creemProductId = freeDownload ? null : (value(formData, 'creemProductId', 160) || null);
    if (creemProductId && !/^prod_[A-Za-z0-9]+$/.test(creemProductId)) throw new Error('Creem Product ID must start with prod_.');

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
        paymentProvider,
        lemonSqueezyVariantId,
        creemProductId,
        status,
        featured: formData.get('featured') === 'on',
        downloadLimit,
        seoTitle: value(formData, 'seoTitle', 180) || null,
        seoDescription: value(formData, 'seoDescription', 320) || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
    };
}

type StoreProductData = ReturnType<typeof readForm>;

async function resolveProviderMapping(data: StoreProductData, formData: FormData): Promise<StoreProductData> {
    if (data.priceCents === 0 || data.status !== 'PUBLISHED') return data;

    if (data.paymentProvider === 'CREEM') {
        if (data.creemProductId) return data;
        if (formData.get('autoCreateCreem') !== 'on') {
            throw new Error('Creem Product ID is missing. Enable automatic Creem product creation or choose an existing Creem product.');
        }
        const created = await createCreemStoreProduct({
            name: data.title,
            description: data.excerpt || data.description,
            priceCents: data.priceCents,
            currency: data.currency,
            coverImageUrl: data.coverImageUrl,
        });
        return { ...data, creemProductId: created.id };
    }

    if (!data.lemonSqueezyVariantId) {
        throw new Error('Choose a Lemon Squeezy product/variant from the provider catalog before publishing. Manual ID lookup is not required.');
    }
    return data;
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
        if (/^(title|slug|description|price|compareAtPrice|Lemon Squeezy|Creem|Invalid product|Invalid payment|Digital product|Cloudflare R2|coverImageUrl|seoTitle|seoDescription|category|tags|Choose a Lemon|CREEM_|LEMON_)/.test(message)) {
            return { ok: false, error: message };
        }
    }
    console.error('[Store Admin] Product save failed:', error);
    return { ok: false, error: 'Product could not be saved. Check the server logs if the problem continues.' };
}

export async function loadStoreProviderCatalog(provider: PaymentProvider): Promise<StoreProviderCatalogResult> {
    try {
        await requireEditor();
        if (!PROVIDERS.includes(provider)) return { ok: false, error: 'Unknown payment provider.' };
        if (provider === 'CREEM') {
            const products = await listCreemProducts();
            return {
                ok: true,
                options: products.map((product) => ({
                    id: product.id,
                    label: product.name,
                    detail: `${product.mode || 'Creem'} · ${product.status || 'product'} · ${new Intl.NumberFormat('en', { style: 'currency', currency: product.currency || 'EUR' }).format(product.priceCents / 100)}`,
                    priceCents: product.priceCents,
                    currency: product.currency,
                })),
            };
        }

        const variants = await listLemonSqueezyVariants();
        return {
            ok: true,
            options: variants.map((variant) => ({
                id: variant.id,
                label: variant.variantName && variant.variantName !== 'Default' ? `${variant.productName} - ${variant.variantName}` : variant.productName,
                detail: `${variant.testMode ? 'Test' : 'Live'} · ${variant.status || 'variant'}${variant.priceFormatted ? ` · ${variant.priceFormatted}` : ''}`,
                priceCents: variant.priceCents,
                currency: 'EUR',
            })),
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Provider catalog could not be loaded.' };
    }
}

function suggestedStoreBucket(publicBucket: string, accountId: string) {
    const seed = (publicBucket || `necrotixlab-${accountId.slice(0, 8)}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'necrotixlab';
    const suffix = '-store-private';
    return `${seed.slice(0, Math.max(3, 63 - suffix.length)).replace(/-+$/g, '')}${suffix}`;
}

export async function provisionPrivateStoreBucket(): Promise<StoreStorageSetupResult> {
    try {
        await requireApiAdmin();
        const runtime = await getRuntimeR2Config();
        if (!runtime.accountId || !runtime.accessKeyId || !runtime.secretAccessKey) {
            return { ok: false, error: 'Configure the Cloudflare R2 Account ID, Access Key ID and Secret Access Key in Admin > API Integrations first.' };
        }

        const bucket = runtime.storeBucket || suggestedStoreBucket(runtime.bucket, runtime.accountId);
        const client = new S3Client({
            region: 'auto',
            endpoint: `https://${runtime.accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: runtime.accessKeyId, secretAccessKey: runtime.secretAccessKey },
        });
        let created = false;
        try {
            try {
                await client.send(new HeadBucketCommand({ Bucket: bucket }));
            } catch {
                await client.send(new CreateBucketCommand({ Bucket: bucket }));
                created = true;
            }
        } finally {
            client.destroy();
        }

        if (!runtime.storeBucket) {
            const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { integrationSettings: true } });
            const current = getStoredIntegrationValues(settings?.integrationSettings);
            const updated = updateIntegrationValues(settings?.integrationSettings, { ...current, 'r2.storeBucket': bucket });
            await prisma.siteSettings.upsert({
                where: { id: 'default' },
                create: { id: 'default', integrationSettings: toIntegrationSettingsJson(updated) },
                update: { integrationSettings: toIntegrationSettingsJson(updated) },
            });
        }

        revalidatePath('/admin/api-integrations');
        revalidatePath('/admin/store');
        revalidatePath('/admin/store/new');
        return {
            ok: true,
            bucket,
            created,
            message: created
                ? `Private Store bucket “${bucket}” was created and connected. New R2 buckets are private by default.`
                : `Private Store bucket “${bucket}” is connected and reachable.`,
        };
    } catch (error) {
        console.error('[Store Admin] R2 private bucket provisioning failed:', error);
        return { ok: false, error: error instanceof Error ? `Private Store bucket could not be prepared: ${error.message}` : 'Private Store bucket could not be prepared.' };
    }
}

export async function createStoreProduct(_previous: StoreProductSaveResult | null, formData: FormData): Promise<StoreProductSaveResult> {
    let productId = '';
    try {
        await requireEditor();
        const baseData = readForm(formData);
        const data = await resolveProviderMapping(baseData, formData);
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
        return { ok: true, id: product.id, created: true, message: data.priceCents === 0 ? 'Free product created.' : 'Product created.' };
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
        const baseData = readForm(formData);
        const data = await resolveProviderMapping(baseData, formData);
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
        return { ok: true, id: productId, created: false, message: data.priceCents === 0 ? 'Free product saved.' : 'Product saved.' };
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
