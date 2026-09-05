import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Download, ShoppingBag, Sparkles } from 'lucide-react';
import { StoreCatalogClient } from '@/components/store/StoreCatalogClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Digital Store | Necrotix Lab',
    description: 'Digital products, creative resources, templates and downloadable assets from Necrotix Lab.',
    alternates: { canonical: '/store' },
};

function money(cents: number, currency: string) {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function StorePage() {
    const products = await prisma.storeProduct.findMany({
        where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
        include: { _count: { select: { files: true } } },
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const categories = [...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
    const catalogProducts = products.map((product) => ({
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
    const heroProduct = products.find((product) => product.featured) ?? products[0] ?? null;

    return (
        <main className="relative min-h-screen w-full max-w-full overflow-x-clip bg-background px-4 pb-24 pt-28 text-foreground sm:px-7 sm:pb-28 sm:pt-32 md:px-10 lg:px-14 xl:px-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_16%_8%,rgba(120,119,198,0.10),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(56,189,248,0.08),transparent_28%)]" />
            <div className="relative mx-auto min-w-0 w-full max-w-[1500px]">
                <header className="relative min-w-0 max-w-full overflow-hidden rounded-[1.6rem] border border-foreground/10 bg-foreground/[0.018] shadow-[0_30px_100px_rgba(0,0,0,0.14)] sm:rounded-[2.4rem]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(127,127,127,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(127,127,127,0.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
                    <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-foreground/[0.035] blur-3xl" />

                    <div className="relative grid min-w-0 gap-8 p-5 sm:p-9 lg:p-11 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)] xl:items-stretch xl:gap-12 xl:p-12">
                        <div className="flex min-w-0 flex-col justify-center py-1 sm:py-3">
                            <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-foreground/10 bg-background/70 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-xl sm:text-[10px] sm:tracking-[0.22em]">
                                <ShoppingBag className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Necrotix Lab Marketplace</span>
                            </div>
                            <h1 className="mt-5 max-w-3xl break-words text-[2.35rem] font-black leading-[0.98] tracking-[-0.045em] [overflow-wrap:anywhere] sm:text-5xl lg:text-[4rem]">Digital releases with a quieter kind of character.</h1>
                            <p className="mt-5 max-w-2xl break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] sm:text-base">Original digital art, creative resources, templates and software-related assets from Necrotix Lab. Clean presentation, protected delivery and no noisy sales pressure.</p>

                            <div className="mt-7 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <div className="rounded-2xl border border-foreground/8 bg-background/55 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Selection</p>
                                    <p className="mt-1 text-sm font-bold">Curated releases</p>
                                </div>
                                <div className="rounded-2xl border border-foreground/8 bg-background/55 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Delivery</p>
                                    <p className="mt-1 text-sm font-bold">Protected access</p>
                                </div>
                                <div className="rounded-2xl border border-foreground/8 bg-background/55 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Catalog</p>
                                    <p className="mt-1 text-sm font-bold">{products.length} product{products.length === 1 ? '' : 's'} available</p>
                                </div>
                            </div>
                        </div>

                        {heroProduct ? (
                            <Link href={`/store/${heroProduct.slug}`} className="group relative block min-w-0 overflow-hidden rounded-[1.35rem] border border-foreground/10 bg-background/70 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-foreground/20 sm:rounded-[1.8rem] sm:p-3">
                                <div className="relative aspect-[5/4] min-h-[18rem] w-full overflow-hidden rounded-[1rem] bg-foreground/[0.04] sm:rounded-[1.45rem] xl:h-full xl:min-h-[27rem]">
                                    {heroProduct.coverImageUrl ? (
                                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.025]" style={{ backgroundImage: `url(${JSON.stringify(heroProduct.coverImageUrl).slice(1, -1)})` }} />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.09),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.02),transparent)]">
                                            <Download className="h-12 w-12 text-foreground/15" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/15" />

                                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                                        <Sparkles className="h-3 w-3" /> {heroProduct.featured ? 'Featured release' : 'Latest release'}
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                                        <div className="flex min-w-0 items-end justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/65">{heroProduct.category || 'Digital product'}</p>
                                                <h2 className="mt-2 line-clamp-2 break-words text-2xl font-black leading-tight tracking-[-0.03em] sm:text-3xl">{heroProduct.title}</h2>
                                                <p className="mt-2 line-clamp-2 max-w-xl text-xs leading-5 text-white/70 sm:text-sm">{heroProduct.excerpt || heroProduct.description}</p>
                                            </div>
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-xl transition duration-300 group-hover:rotate-6 group-hover:scale-105"><ArrowUpRight className="h-4 w-4" /></span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-xs font-semibold text-white/75">
                                            <span>{heroProduct.priceCents === 0 ? 'Free download' : money(heroProduct.priceCents, heroProduct.currency)}</span>
                                            <span>{heroProduct._count.files} {heroProduct._count.files === 1 ? 'file' : 'files'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="relative flex min-h-[20rem] items-center justify-center overflow-hidden rounded-[1.35rem] border border-foreground/10 bg-background/65 sm:rounded-[1.8rem] xl:min-h-[27rem]">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),transparent_36%)]" />
                                <div className="relative text-center">
                                    <ShoppingBag className="mx-auto h-10 w-10 text-foreground/20" />
                                    <p className="mt-4 text-sm font-semibold text-muted-foreground">New releases will appear here.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <StoreCatalogClient products={catalogProducts} categories={categories} />
            </div>
        </main>
    );
}
