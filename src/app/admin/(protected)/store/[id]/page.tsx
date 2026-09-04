import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoreProductForm } from '@/components/admin/StoreProductForm';
import { prisma } from '@/lib/prisma';
import { getLocalStoreStorageStatus } from '@/lib/store-storage';
import { removeStoreProductFile, updateStoreProduct } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditStoreProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [product, storage] = await Promise.all([
        prisma.storeProduct.findUnique({
            where: { id },
            include: { files: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
        }),
        getLocalStoreStorageStatus(),
    ]);
    if (!product) notFound();

    return (
        <div className="mx-auto max-w-5xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Digital Store</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{product.title}</h1><p className="mt-1 text-sm text-muted-foreground">/store/{product.slug}</p></div>
                <div className="flex gap-3"><Link href={`/store/${product.slug}`} target="_blank" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Preview</Link><Link href="/admin/store" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back</Link></div>
            </header>

            <StoreProductForm
                product={{
                    id: product.id,
                    title: product.title,
                    slug: product.slug,
                    excerpt: product.excerpt,
                    description: product.description,
                    category: product.category,
                    tags: product.tags,
                    priceCents: product.priceCents,
                    compareAtPriceCents: product.compareAtPriceCents,
                    coverImageUrl: product.coverImageUrl,
                    paymentProvider: product.paymentProvider,
                    lemonSqueezyVariantId: product.lemonSqueezyVariantId,
                    creemProductId: product.creemProductId,
                    status: product.status,
                    featured: product.featured,
                    downloadLimit: product.downloadLimit,
                    seoTitle: product.seoTitle,
                    seoDescription: product.seoDescription,
                }}
                action={updateStoreProduct.bind(null, product.id)}
                storageConfigured={storage.ready}
                storeBucket={storage.label}
            />

            <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold">Private product files</h2><p className="mt-1 text-sm text-muted-foreground">These files are available only through valid purchase download grants.</p></div><span className="text-xs text-muted-foreground">{product.files.length} files</span></div>
                <div className="mt-5 space-y-2">
                    {product.files.length ? product.files.map((file) => (
                        <div key={file.id} className="flex flex-col gap-3 rounded-xl border border-foreground/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0"><p className="truncate text-sm font-semibold">{file.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.mimeType}</p></div>
                            <form action={removeStoreProductFile.bind(null, file.id)}><button className="text-xs font-semibold text-red-500 hover:underline">Remove file</button></form>
                        </div>
                    )) : <p className="rounded-xl border border-dashed border-foreground/10 px-4 py-8 text-center text-sm text-muted-foreground">No private files uploaded yet.</p>}
                </div>
            </section>
        </div>
    );
}
