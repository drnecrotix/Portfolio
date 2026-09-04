'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    loadStoreProviderCatalog,
    provisionPrivateStoreBucket,
    type PaymentProvider,
    type StoreProductSaveResult,
    type StoreProviderCatalogOption,
} from '@/app/admin/(protected)/store/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';
import { MediaPicker } from '@/components/admin/MediaPicker';

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
    paymentProvider: PaymentProvider;
    lemonSqueezyVariantId: string | null;
    creemProductId: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    featured: boolean;
    downloadLimit: number;
    seoTitle: string | null;
    seoDescription: string | null;
};

type Action = (previous: StoreProductSaveResult | null, formData: FormData) => Promise<StoreProductSaveResult>;

type Props = {
    product?: ProductInput | null;
    action: Action;
    storageConfigured?: boolean;
    storeBucket?: string | null;
};

type DraftRestoreDetail = { fields?: Record<string, string[]> };

const inputClass = 'mt-1.5 w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-45';
const labelClass = 'block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground';

function priceValue(cents: number | null | undefined) {
    return cents != null && cents > 0 ? (cents / 100).toFixed(2) : '';
}

export function StoreProductForm({ product, action, storageConfigured = false, storeBucket = null }: Props) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<StoreProductSaveResult | null>(null);
    const [pending, startTransition] = useTransition();
    const [isFree, setIsFree] = useState(product ? product.priceCents === 0 : false);
    const [price, setPrice] = useState(priceValue(product?.priceCents));
    const [provider, setProvider] = useState<PaymentProvider>(product?.paymentProvider ?? 'CREEM');
    const [creemProductId, setCreemProductId] = useState(product?.creemProductId ?? '');
    const [lemonVariantId, setLemonVariantId] = useState(product?.lemonSqueezyVariantId ?? '');
    const [autoCreateCreem, setAutoCreateCreem] = useState(!product?.creemProductId);
    const [coverImageUrl, setCoverImageUrl] = useState(product?.coverImageUrl ?? '');
    const [catalog, setCatalog] = useState<StoreProviderCatalogOption[]>([]);
    const [catalogProvider, setCatalogProvider] = useState<PaymentProvider | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogError, setCatalogError] = useState('');
    const [storageReady, setStorageReady] = useState(storageConfigured);
    const [bucketName, setBucketName] = useState(storeBucket ?? '');
    const [storageWorking, setStorageWorking] = useState(false);
    const [storageMessage, setStorageMessage] = useState('');
    const [storageError, setStorageError] = useState('');
    const draftKey = product ? `store-product:${product.id}` : 'store-product:new';

    useEffect(() => {
        const restore = (event: Event) => {
            const fields = (event as CustomEvent<DraftRestoreDetail>).detail?.fields;
            if (!fields) return;
            if (fields.productType?.[0]) setIsFree(fields.productType[0] === 'FREE');
            if (fields.price?.[0] != null) setPrice(fields.price[0]);
            if (fields.paymentProvider?.[0] === 'CREEM' || fields.paymentProvider?.[0] === 'LEMON_SQUEEZY') setProvider(fields.paymentProvider[0]);
            if (fields.creemProductId?.[0] != null) setCreemProductId(fields.creemProductId[0]);
            if (fields.lemonSqueezyVariantId?.[0] != null) setLemonVariantId(fields.lemonSqueezyVariantId[0]);
            if (fields.coverImageUrl?.[0] != null) setCoverImageUrl(fields.coverImageUrl[0]);
            setAutoCreateCreem(fields.autoCreateCreem?.includes('on') ?? autoCreateCreem);
        };
        window.addEventListener('necrotix:draft-restore', restore);
        return () => window.removeEventListener('necrotix:draft-restore', restore);
    }, [autoCreateCreem]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        const formData = new FormData(form);
        setState(null);
        startTransition(async () => {
            const result = await action(null, formData);
            setState(result);
            if (!result.ok) return;
            markDraftCommitted(draftKey);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (result.created) router.replace(`/admin/store/${result.id}`);
            else router.refresh();
        });
    };

    const loadCatalog = async () => {
        setCatalogLoading(true);
        setCatalogError('');
        try {
            const result = await loadStoreProviderCatalog(provider);
            if (!result.ok) throw new Error(result.error);
            setCatalog(result.options);
            setCatalogProvider(provider);
            if (!result.options.length) setCatalogError(`No ${provider === 'CREEM' ? 'Creem' : 'Lemon Squeezy'} products were found.`);
        } catch (error) {
            setCatalog([]);
            setCatalogError(error instanceof Error ? error.message : 'Provider catalog could not be loaded.');
        } finally {
            setCatalogLoading(false);
        }
    };

    const chooseProviderProduct = (id: string) => {
        const option = catalog.find((item) => item.id === id);
        if (provider === 'CREEM') setCreemProductId(id);
        else setLemonVariantId(id);
        if (option?.priceCents && option.priceCents > 0) setPrice((option.priceCents / 100).toFixed(2));
    };

    const provisionStorage = async () => {
        if (storageWorking) return;
        setStorageWorking(true);
        setStorageError('');
        setStorageMessage('');
        try {
            const result = await provisionPrivateStoreBucket();
            if (!result.ok) throw new Error(result.error);
            setStorageReady(true);
            setBucketName(result.bucket);
            setStorageMessage(result.message);
            router.refresh();
        } catch (error) {
            setStorageError(error instanceof Error ? error.message : 'Private Store bucket could not be prepared.');
        } finally {
            setStorageWorking(false);
        }
    };

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-6">
            <FormDraftGuard draftKey={draftKey} label="Store product" />

            {state && !state.ok ? (
                <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                    <strong>Product was not saved.</strong> {state.error}
                    <p className="mt-1 text-xs opacity-80">Your form values, selected cover and selected digital file are kept so you can fix the issue without starting again.</p>
                </div>
            ) : null}
            {state?.ok && !state.created ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{state.message || 'Product saved.'}</div> : null}

            <section className="grid gap-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6 md:grid-cols-2">
                <label className={labelClass}>Title<input className={inputClass} name="title" required maxLength={180} defaultValue={product?.title ?? ''} /></label>
                <label className={labelClass}>Slug<input className={inputClass} name="slug" required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="digital-product-name" defaultValue={product?.slug ?? ''} /></label>
                <label className={`${labelClass} md:col-span-2`}>Short description<textarea className={`${inputClass} min-h-24 resize-y`} name="excerpt" maxLength={500} defaultValue={product?.excerpt ?? ''} /></label>
                <label className={`${labelClass} md:col-span-2`}>Full description<textarea className={`${inputClass} min-h-48 resize-y`} name="description" required maxLength={50000} defaultValue={product?.description ?? ''} /></label>
                <label className={labelClass}>Category<input className={inputClass} name="category" maxLength={120} placeholder="Digital Art" defaultValue={product?.category ?? ''} /></label>
                <label className={labelClass}>Tags<input className={inputClass} name="tags" maxLength={2000} placeholder="svg, icons, ui" defaultValue={product?.tags.join(', ') ?? ''} /></label>
            </section>

            <section className="space-y-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6">
                <div>
                    <p className={labelClass}>Product type</p>
                    <input type="hidden" name="productType" value={isFree ? 'FREE' : 'PAID'} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => setIsFree(false)} className={`rounded-xl border px-4 py-4 text-left transition ${!isFree ? 'border-foreground/40 bg-foreground text-background' : 'border-foreground/10 hover:border-foreground/25'}`}>
                            <span className="block text-sm font-bold">Paid product</span><span className={`mt-1 block text-xs ${!isFree ? 'text-background/70' : 'text-muted-foreground'}`}>Use Creem or Lemon Squeezy checkout.</span>
                        </button>
                        <button type="button" onClick={() => setIsFree(true)} className={`rounded-xl border px-4 py-4 text-left transition ${isFree ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-foreground/10 hover:border-foreground/25'}`}>
                            <span className="block text-sm font-bold">Free download</span><span className="mt-1 block text-xs text-muted-foreground">No payment provider ID is required.</span>
                        </button>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <label className={labelClass}>Price (EUR)<input className={inputClass} name="price" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" required={!isFree} disabled={isFree} placeholder={isFree ? 'Free' : '9.99'} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
                    <label className={labelClass}>Compare-at price (EUR)<input className={inputClass} name="compareAtPrice" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" disabled={isFree} defaultValue={product?.compareAtPriceCents != null ? (product.compareAtPriceCents / 100).toFixed(2) : ''} /></label>
                    <label className={labelClass}>Download limit<input className={inputClass} type="number" name="downloadLimit" min={1} max={100} defaultValue={product?.downloadLimit ?? 5} /></label>
                    <label className={labelClass}>Status<select className={inputClass} name="status" defaultValue={product?.status ?? 'DRAFT'}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                </div>

                {!isFree ? (
                    <div className="rounded-xl border border-foreground/10 p-4 sm:p-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className={labelClass}>Payment provider
                                <select className={inputClass} name="paymentProvider" value={provider} onChange={(event) => { setProvider(event.target.value as PaymentProvider); setCatalog([]); setCatalogProvider(null); setCatalogError(''); }}>
                                    <option value="CREEM">Creem</option>
                                    <option value="LEMON_SQUEEZY">Lemon Squeezy</option>
                                </select>
                            </label>
                            <div className="self-end">
                                <button type="button" onClick={loadCatalog} disabled={catalogLoading} className="min-h-12 w-full rounded-xl border border-foreground/10 px-4 py-3 text-sm font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60">
                                    {catalogLoading ? 'Loading provider catalog...' : `Choose existing ${provider === 'CREEM' ? 'Creem product' : 'Lemon Squeezy product'}`}
                                </button>
                            </div>
                        </div>

                        {provider === 'CREEM' ? (
                            <label className="mt-4 flex items-start gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-sm">
                                <input type="checkbox" name="autoCreateCreem" checked={autoCreateCreem} onChange={(event) => setAutoCreateCreem(event.target.checked)} className="mt-0.5" />
                                <span><strong>Create automatically through Creem API when publishing</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">If no existing Creem product is selected, Necrotix Lab creates the one-time product using the title, description, EUR price and compatible cover image, then stores the returned Product ID automatically.</span></span>
                            </label>
                        ) : (
                            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-700 dark:text-amber-300">Lemon Squeezy currently exposes product and variant listing through its API, but not product/variant creation. Use the provider picker above - the CMS loads the IDs for you, so you do not need to copy them manually.</p>
                        )}

                        {catalogProvider === provider && catalog.length ? (
                            <label className={`${labelClass} mt-4`}>Provider catalog
                                <select className={inputClass} value={provider === 'CREEM' ? creemProductId : lemonVariantId} onChange={(event) => chooseProviderProduct(event.target.value)}>
                                    <option value="">Select a product...</option>
                                    {catalog.map((option) => <option key={option.id} value={option.id}>{option.label} - {option.detail}</option>)}
                                </select>
                            </label>
                        ) : null}
                        {catalogError ? <p className="mt-3 text-xs text-red-500">{catalogError}</p> : null}

                        <input type="hidden" name="creemProductId" value={creemProductId} />
                        <input type="hidden" name="lemonSqueezyVariantId" value={lemonVariantId} />
                        <details className="mt-4 rounded-xl border border-foreground/10 px-4 py-3">
                            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Advanced manual provider IDs</summary>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <label className={labelClass}>Creem Product ID<input className={inputClass} value={creemProductId} onChange={(event) => setCreemProductId(event.target.value)} maxLength={160} placeholder="prod_..." /></label>
                                <label className={labelClass}>Lemon Squeezy Variant ID<input className={inputClass} value={lemonVariantId} onChange={(event) => setLemonVariantId(event.target.value)} maxLength={120} placeholder="Variant ID" /></label>
                            </div>
                        </details>
                    </div>
                ) : (
                    <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">Free download is enabled. Price is stored as €0.00 and Creem Product ID / Lemon Squeezy Variant ID are ignored and cleared on save.</p>
                )}

                <label className="flex items-center gap-3 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} /> Featured product</label>
            </section>

            <section className="space-y-5 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 sm:p-6">
                <MediaPicker value={coverImageUrl} onChange={setCoverImageUrl} inputName="coverImageUrl" label="Cover image" initialKind="image" lockKind />
                <p className="text-xs leading-5 text-muted-foreground">Choose an image already uploaded to Media Library or upload a new one here. The selection remains intact when product validation fails.</p>

                <div className={`rounded-xl border px-4 py-4 ${storageReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-bold">Private Store storage</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{storageReady ? `Connected${bucketName ? ` to “${bucketName}”` : ''}. Product files remain outside the public Media Library.` : 'A separate private R2 bucket is required for downloadable files.'}</p>
                        </div>
                        {!storageReady ? <button type="button" onClick={provisionStorage} disabled={storageWorking} className="shrink-0 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background disabled:cursor-wait disabled:opacity-60">{storageWorking ? 'Preparing bucket...' : 'Set up automatically'}</button> : null}
                    </div>
                    {!storageReady ? <p className="mt-3 text-[11px] leading-5 text-muted-foreground">The CMS will reuse your configured R2 Account ID and S3 credentials and create a separate private bucket. If those credentials cannot create buckets, configure the bucket name manually in <Link href="/admin/api-integrations" className="font-bold underline underline-offset-2">API Integrations</Link>.</p> : null}
                    {storageMessage ? <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">{storageMessage}</p> : null}
                    {storageError ? <p className="mt-3 text-xs text-red-500">{storageError}</p> : null}
                </div>

                <label className={labelClass}>Add private digital file<input ref={fileInputRef} className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-xs file:font-bold file:text-background`} type="file" name="digitalFile" disabled={!storageReady} /></label>
                <p className="text-xs leading-5 text-muted-foreground">Maximum 250 MB. The form no longer auto-resets after a server validation error, so the selected local file remains selected while you correct the form.</p>
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
