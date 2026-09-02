import Link from 'next/link';
import { WikiAdminIndex, type WikiAdminItem } from '@/components/admin/WikiAdminIndex';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX } from '@/lib/wiki-articles';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; articleSaved?: string; deleted?: string; error?: string }>;

export default async function WikiAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [mainPage, articlePages, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG } }).catch(() => null),
        prisma.page.findMany({
            where: { slug: { startsWith: WIKI_ARTICLE_PREFIX } },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, slug: true, status: true, content: true, updatedAt: true },
        }).catch(() => []),
        searchParams,
    ]);
    const main = normalizePersonalWikiContent(mainPage?.content);
    const items: WikiAdminItem[] = articlePages.map((page) => {
        const content = normalizeWikiArticleContent(page.content, page.slug);
        return {
            id: page.id,
            slug: content.slug,
            title: page.title,
            summary: content.summary,
            category: content.category,
            status: page.status,
            featured: content.featured,
            updatedAt: page.updatedAt.toISOString(),
        };
    }).filter((item) => item.slug);
    const toastMessage = params.error
        || (params.saved ? 'Main Wiki article saved.' : undefined)
        || (params.articleSaved ? 'Wiki article saved.' : undefined)
        || (params.deleted ? 'Wiki article deleted.' : undefined);

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : toastMessage ? 'success' : undefined} message={toastMessage} />
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
                    <h2 className="mt-1 text-3xl font-semibold">Wiki</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage the main biography and every connected Wiki article from one compact index.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/wiki/articles" target="_blank" className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open public index</Link>
                    <Link href="/admin/navigation" className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Navigation</Link>
                </div>
            </div>
            <div className="mb-5 rounded-xl border border-foreground/10 bg-foreground/[0.018] px-4 py-3 text-xs leading-5 text-muted-foreground">
                Wiki links are <strong className="text-foreground/80">manual</strong>. Add <code>/wiki</code> or <code>/wiki/articles</code> from Navigation and place them exactly where you want. The Wiki CMS no longer inserts menu items automatically.
            </div>
            <WikiAdminIndex mainTitle={main.title} mainUpdatedAt={mainPage?.updatedAt.toISOString() ?? null} items={items} />
        </div>
    );
}
