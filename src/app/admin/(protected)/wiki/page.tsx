import Link from 'next/link';
import { PersonalWikiEditor } from '@/components/admin/PersonalWikiEditor';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { savePersonalWiki } from './actions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function PersonalWikiAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [page, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG } }).catch(() => null),
        searchParams,
    ]);
    const content = normalizePersonalWikiContent(page?.content);

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Personal Wiki saved.' : undefined)} />

            <div className="mb-8 flex flex-wrap items-end justify-between gap-5 sm:mb-10">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Personal Wiki</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Build a living, Wikipedia-inspired personal reference page with an infobox, table of contents, article sections, chronology and related links - while keeping the visual language of the portfolio.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/wiki" target="_blank" className="rounded-xl border border-foreground/10 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Open /wiki</Link>
                    <Link href="/admin/navigation" className="rounded-xl border border-foreground/10 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">Navigation settings</Link>
                </div>
            </div>

            <form action={savePersonalWiki} className="space-y-5">
                <PersonalWikiEditor initial={content} />
            </form>
        </div>
    );
}
