import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, CircleHelp, LibraryBig } from 'lucide-react';
import { WikiArticleIndex, type WikiIndexItem } from '@/components/wiki/WikiArticleIndex';
import { prisma } from '@/lib/prisma';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX, wikiHtmlToText } from '@/lib/wiki-articles';
import { normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
    title: 'Necrotix Wiki - Article index',
    description: 'Browse the personal Necrotix Wiki: biography, projects, communities, organizations, creative work, technology notes and the dedicated FAQ.',
    alternates: { canonical: `${siteUrl}/wiki/articles` },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', url: `${siteUrl}/wiki/articles`, title: 'Necrotix Wiki - Article index', description: 'A searchable index of connected Wiki articles maintained through Necrotix Lab.' },
};

export default async function WikiArticlesPage() {
    const [pages, mainPage, faqPage] = await Promise.all([
        prisma.page.findMany({
            where: { slug: { startsWith: WIKI_ARTICLE_PREFIX }, status: 'PUBLISHED' },
            orderBy: { updatedAt: 'desc' },
            select: { title: true, slug: true, content: true, updatedAt: true },
        }).catch(() => []),
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG }, select: { content: true, updatedAt: true } }).catch(() => null),
        prisma.page.findUnique({ where: { slug: WIKI_FAQ_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
    ]);
    const main = normalizePersonalWikiContent(mainPage?.content);
    const faq = normalizeWikiFaqContent(faqPage?.content);
    const faqCount = faq.items.filter((item) => item.enabled).length;
    const items: WikiIndexItem[] = pages.map((page) => {
        const content = normalizeWikiArticleContent(page.content, page.slug);
        return { slug: content.slug, title: page.title, summary: content.summary, category: content.category, featured: content.featured, updatedAt: page.updatedAt.toISOString(), indexable: content.indexable };
    }).filter((item) => item.slug && item.indexable).map(({ indexable: _indexable, ...item }) => item);
    const mainSummary = wikiHtmlToText(main.lead).slice(0, 240);

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <header className="border-b border-foreground/10 pb-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><LibraryBig className="size-4" /> Necrotix Wiki</div>
                        <div className="grid grid-cols-3 gap-2 sm:flex">
                            <Link href="/wiki" className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.035] px-3 py-2 text-xs font-semibold text-foreground/75 transition hover:border-sky-400/25 hover:bg-sky-500/[0.06]"><BookOpen className="size-3.5" /><span className="hidden sm:inline">Main article</span><span className="sm:hidden">Main</span></Link>
                            <Link href="/wiki/articles" aria-current="page" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/[0.1] px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-300"><LibraryBig className="size-3.5" /><span className="hidden sm:inline">All articles</span><span className="sm:hidden">Articles</span></Link>
                            <Link href="/wiki/faq" className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.035] px-3 py-2 text-xs font-semibold text-foreground/75 transition hover:border-sky-400/25 hover:bg-sky-500/[0.06]"><CircleHelp className="size-3.5" /> FAQ</Link>
                        </div>
                    </div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Article index</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">The biography remains the main article at <code>/wiki</code>. This index connects additional project, community, organization, creative-work and technology reference articles. Frequently asked questions have their own structured Wiki module.</p>
                </header>

                <section className="mt-8 grid gap-3 md:grid-cols-2">
                    <Link href="/wiki" className="grid gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 transition hover:border-foreground/20 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                        <div className="flex size-11 items-center justify-center rounded-xl border border-foreground/10"><BookOpen className="size-5" /></div>
                        <div><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Main article</p><h2 className="mt-1 text-xl font-black tracking-tight">{main.title}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{mainSummary}</p></div>
                    </Link>
                    {faq.enabled ? <Link href="/wiki/faq" className="grid gap-4 rounded-2xl border border-sky-400/20 bg-sky-500/[0.045] p-5 transition hover:border-sky-400/35 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center"><div className="flex size-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/[0.06]"><CircleHelp className="size-5 text-sky-500" /></div><div><p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-sky-500">FAQ module</p><h2 className="mt-1 text-xl font-black tracking-tight">{faq.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{faqCount} visible questions with search, categories and FAQPage structured data.</p></div></Link> : null}
                </section>

                <WikiArticleIndex items={items} />
            </div>
        </main>
    );
}
