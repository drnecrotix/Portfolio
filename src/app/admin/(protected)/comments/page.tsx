import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminCommentsManager, type AdminCommentRow } from '@/components/admin/AdminCommentsManager';
import { cleanupExpiredSpamComments, spamExpiresAt } from '@/lib/comment-engine';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SourceFilter = 'all' | 'blog' | 'gallery' | 'product';
type StatusFilter = 'all' | 'approved' | 'spam';

function sourceEnum(source: SourceFilter) {
    if (source === 'blog') return 'BLOG' as const;
    if (source === 'gallery') return 'GALLERY' as const;
    if (source === 'product') return 'PRODUCT' as const;
    return null;
}

function buildHref({ source, status, q }: { source: SourceFilter; status: StatusFilter; q: string }) {
    const params = new URLSearchParams();
    if (source !== 'all') params.set('source', source);
    if (status !== 'all') params.set('status', status);
    if (q) params.set('q', q);
    const query = params.toString();
    return `/admin/comments${query ? `?${query}` : ''}`;
}

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<{ q?: string; source?: string; status?: string }> }) {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user) redirect('/admin/login');
    if (role !== 'OWNER' && role !== 'ADMIN') redirect('/admin');

    await cleanupExpiredSpamComments().catch(() => undefined);

    const params = await searchParams;
    const q = String(params.q || '').trim();
    const requestedSource = String(params.source || 'all');
    const source: SourceFilter = requestedSource === 'blog' || requestedSource === 'gallery' || requestedSource === 'product' ? requestedSource : 'all';
    const requestedStatus = String(params.status || 'all');
    const status: StatusFilter = requestedStatus === 'approved' || requestedStatus === 'spam' ? requestedStatus : 'all';
    const selectedSource = sourceEnum(source);

    const where = {
        ...(selectedSource ? { sourceType: selectedSource } : {}),
        ...(status === 'approved' ? { status: 'APPROVED' } : {}),
        ...(status === 'spam' ? { status: 'SPAM' } : {}),
        ...(q ? {
            OR: [
                { authorName: { contains: q, mode: 'insensitive' as const } },
                { authorEmail: { contains: q, mode: 'insensitive' as const } },
                { content: { contains: q, mode: 'insensitive' as const } },
                { sourceTitle: { contains: q, mode: 'insensitive' as const } },
                { sourceKey: { contains: q, mode: 'insensitive' as const } },
            ],
        } : {}),
    };

    const [comments, total, approved, spam, blog, gallery, product] = await prisma.$transaction([
        prisma.blogComment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                parentId: true,
                authorName: true,
                authorEmail: true,
                content: true,
                status: true,
                spamAt: true,
                createdAt: true,
                sourceType: true,
                sourceTitle: true,
                sourcePath: true,
                parent: { select: { authorName: true } },
                _count: { select: { replies: true } },
            },
        }),
        prisma.blogComment.count(),
        prisma.blogComment.count({ where: { status: 'APPROVED' } }),
        prisma.blogComment.count({ where: { status: 'SPAM' } }),
        prisma.blogComment.count({ where: { sourceType: 'BLOG' } }),
        prisma.blogComment.count({ where: { sourceType: 'GALLERY' } }),
        prisma.blogComment.count({ where: { sourceType: 'PRODUCT' } }),
    ]);

    const rows: AdminCommentRow[] = comments.map((comment) => ({
        id: comment.id,
        parentId: comment.parentId,
        parentAuthor: comment.parent?.authorName || null,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        content: comment.content,
        status: comment.status,
        createdAt: comment.createdAt.toISOString(),
        sourceType: comment.sourceType,
        sourceTitle: comment.sourceTitle,
        sourcePath: comment.sourcePath,
        replyCount: comment._count.replies,
        spamExpiresAt: spamExpiresAt(comment.spamAt)?.toISOString() || null,
    }));

    return (
        <div className="mx-auto w-full max-w-7xl">
            <header className="mb-7 sm:mb-9">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Content moderation</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Comments</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">One moderation inbox for Blog publications, Gallery works and Store products. Comments containing public links are sent directly to Spam and removed automatically after 7 days.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-foreground/10 px-3 py-1.5">{total} total</span>
                        <span className="rounded-full border border-foreground/10 px-3 py-1.5">{approved} approved</span>
                        <span className="rounded-full border border-amber-500/20 px-3 py-1.5 text-amber-500">{spam} spam</span>
                    </div>
                </div>
            </header>

            <section className="mb-5 border-y border-foreground/10 py-4">
                <form className="flex flex-col gap-3 lg:flex-row lg:items-center" action="/admin/comments">
                    {source !== 'all' ? <input type="hidden" name="source" value={source} /> : null}
                    {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
                    <input name="q" defaultValue={q} placeholder="Search author, email, comment, title or slug…" className="min-h-11 flex-1 rounded-xl border border-foreground/10 bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-foreground/30" />
                    <div className="flex gap-2">
                        <button className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-bold text-background">Search</button>
                        {q ? <Link href={buildHref({ source, status, q: '' })} className="inline-flex min-h-11 items-center rounded-xl border border-foreground/10 px-4 text-sm text-muted-foreground transition hover:text-foreground">Clear</Link> : null}
                    </div>
                </form>

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Comment source filter">
                        {([
                            ['all', `All sources ${total}`],
                            ['blog', `Blog ${blog}`],
                            ['gallery', `Gallery ${gallery}`],
                            ['product', `Products ${product}`],
                        ] as const).map(([value, label]) => (
                            <Link key={value} href={buildHref({ source: value, status, q })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${source === value ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>{label}</Link>
                        ))}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Comment status filter">
                        {([
                            ['all', `All ${total}`],
                            ['approved', `Approved ${approved}`],
                            ['spam', `Spam ${spam}`],
                        ] as const).map(([value, label]) => (
                            <Link key={value} href={buildHref({ source, status: value, q })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${status === value ? 'border-foreground bg-foreground text-background' : value === 'spam' ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/[0.05]' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>{label}</Link>
                        ))}
                    </div>
                </div>
            </section>

            {status === 'spam' ? <p className="mb-3 text-xs text-muted-foreground">Spam comments are retained for up to 7 days so false positives can be restored, then removed automatically.</p> : null}
            <AdminCommentsManager comments={rows} />
            {comments.length === 200 ? <p className="mt-3 text-xs text-muted-foreground">Showing the latest 200 comments matching this view.</p> : null}
        </div>
    );
}
