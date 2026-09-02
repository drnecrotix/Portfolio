import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WikiArticleEditor, type WikiArticleOption } from '@/components/admin/WikiArticleEditor';
import { prisma } from '@/lib/prisma';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX } from '@/lib/wiki-articles';
import { deleteWikiArticle, saveWikiArticle } from '../article-actions';

export const dynamic = 'force-dynamic';

export default async function EditWikiArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [page, pages] = await Promise.all([
        prisma.page.findUnique({ where: { id } }).catch(() => null),
        prisma.page.findMany({ where: { slug: { startsWith: WIKI_ARTICLE_PREFIX } }, select: { id: true, title: true, slug: true, content: true } }).catch(() => []),
    ]);
    if (!page || !page.slug.startsWith(WIKI_ARTICLE_PREFIX)) notFound();
    const content = normalizeWikiArticleContent(page.content, page.slug);
    const options: WikiArticleOption[] = pages.filter((item) => item.id !== page.id).map((item) => { const itemContent = normalizeWikiArticleContent(item.content, item.slug); return { slug: itemContent.slug, title: item.title }; }).filter((item) => item.slug);

    return <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><Link href="/admin/wiki" className="text-xs text-muted-foreground transition hover:text-foreground">← Wiki articles</Link><h2 className="mt-2 text-2xl font-semibold">{page.title}</h2><p className="mt-1 text-xs text-muted-foreground">Public route: <code>/wiki/{content.slug}</code></p></div><div className="flex gap-2"><Link href={`/wiki/${content.slug}`} target="_blank" className="rounded-lg border border-foreground/10 px-3 py-2 text-xs text-muted-foreground">Preview</Link><form action={deleteWikiArticle}><input type="hidden" name="articleId" value={page.id} /><button type="submit" className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-500/75">Delete</button></form></div></div>
        <form action={saveWikiArticle}><WikiArticleEditor articleId={page.id} initialTitle={page.title} initialStatus={page.status} initial={content} seoTitle={page.seoTitle} seoDescription={page.seoDescription} articleOptions={options} /></form>
    </div>;
}
