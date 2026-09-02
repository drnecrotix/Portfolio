import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, LibraryBig } from 'lucide-react';
import { WikiArticleIndex, type WikiIndexItem } from '@/components/wiki/WikiArticleIndex';
import { prisma } from '@/lib/prisma';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX, wikiHtmlToText } from '@/lib/wiki-articles';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
    title: 'Necrotix Wiki - Article index',
    description: 'Browse the personal Necrotix Wiki: biography, projects, communities, organizations, creative work, technology notes and FAQ articles.',
    alternates: { canonical: `${siteUrl}/wiki/articles` },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', url: `${siteUrl}/wiki/articles`, title: 'Necrotix Wiki - Article index', description: 'A searchable index of connected Wiki articles maintained through Necrotix Lab.' },
};

export default async function WikiArticlesPage() {
    const [pages, mainPage] = await Promise.all([
        prisma.page.findMany({
            where: { slug: { startsWith: WIKI_ARTICLE_PREFIX }, status: 'PUBLISHED' },
            orderBy: { updatedAt: 'desc' },
            select: { title: true, slug: true, content: true, updatedAt: true },
        }).catch(() => []),
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG }, select: { content: true, updatedAt: true } }).catch(() => null),
    ]);
    const main = normalizePersonalWikiContent(mainPage?.content);
    const items: WikiIndexItem[] = pages.map((page) => {
        const content = normalizeWikiArticleContent(page.content, page.slug);
        return { slug: content.slug, title: page.title, summary: content.summary, category: content.category, featured: content.featured, updatedAt: page.updatedAt.toISOString(), indexable: content.indexable };
    }).filter((item) => item.slug && item.indexable).map(({ indexable: _indexable, ...item }) => item);
    const mainSummary = wikiHtmlToText(main.lead).slice(0, 240);

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <header className="border-b border-foreground/10 pb-10">
                    <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground"><LibraryBig className="size-4" /> Necrotix Wiki</div>
                    <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Article index</h1>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">The biography remains the main article at <code>/wiki</code>. This index connects every additional article about projects, communities, organizations, creative work, FAQ entries and future reference topics.</p>
                </header>

                <section className="mt-8">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Main article</p>
                    <Link href="/wiki" className="mt-4 grid gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5 transition hover:border-foreground/20 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                        <div className="flex size-11 items-center justify-center rounded-xl border border-foreground/10"><BookOpen className="size-5" /></div>
                        <div><h2 className="text-xl font-black tracking-tight">{main.title}</h2><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{mainSummary}</p></div>
                        <span className="text-xs font-semibold text-muted-foreground">Open biography →</span>
                    </Link>
                </section>

                <WikiArticleIndex items={items} />
            </div>
        </main>
    );
}
