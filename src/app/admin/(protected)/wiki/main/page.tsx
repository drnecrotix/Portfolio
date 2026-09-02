import Link from 'next/link';
import { PersonalWikiMainEditor } from '@/components/admin/PersonalWikiMainEditor';
import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { savePersonalWiki } from '../actions';

export const dynamic = 'force-dynamic';

export default async function MainWikiAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [page, params] = await Promise.all([
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG } }).catch(() => null),
        searchParams,
    ]);
    const content = normalizePersonalWikiContent(page?.content);
    return <div className="mx-auto max-w-7xl">
        <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Main Wiki article saved.' : undefined)} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><Link href="/admin/wiki" className="text-xs text-muted-foreground transition hover:text-foreground">← Wiki articles</Link><h2 className="mt-2 text-2xl font-semibold">Main article</h2><p className="mt-1 text-xs text-muted-foreground">Permanent public route: <code>/wiki</code></p></div><Link href="/wiki" target="_blank" className="rounded-lg border border-foreground/10 px-3 py-2 text-xs text-muted-foreground">Open public page</Link></div>
        <form action={savePersonalWiki}><PersonalWikiMainEditor initial={content} /></form>
    </div>;
}
