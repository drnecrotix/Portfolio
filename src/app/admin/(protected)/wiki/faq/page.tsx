import Link from 'next/link';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { WikiFaqEditor } from '@/components/admin/WikiFaqEditor';
import { prisma } from '@/lib/prisma';
import { normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';

export const dynamic = 'force-dynamic';

export default async function WikiFaqAdminPage() {
    const page = await prisma.page.findUnique({
        where: { slug: WIKI_FAQ_CONFIG_SLUG },
        select: { content: true, seoTitle: true, seoDescription: true, updatedAt: true },
    }).catch(() => null);
    const content = normalizeWikiFaqContent(page?.content);

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground"><HelpCircle className="size-4" /> Wiki module</div>
                    <h2 className="mt-1 text-3xl font-semibold">FAQ</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">List-first FAQ management with rich-text answers, categories, search, structured data and save-without-reload behavior.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/wiki" className="rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Back to Wiki</Link>
                    <Link href="/wiki/faq" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open FAQ <ExternalLink className="size-3.5" /></Link>
                </div>
            </div>
            <WikiFaqEditor initial={content} seoTitle={page?.seoTitle} seoDescription={page?.seoDescription} />
        </div>
    );
}
