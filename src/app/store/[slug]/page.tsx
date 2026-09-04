import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, FileArchive, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { BuyButton } from '@/components/store/BuyButton';
import { prisma } from '@/lib/prisma';
import { getPublicSiteUrl } from '@/lib/social-metadata';

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
    const available = Boolean(product.files.length && product.lemonSqueezyVariantId);
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
        <main className="min-h-screen bg-background px-6 pb-24 pt-32 text-foreground md:px-12 lg:px-24">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, '\\u003c') }} />
            <div className="mx-auto max-w-7xl">
                <Link href="/store" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Store
                </Link>

                <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:gap-14">
                    <div>
                        <div
                            className="aspect-[16/10] overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/[0.035] bg-cover bg-center"
                            style={product.coverImageUrl ? { backgroundImage: `url(${JSON.stringify(product.coverImageUrl).slice(1, -1)})` } : undefined}
                            aria-hidden="true"
                        >
                            {!product.coverImageUrl ? <div className="flex h-full items-center justify-center"><FileArchive className="h-16 w-16 text-foreground/15" /></div> : null}
                        </div>

                        <section className="mt-10">
                            <h2 className="text-xl font-bold">About this product</h2>
                            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-muted-foreground">{product.description}</div>
                        </section>

                        <section className="mt-10 border-t border-foreground/10 pt-8">
                            <h2 className="text-xl font-bold">Included files</h2>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {product.files.map((file) => (
                                    <div key={file.id} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3">
                                        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">{file.fileName}</p>
                                            <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.025] p-6 sm:p-8">
                            {product.category ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">{product.category}</p> : null}
                            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{product.title}</h1>
                            {product.excerpt ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{product.excerpt}</p> : null}

                            <div className="mt-7 border-y border-foreground/10 py-5">
                                {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? <p className="text-sm text-muted-foreground line-through">{money(product.compareAtPriceCents, product.currency)}</p> : null}
                                <p className="text-3xl font-black">{product.priceCents === 0 ? 'Free' : money(product.priceCents, product.currency)}</p>
                            </div>

                            <div className="mt-6">
                                {available ? <BuyButton slug={product.slug} /> : <p className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4 text-sm text-muted-foreground">This product is not available for checkout yet.</p>}
                            </div>

                            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                                <p className="flex gap-2"><Download className="mt-0.5 h-4 w-4 shrink-0" /> Instant digital delivery after confirmed payment.</p>
                                <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Downloads use private, purchase-linked access instead of public file URLs.</p>
                                <p className="flex gap-2"><FileArchive className="mt-0.5 h-4 w-4 shrink-0" /> Up to {product.downloadLimit} download{product.downloadLimit === 1 ? '' : 's'} per purchase.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
