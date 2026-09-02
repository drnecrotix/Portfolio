import Link from 'next/link';
import { WikiArticleEditor, type WikiArticleOption } from '@/components/admin/WikiArticleEditor';
import { prisma } from '@/lib/prisma';
import { normalizeWikiArticleContent, WIKI_ARTICLE_PREFIX } from '@/lib/wiki-articles';
import { saveWikiArticle } from '../article-actions';

export const dynamic = 'force-dynamic';

export default async function NewWikiArticlePage() {
    const pages = await prisma.page.findMany({ where: { slug: { startsWith: WIKI_ARTICLE_PREFIX } }, select: { title: true, slug: true, content: true } }).catch(() => []);
    const options: WikiArticleOption[] = pages.map((page) => { const content = normalizeWikiArticleContent(page.content, page.slug); return { slug: content.slug, title: page.title }; }).filter((item) => item.slug);
    const initial = normalizeWikiArticleContent({ bodyHtml: '<p></p>', indexable: true, infoboxTitle: 'Quick facts' });
    return <div className="mx-auto max-w-7xl">
        <div className="mb-5"><Link href="/admin/wiki" className="text-xs text-muted-foreground transition hover:text-foreground">← Wiki articles</Link><h2 className="mt-2 text-2xl font-semibold">New Wiki article</h2><p className="mt-1 text-xs text-muted-foreground">Create a project, community, organization, creative work, FAQ or other reference article.</p></div>
        <form action={saveWikiArticle}><WikiArticleEditor initialTitle="" initialStatus="DRAFT" initial={initial} articleOptions={options} /></form>
    </div>;
}
