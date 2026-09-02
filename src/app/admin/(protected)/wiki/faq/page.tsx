import Link from 'next/link';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { WikiFaqEditor } from '@/components/admin/WikiFaqEditor';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';
import { saveWikiFaq } from './actions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function WikiFaqAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [page, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: WIKI_FAQ_CONFIG_SLUG }, select: { content: true, seoTitle: true, seoDescription: true, updatedAt: true } }).catch(() => null),
        searchParams,
    ]);
    const content = normalizeWikiFaqContent(page?.content);
    const enabledCount = content.items.filter((item) => item.enabled).length;

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Wiki FAQ saved.' : undefined)} />
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground"><CircleHelp className="size-4" /> Wiki module</div>
                    <h2 className="mt-1 text-3xl font-semibold">FAQ</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create and maintain structured questions independently from normal Wiki articles. Answers use the same rich-text tools as the Wiki editor.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/wiki" className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Back to Wiki</Link>
                    <Link href="/wiki/faq" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open FAQ <ExternalLink className="size-3.5" /></Link>
                </div>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.012] px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Visible questions</p><p className="mt-1 text-xl font-bold">{enabledCount}</p></div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.012] px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Public page</p><p className={`mt-1 text-sm font-bold ${content.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>{content.enabled ? 'Enabled' : 'Disabled'}</p></div>
                <div className="rounded-xl border border-foreground/10 bg-foreground/[0.012] px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Last saved</p><p className="mt-1 text-sm font-bold">{page?.updatedAt ? page.updatedAt.toLocaleDateString('en-GB') : 'Default'}</p></div>
            </div>
            <form action={saveWikiFaq}>
                <WikiFaqEditor initial={content} seoTitle={page?.seoTitle} seoDescription={page?.seoDescription} />
            </form>
        </div>
    );
}
