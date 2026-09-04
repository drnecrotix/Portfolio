'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { StoreProductSaveResult } from '@/app/admin/(protected)/store/actions';

type ProductInput = {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    description: string;
    category: string | null;
    tags: string[];
    priceCents: number;
    compareAtPriceCents: number | null;
    coverImageUrl: string | null;
    paymentProvider: 'LEMON_SQUEEZY' | 'CREEM';
    lemonSqueezyVariantId: string | null;
    creemProductId: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    featured: boolean;
    downloadLimit: number;
    seoTitle: string | null;
    seoDescription: string | null;
};

type Action = (previous: StoreProductSaveResult | null, formData: FormData) => Promise<StoreProductSaveResult>;

const inputClass = 'mt-1.5 w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30';
const labelClass = 'block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground';

export function StoreProductForm({ product, action }: { product?: ProductInput | null; action: Action }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(action, null);

    useEffect(() => {
        if (!state?.ok) return;
        if (state.created) router.replace(`/admin/store/${state.id}`);
        else router.refresh();
    }, [router, state]);

    return (
        <form action={formAction} className="space-y-6">
            {state && !state.ok ? <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-500">{state.error}</div> : null}
            {state?.ok && !state.created ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">Product saved.</div> : null}

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6 md:grid-cols-2">
                <label className={labelClass}>Title<input className={inputClass} name="title" required maxLength={180} defaultValue={product?.title ?? ''} /></label>
                <label className={labelClass}>Slug<input className={inputClass} name="slug" required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="digital-product-name" defaultValue={product?.slug ?? ''} /></label>
                <label className={`${labelClass} md:col-span-2`}>Short description<textarea className={`${inputClass} min-h-24 resize-y`} name="excerpt" maxLength={500} defaultValue={product?.excerpt ?? ''} /></label>
                <label className={`${labelClass} md:col-span-2`}>Full description<textarea className={`${inputClass} min-h-48 resize-y`} name="description" required maxLength={50000} defaultValue={product?.description ?? ''} /></label>
                <label className={labelClass}>Category<input className={inputClass} name="category" maxLength={120} placeholder="Digital Art" defaultValue={product?.category ?? ''} /></label>
                <label className={labelClass}>Tags<input className={inputClass} name="tags" maxLength={2000} placeholder="svg, icons, ui" defaultValue={product?.tags.join(', ') ?? ''} /></label>
            </section>

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6 md:grid-cols-2">
                <label className={labelClass}>Price (EUR)<input className={inputClass} name="price" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" placeholder="Leave empty or enter 0 for Free download" defaultValue={product ? (product.priceCents > 0 ? (product.priceCents / 100).toFixed(2) : '') : ''} /></label>
                <label className={labelClass}>Compare-at price (EUR)<input className={inputClass} name="compareAtPrice" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" defaultValue={product?.compareAtPriceCents != null ? (product.compareAtPriceCents / 100).toFixed(2) : ''} /></label>
                <label className={labelClass}>Payment provider<select className={inputClass} name="paymentProvider" defaultValue={product?.paymentProvider ?? 'CREEM'}><option value="CREEM">Creem</option><option value="LEMON_SQUEEZY">Lemon Squeezy</option></select></label>
                <label className={labelClass}>Download limit<input className={inputClass} type="number" name="downloadLimit" min={1} max={100} defaultValue={product?.downloadLimit ?? 5} /></label>
                <label className={labelClass}>Creem Product ID<input className={inputClass} name="creemProductId" maxLength={160} placeholder="prod_..." defaultValue={product?.creemProductId ?? ''} /></label>
                <label className={labelClass}>Lemon Squeezy Variant ID<input className={inputClass} name="lemonSqueezyVariantId" maxLength={120} placeholder="123456" defaultValue={product?.lemonSqueezyVariantId ?? ''} /></label>
                <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Leave Price empty or set it to 0 to publish a <strong>Free download</strong>. Free products do not require Creem or Lemon Squeezy IDs. For paid products, only the identifier for the selected payment provider is required.</p>
                <label className={labelClass}>Status<select className={inputClass} name="status" defaultValue={product?.status ?? 'DRAFT'}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                <label className="flex items-center gap-3 self-end rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} /> Featured product</label>
            </section>

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6 md:grid-cols-2">
                <label className={`${labelClass} md:col-span-2`}>Cover image URL<input className={inputClass} name="coverImageUrl" maxLength={1000} placeholder="/uploads/... or https://..." defaultValue={product?.coverImageUrl ?? ''} /></label>
                <label className={`${labelClass} md:col-span-2`}>Add private digital file<input className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-xs file:font-bold file:text-background`} type="file" name="digitalFile" /></label>
                <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Files are stored privately in Cloudflare R2 and are never exposed through the public Media Library. Maximum 250 MB per uploaded file.</p>
            </section>

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6 md:grid-cols-2">
                <label className={labelClass}>SEO title<input className={inputClass} name="seoTitle" maxLength={180} defaultValue={product?.seoTitle ?? ''} /></label>
                <label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-24 resize-y`} name="seoDescription" maxLength={320} defaultValue={product?.seoDescription ?? ''} /></label>
            </section>

            <div className="flex justify-end">
                <button disabled={pending} className="min-h-12 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background disabled:cursor-wait disabled:opacity-60">{pending ? 'Saving...' : product ? 'Save product' : 'Create product'}</button>
            </div>
        </form>
    );
}
