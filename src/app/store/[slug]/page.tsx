import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, FileArchive, ShieldCheck, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { BuyButton } from '@/components/store/BuyButton';
import { prisma } from '@/lib/prisma';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { isExternalDigitalProductStorageKey } from '@/lib/store-storage';

export const dynamic = 'force-dynamic';

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

async function findProduct(slug: string) {
    return prisma.storeProduct.findUnique({
        where: { slug },
        include: { files: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const product = await findProduct(slug);
    if (!product || product.status !== 'PUBLISHED') return { robots: { index: false, follow: false } };
    const baseUrl = getPublicSiteUrl().replace(/\/$/, '');
    const canonical = `${baseUrl}/store/${product.slug}`;
    const title = product.seoTitle?.trim() || product.title;
    const description = product.seoDescription?.trim() || product.excerpt?.trim() || product.description.slice(0, 240);
    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            type: 'website',
            url: canonical,
            title,
            description,
            images: product.coverImageUrl ? [{ url: product.coverImageUrl, alt: product.title }] : undefined,
        },
        twitter: {
            card: product.coverImageUrl ? 'summary_large_image' : 'summary',
            title,
            description,
            images: product.coverImageUrl ? [product.coverImageUrl] : undefined,
        },
    };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = await findProduct(slug);
    if (!product || product.status !== 'PUBLISHED' || (product.publishedAt && product.publishedAt > new Date())) notFound();

    const baseUrl = getPublicSiteUrl().replace(/\/$/, '');
    const freeDownload = product.priceCents === 0;
    const providerReady = freeDownload || (product.paymentProvider === 'CREEM' ? Boolean(product.creemProductId) : Boolean(product.lemonSqueezyVariantId));
    const available = Boolean(product.files.length && providerReady);
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.excerpt || product.description,
        image: product.coverImageUrl || undefined,
        category: product.category || 'Digital Product',
        url: `${baseUrl}/store/${product.slug}`,
        offers: {
            '@type': 'Offer',
            priceCurrency: product.currency,
            price: (product.priceCents / 100).toFixed(2),
            availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${baseUrl}/store/${product.slug}`,
        },
    };

    return (
        <main className="min-h-screen bg-background px-5 pb-28 pt-28 text-foreground sm:px-7 md:px-10 lg:px-14 xl:px-20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, '\\u003c') }} />
            <div className="mx-auto max-w-[1500px]">
                <Link href="/store" className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-foreground/20 hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Store
                </Link>

                <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.42fr)_minmax(340px,0.58fr)] lg:gap-12">
                    <div>
                        <div
                            className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-foreground/10 bg-foreground/[0.035] bg-cover bg-center shadow-[0_28px_90px_rgba(0,0,0,0.16)]"
                            style={product.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` } : undefined}
                            aria-hidden="true"
                        >
                            {!product.coverImageUrl ? <div className="flex h-full items-center justify-center"><FileArchive className="h-16 w-16 text-foreground/15" /></div> : null}
                            {product.featured ? <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md"><Sparkles className="h-3.5 w-3.5" /> Featured</span> : null}
                        </div>

                        <section className="mt-10 rounded-[1.6rem] border border-foreground/10 bg-foreground/[0.015] p-6 sm:p-8">
                            <h2 className="text-xl font-bold">About this product</h2>
                            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-muted-foreground">{product.description}</div>
                        </section>

                        <section className="mt-6 rounded-[1.6rem] border border-foreground/10 bg-foreground/[0.015] p-6 sm:p-8">
                            <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Included files</h2><span className="text-xs text-muted-foreground">{product.files.length} {product.files.length === 1 ? 'delivery' : 'deliveries'}</span></div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {product.files.map((file) => {
                                    const external = isExternalDigitalProductStorageKey(file.storageKey);
                                    return (
                                        <div key={file.id} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/50 px-4 py-3">
                                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold">{file.fileName}</p>
                                                <p className="text-xs text-muted-foreground">{external ? 'Protected link delivery' : `${Math.max(1, Math.round(file.size / 1024))} KB`}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <aside className="lg:sticky lg:top-24 lg:self-start">
                        <div className="rounded-[2rem] border border-foreground/10 bg-foreground/[0.02] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.10)] sm:p-8">
                            {product.category ? <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{product.category}</p> : null}
                            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{product.title}</h1>
                            {product.excerpt ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{product.excerpt}</p> : null}

                            <div className="mt-7 border-y border-foreground/10 py-5">
                                {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-sm text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                <p className="text-3xl font-black">{freeDownload ? 'Free download' : money(product.priceCents, product.currency)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">Digital item · instant delivery</p>
                            </div>

                            <div className="mt-6">
                                {available ? (
                                    <BuyButton
                                        slug={product.slug}
                                        title={product.title}
                                        priceCents={product.priceCents}
                                        currency={product.currency}
                                        coverImageUrl={product.coverImageUrl}
                                        label={freeDownload ? 'Free download' : 'Buy now'}
                                    />
                                ) : <p className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-muted-foreground">This product is not available for checkout yet.</p>}
                            </div>

                            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                                <p className="flex gap-2"><Download className="mt-0.5 h-4 w-4 shrink-0" /> {freeDownload ? 'Instant digital download - no payment required.' : 'Instant digital delivery after confirmed payment.'}</p>
                                <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Downloads use private access-linked delivery. External source links stay hidden behind the Store download route.</p>
                                <p className="flex gap-2"><FileArchive className="mt-0.5 h-4 w-4 shrink-0" /> Up to {product.downloadLimit} download{product.downloadLimit === 1 ? '' : 's'} per access grant.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
