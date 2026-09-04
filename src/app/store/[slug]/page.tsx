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
        <main className="min-h-screen w-full max-w-full overflow-x-clip bg-background px-4 pb-24 pt-24 text-foreground sm:px-7 sm:pb-28 sm:pt-28 md:px-10 lg:px-14 xl:px-20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, '\\u003c') }} />
            <div className="mx-auto min-w-0 w-full max-w-[1500px]">
                <Link href="/store" className="inline-flex max-w-full items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-foreground/20 hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">Back to Store</span>
                </Link>

                <div className="mt-6 grid min-w-0 max-w-full gap-7 lg:grid-cols-[minmax(0,1.42fr)_minmax(340px,0.58fr)] lg:gap-12">
                    <div className="min-w-0 max-w-full">
                        <div
                            className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-[1.5rem] border border-foreground/10 bg-foreground/[0.035] bg-cover bg-center shadow-[0_28px_90px_rgba(0,0,0,0.16)] sm:rounded-[2rem]"
                            style={product.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` } : undefined}
                            aria-hidden="true"
                        >
                            {!product.coverImageUrl ? <div className="flex h-full items-center justify-center"><FileArchive className="h-16 w-16 text-foreground/15" /></div> : null}
                            {product.featured ? <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md sm:left-4 sm:top-4"><Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Featured</span></span> : null}
                        </div>

                        <section className="mt-7 min-w-0 max-w-full rounded-[1.4rem] border border-foreground/10 bg-foreground/[0.015] p-5 sm:mt-10 sm:rounded-[1.6rem] sm:p-8">
                            <h2 className="text-xl font-bold">About this product</h2>
                            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] sm:text-base sm:leading-8">{product.description}</div>
                        </section>

                        <section className="mt-5 min-w-0 max-w-full rounded-[1.4rem] border border-foreground/10 bg-foreground/[0.015] p-5 sm:mt-6 sm:rounded-[1.6rem] sm:p-8">
                            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Included files</h2><span className="shrink-0 text-xs text-muted-foreground">{product.files.length} {product.files.length === 1 ? 'delivery' : 'deliveries'}</span></div>
                            <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
                                {product.files.map((file) => {
                                    const external = isExternalDigitalProductStorageKey(file.storageKey);
                                    return (
                                        <div key={file.id} className="flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-foreground/10 bg-background/50 px-4 py-3">
                                            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">{file.fileName}</p>
                                                <p className="truncate text-xs text-muted-foreground">{external ? 'Protected link delivery' : `${Math.max(1, Math.round(file.size / 1024))} KB`}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    <aside className="min-w-0 max-w-full lg:sticky lg:top-24 lg:self-start">
                        <div className="min-w-0 max-w-full rounded-[1.5rem] border border-foreground/10 bg-foreground/[0.02] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.10)] sm:rounded-[2rem] sm:p-8">
                            {product.category ? <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{product.category}</p> : null}
                            <h1 className="mt-3 break-words text-3xl font-black tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-4xl">{product.title}</h1>
                            {product.excerpt ? <p className="mt-4 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{product.excerpt}</p> : null}

                            <div className="mt-7 min-w-0 border-y border-foreground/10 py-5">
                                {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-sm text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                <p className="break-words text-2xl font-black [overflow-wrap:anywhere] sm:text-3xl">{freeDownload ? 'Free download' : money(product.priceCents, product.currency)}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">Digital item · instant delivery</p>
                            </div>

                            <div className="mt-6 min-w-0 max-w-full">
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

                            <div className="mt-6 min-w-0 space-y-3 text-sm text-muted-foreground">
                                <p className="flex min-w-0 gap-2"><Download className="mt-0.5 h-4 w-4 shrink-0" /> <span className="min-w-0 break-words [overflow-wrap:anywhere]">{freeDownload ? 'Instant digital download - no payment required.' : 'Instant digital delivery after confirmed payment.'}</span></p>
                                <p className="flex min-w-0 gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> <span className="min-w-0 break-words [overflow-wrap:anywhere]">Downloads use private access-linked delivery. External source links stay hidden behind the Store download route.</span></p>
                                <p className="flex min-w-0 gap-2"><FileArchive className="mt-0.5 h-4 w-4 shrink-0" /> <span className="min-w-0 break-words [overflow-wrap:anywhere]">Up to {product.downloadLimit} download{product.downloadLimit === 1 ? '' : 's'} per access grant.</span></p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
