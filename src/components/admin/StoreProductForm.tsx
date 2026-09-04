'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CloudUpload, Link2, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import {
    loadStoreProviderCatalog,
    type PaymentProvider,
    type StoreProductSaveResult,
    type StoreProviderCatalogOption,
} from '@/app/admin/(protected)/store/actions';
import { FormDraftGuard, markDraftCommitted } from '@/components/admin/FormDraftGuard';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { StatusToast } from '@/components/admin/StatusToast';

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
type Notice = { type: 'success' | 'error'; message: string; key: number } | null;

const inputClass = 'mt-1.5 w-full rounded-xl border border-foreground/10 bg-background px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-45';
const labelClass = 'block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground';
const panelClass = 'rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.06)] sm:p-6';

function priceValue(cents: number | null | undefined) {
    return cents != null && cents > 0 ? (cents / 100).toFixed(2) : '';
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 140);
}

export function StoreProductForm({ product, action, storageConfigured = false, storeBucket = null }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<StoreProductSaveResult | null>(null);
    const [notice, setNotice] = useState<Notice>(null);
    const [pending, startTransition] = useTransition();
    const [dirty, setDirty] = useState(false);
    const [title, setTitle] = useState(product?.title ?? '');
    const [slug, setSlug] = useState(product?.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(Boolean(product));
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
    const [deliveryMode, setDeliveryMode] = useState<'UPLOAD' | 'LINK'>('UPLOAD');
    const [externalUrl, setExternalUrl] = useState('');
    const [externalFileName, setExternalFileName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const draftKey = product ? `store-product:${product.id}` : 'store-product:new';

    useEffect(() => {
        const restore = (event: Event) => {
            const fields = (event as CustomEvent<DraftRestoreDetail>).detail?.fields;
            if (!fields) return;
            if (fields.title?.[0] != null) setTitle(fields.title[0]);
            if (fields.slug?.[0] != null) { setSlug(fields.slug[0]); setSlugTouched(true); }
            if (fields.productType?.[0]) setIsFree(fields.productType[0] === 'FREE');
            if (fields.price?.[0] != null) setPrice(fields.price[0]);
            if (fields.paymentProvider?.[0] === 'CREEM' || fields.paymentProvider?.[0] === 'LEMON_SQUEEZY') setProvider(fields.paymentProvider[0]);
            if (fields.creemProductId?.[0] != null) setCreemProductId(fields.creemProductId[0]);
            if (fields.lemonSqueezyVariantId?.[0] != null) setLemonVariantId(fields.lemonSqueezyVariantId[0]);
            if (fields.coverImageUrl?.[0] != null) setCoverImageUrl(fields.coverImageUrl[0]);
            if (fields.deliveryType?.[0] === 'UPLOAD' || fields.deliveryType?.[0] === 'LINK') setDeliveryMode(fields.deliveryType[0]);
            if (fields.externalFileUrl?.[0] != null) setExternalUrl(fields.externalFileUrl[0]);
            if (fields.externalFileName?.[0] != null) setExternalFileName(fields.externalFileName[0]);
            setAutoCreateCreem(fields.autoCreateCreem?.includes('on') ?? autoCreateCreem);
            setDirty(true);
        };
        window.addEventListener('necrotix:draft-restore', restore);
        return () => window.removeEventListener('necrotix:draft-restore', restore);
    }, [autoCreateCreem]);

    const announce = (type: 'success' | 'error', message: string) => setNotice({ type, message, key: Date.now() });

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        setState(null);
        startTransition(async () => {
            const result = await action(null, formData);
            setState(result);
            if (!result.ok) {
                announce('error', result.error || 'Product was not saved.');
                return;
            }
            markDraftCommitted(draftKey);
            setDirty(false);
            setSelectedFileName('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            announce('success', result.message || (result.created ? 'Product created.' : 'Product saved.'));
            if (result.created) {
                router.replace(`/admin/store/${result.id}?saved=created`);
            }
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
        setDirty(true);
    };

    return (
        <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-6">
            <FormDraftGuard draftKey={draftKey} label="Store product" />
            {notice ? <StatusToast key={notice.key} type={notice.type} message={notice.message} /> : null}

            {state && !state.ok ? (
                <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                    <strong>Product was not saved.</strong> {state.error}
                    <p className="mt-1 text-xs opacity-80">Nothing in the editor is cleared after a validation or server error. Fix the highlighted problem and save again.</p>
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                <div className="space-y-6">
                    <section className={panelClass}>
                        <div className="mb-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Product details</p>
                            <h2 className="mt-1 text-lg font-bold">Listing information</h2>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className={labelClass}>Title
                                <input
                                    className={inputClass}
                                    name="title"
                                    required
                                    maxLength={180}
                                    value={title}
                                    onChange={(event) => {
                                        const next = event.target.value;
                                        setTitle(next);
                                        if (!slugTouched) setSlug(slugify(next));
                                    }}
                                />
                            </label>
                            <label className={labelClass}>Slug
                                <input className={inputClass} name="slug" required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="digital-product-name" value={slug} onChange={(event) => { setSlug(slugify(event.target.value)); setSlugTouched(true); }} />
                            </label>
                            <label className={`${labelClass} md:col-span-2`}>Short description<textarea className={`${inputClass} min-h-24 resize-y`} name="excerpt" maxLength={500} defaultValue={product?.excerpt ?? ''} /></label>
                            <label className={`${labelClass} md:col-span-2`}>Full description<textarea className={`${inputClass} min-h-48 resize-y`} name="description" required maxLength={50000} defaultValue={product?.description ?? ''} /></label>
                            <label className={labelClass}>Category<input className={inputClass} name="category" maxLength={120} placeholder="Digital Art" defaultValue={product?.category ?? ''} /></label>
                            <label className={labelClass}>Tags<input className={inputClass} name="tags" maxLength={2000} placeholder="svg, icons, ui" defaultValue={product?.tags.join(', ') ?? ''} /></label>
                        </div>
                    </section>

                    <section className={panelClass}>
                        <div className="mb-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Media</p>
                            <h2 className="mt-1 text-lg font-bold">Cover image</h2>
                        </div>
                        <MediaPicker value={coverImageUrl} onChange={(value) => { setCoverImageUrl(value); setDirty(true); }} inputName="coverImageUrl" label="Product cover" initialKind="image" lockKind />
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose an existing Media Library image or upload a new one. The selection survives product validation errors.</p>
                    </section>

                    <section className={panelClass}>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Delivery</p>
                                <h2 className="mt-1 text-lg font-bold">Digital product source</h2>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Upload a private file to Necrotix Lab or attach an HTTPS source link. External links are delivered through the protected Necrotix Lab download endpoint instead of being exposed to customers.</p>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${storageConfigured ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-300'}`}>
                                <ShieldCheck className="h-3.5 w-3.5" /> {storageConfigured ? 'Private storage ready' : 'Upload storage unavailable'}
                            </span>
                        </div>

                        <input type="hidden" name="deliveryType" value={deliveryMode} />
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => { setDeliveryMode('UPLOAD'); setDirty(true); }} className={`rounded-xl border p-4 text-left transition ${deliveryMode === 'UPLOAD' ? 'border-foreground/35 bg-foreground/[0.055]' : 'border-foreground/10 hover:border-foreground/20'}`}>
                                <Upload className="h-5 w-5" />
                                <span className="mt-3 block text-sm font-bold">Upload private file</span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">Store the file directly on the Necrotix Lab server.</span>
                            </button>
                            <button type="button" onClick={() => { setDeliveryMode('LINK'); setDirty(true); }} className={`rounded-xl border p-4 text-left transition ${deliveryMode === 'LINK' ? 'border-foreground/35 bg-foreground/[0.055]' : 'border-foreground/10 hover:border-foreground/20'}`}>
                                <Link2 className="h-5 w-5" />
                                <span className="mt-3 block text-sm font-bold">Masked external link</span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">Keep the original source URL server-side and proxy the download.</span>
                            </button>
                        </div>

                        {deliveryMode === 'UPLOAD' ? (
                            <div className="mt-5">
                                <label className={labelClass}>Add private digital file
                                    <input
                                        ref={fileInputRef}
                                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-xs file:font-bold file:text-background`}
                                        type="file"
                                        name="digitalFile"
                                        disabled={!storageConfigured}
                                        onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? '')}
                                    />
                                </label>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <CloudUpload className="h-4 w-4" />
                                    <span>{selectedFileName ? `Selected: ${selectedFileName}` : (storageConfigured ? (storeBucket || 'Necrotix Lab local private storage') : 'Local upload is currently unavailable.')}</span>
                                </div>
                                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">For large files that exceed your hosting request limit, use Masked external link instead of uploading through the browser.</p>
                            </div>
                        ) : (
                            <div className="mt-5 grid gap-5 md:grid-cols-2">
                                <label className={`${labelClass} md:col-span-2`}>External HTTPS file URL
                                    <input className={inputClass} name="externalFileUrl" type="url" inputMode="url" placeholder="https://cloud.example.com/private-download.zip" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} />
                                </label>
                                <label className={`${labelClass} md:col-span-2`}>Download filename
                                    <input className={inputClass} name="externalFileName" maxLength={220} placeholder="product-files.zip" value={externalFileName} onChange={(event) => setExternalFileName(event.target.value)} />
                                </label>
                                <div className="md:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                                    The original link is not rendered in the Store or returned to the browser. Customers download from a Necrotix Lab access-token URL while the server fetches the source file. Only HTTPS links are accepted and local/private network targets are blocked.
                                </div>
                            </div>
                        )}
                    </section>

                    <section className={panelClass}>
                        <div className="mb-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Search visibility</p>
                            <h2 className="mt-1 text-lg font-bold">SEO</h2>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <label className={labelClass}>SEO title<input className={inputClass} name="seoTitle" maxLength={180} defaultValue={product?.seoTitle ?? ''} /></label>
                            <label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-24 resize-y`} name="seoDescription" maxLength={320} defaultValue={product?.seoDescription ?? ''} /></label>
                        </div>
                    </section>
                </div>

                <aside className="space-y-5 xl:sticky xl:top-6">
                    <section className={panelClass}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Publishing</p>
                        <h2 className="mt-1 text-lg font-bold">Product setup</h2>

                        <div className="mt-5">
                            <p className={labelClass}>Product type</p>
                            <input type="hidden" name="productType" value={isFree ? 'FREE' : 'PAID'} />
                            <div className="mt-2 grid gap-2">
                                <button type="button" onClick={() => { setIsFree(false); setDirty(true); }} className={`rounded-xl border px-4 py-3 text-left transition ${!isFree ? 'border-foreground/40 bg-foreground text-background' : 'border-foreground/10 hover:border-foreground/25'}`}>
                                    <span className="block text-sm font-bold">Paid product</span><span className={`mt-1 block text-xs ${!isFree ? 'text-background/70' : 'text-muted-foreground'}`}>Creem or Lemon Squeezy checkout.</span>
                                </button>
                                <button type="button" onClick={() => { setIsFree(true); setDirty(true); }} className={`rounded-xl border px-4 py-3 text-left transition ${isFree ? 'border-emerald-500/35 bg-emerald-500/8' : 'border-foreground/10 hover:border-foreground/25'}`}>
                                    <span className="block text-sm font-bold">Free download</span><span className="mt-1 block text-xs text-muted-foreground">No payment provider ID required.</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4">
                            <label className={labelClass}>Price (EUR)<input className={inputClass} name="price" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" required={!isFree} disabled={isFree} placeholder={isFree ? 'Free' : '9.99'} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
                            <label className={labelClass}>Compare-at price<input className={inputClass} name="compareAtPrice" inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" disabled={isFree} defaultValue={product?.compareAtPriceCents != null ? (product.compareAtPriceCents / 100).toFixed(2) : ''} /></label>
                            <label className={labelClass}>Download limit<input className={inputClass} type="number" name="downloadLimit" min={1} max={100} defaultValue={product?.downloadLimit ?? 5} /></label>
                            <label className={labelClass}>Status<select className={inputClass} name="status" defaultValue={product?.status ?? 'DRAFT'}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label>
                            <label className="flex items-center gap-3 rounded-xl border border-foreground/10 px-4 py-3 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} /> Featured product</label>
                        </div>
                    </section>

                    {!isFree ? (
                        <section className={panelClass}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Checkout</p>
                            <h2 className="mt-1 text-lg font-bold">Payment provider</h2>
                            <label className={`${labelClass} mt-5`}>Provider
                                <select className={inputClass} name="paymentProvider" value={provider} onChange={(event) => { setProvider(event.target.value as PaymentProvider); setCatalog([]); setCatalogProvider(null); setCatalogError(''); }}>
                                    <option value="CREEM">Creem</option>
                                    <option value="LEMON_SQUEEZY">Lemon Squeezy</option>
                                </select>
                            </label>
                            <button type="button" onClick={loadCatalog} disabled={catalogLoading} className="mt-3 min-h-11 w-full rounded-xl border border-foreground/10 px-4 py-2.5 text-xs font-bold transition hover:bg-muted disabled:cursor-wait disabled:opacity-60">
                                {catalogLoading ? 'Loading catalog...' : 'Choose existing provider product'}
                            </button>

                            {provider === 'CREEM' ? (
                                <label className="mt-4 flex items-start gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5">
                                    <input type="checkbox" name="autoCreateCreem" checked={autoCreateCreem} onChange={(event) => setAutoCreateCreem(event.target.checked)} className="mt-0.5" />
                                    <span><strong>Create automatically through Creem API</strong><span className="mt-1 block text-muted-foreground">If no existing product is selected, it is created automatically when publishing.</span></span>
                                </label>
                            ) : <p className="mt-4 text-xs leading-5 text-muted-foreground">Choose a Lemon Squeezy variant from the API catalog. The Variant ID is filled automatically.</p>}

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
                                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Advanced provider IDs</summary>
                                <div className="mt-4 grid gap-4">
                                    <label className={labelClass}>Creem Product ID<input className={inputClass} value={creemProductId} onChange={(event) => setCreemProductId(event.target.value)} maxLength={160} placeholder="prod_..." /></label>
                                    <label className={labelClass}>Lemon Squeezy Variant ID<input className={inputClass} value={lemonVariantId} onChange={(event) => setLemonVariantId(event.target.value)} maxLength={120} placeholder="Variant ID" /></label>
                                </div>
                            </details>
                        </section>
                    ) : null}
                </aside>
            </div>

            <div className="sticky bottom-3 z-30 rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-center gap-3 px-1">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : dirty ? <Save className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <div>
                        <p className="text-xs font-bold">{pending ? 'Saving product...' : dirty ? 'Unsaved changes' : product ? 'All changes saved' : 'Ready to create'}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">Save uses an in-place server request. Validation errors do not reload or clear the editor.</p>
                    </div>
                </div>
                <div className="mt-3 flex gap-2 sm:mt-0">
                    <Link href="/admin/store" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/10 px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:text-foreground">Cancel</Link>
                    <button disabled={pending} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-xs font-bold text-background disabled:cursor-wait disabled:opacity-60 sm:flex-none">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {pending ? 'Saving...' : product ? 'Save product' : 'Create product'}
                    </button>
                </div>
            </div>
        </form>
    );
}
