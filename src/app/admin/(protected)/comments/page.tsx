import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare, Reply } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminCommentDeleteButton } from '@/components/admin/AdminCommentDeleteButton';

export const dynamic = 'force-dynamic';

type Filter = 'all' | 'roots' | 'replies';

export default async function AdminCommentsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user) redirect('/admin/login');
    if (role !== 'OWNER' && role !== 'ADMIN') redirect('/admin');

    const params = await searchParams;
    const q = String(params.q || '').trim();
    const requestedType = String(params.type || 'all');
    const type: Filter = requestedType === 'roots' || requestedType === 'replies' ? requestedType : 'all';

    const where = {
        ...(type === 'roots' ? { parentId: null } : {}),
        ...(type === 'replies' ? { parentId: { not: null } } : {}),
        ...(q ? {
            OR: [
                { authorName: { contains: q, mode: 'insensitive' as const } },
                { authorEmail: { contains: q, mode: 'insensitive' as const } },
                { content: { contains: q, mode: 'insensitive' as const } },
                { post: { title: { contains: q, mode: 'insensitive' as const } } },
            ],
        } : {}),
    };

    const [comments, total, roots, replies] = await prisma.$transaction([
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
                createdAt: true,
                parent: { select: { authorName: true } },
                post: { select: { title: true, slug: true } },
                _count: { select: { replies: true } },
            },
        }),
        prisma.blogComment.count(),
        prisma.blogComment.count({ where: { parentId: null } }),
        prisma.blogComment.count({ where: { parentId: { not: null } } }),
    ]);

    const filterHref = (next: Filter) => `/admin/comments?type=${next}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

    return (
        <div className="mx-auto w-full max-w-6xl">
            <header className="mb-7 sm:mb-9">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Content moderation</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Comments</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review blog comments and replies. Delete spam or unwanted content without adding comment data to the main Dashboard.</p>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-foreground/10 px-3 py-1.5">{total} total</span>
                        <span className="rounded-full border border-foreground/10 px-3 py-1.5">{replies} replies</span>
                    </div>
                </div>
            </header>

            <div className="mb-6 rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-3 sm:p-4">
                <form className="flex flex-col gap-3 md:flex-row md:items-center" action="/admin/comments">
                    <input type="hidden" name="type" value={type} />
                    <input name="q" defaultValue={q} placeholder="Search author, email, comment or publication…" className="min-h-11 flex-1 rounded-xl border border-foreground/10 bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-foreground/30" />
                    <div className="flex gap-2">
                        <button className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-bold text-background">Search</button>
                        {q && <Link href={`/admin/comments?type=${type}`} className="inline-flex min-h-11 items-center rounded-xl border border-foreground/10 px-4 text-sm text-muted-foreground transition hover:text-foreground">Clear</Link>}
                    </div>
                </form>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {([
                        ['all', `All ${total}`],
                        ['roots', `Top-level ${roots}`],
                        ['replies', `Replies ${replies}`],
                    ] as const).map(([value, label]) => (
                        <Link key={value} href={filterHref(value)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${type === value ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>{label}</Link>
                    ))}
                </div>
            </div>

            {comments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/10 px-5 py-12 text-center text-sm text-muted-foreground">No comments match this view.</div>
            ) : (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <article key={comment.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="flex size-7 items-center justify-center rounded-full bg-foreground/[0.05]">{comment.parentId ? <Reply className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}</span>
                                        <strong className="break-words text-sm">{comment.authorName}</strong>
                                        {comment.parent && <span className="text-xs text-muted-foreground">reply to {comment.parent.authorName}</span>}
                                        <span className="rounded-full border border-foreground/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{comment.status}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        {comment.authorEmail && <span className="break-all">{comment.authorEmail}</span>}
                                        <time dateTime={comment.createdAt.toISOString()}>{comment.createdAt.toLocaleString()}</time>
                                        {comment._count.replies > 0 && <span>{comment._count.replies} repl{comment._count.replies === 1 ? 'y' : 'ies'}</span>}
                                    </div>
                                </div>
                                <AdminCommentDeleteButton commentId={comment.id} authorName={comment.authorName} />
                            </div>

                            <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-foreground/[0.025] p-3 text-sm leading-6 text-foreground/80 sm:p-4">{comment.content}</p>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3 text-xs">
                                <span className="min-w-0 truncate text-muted-foreground">On: {comment.post.title}</span>
                                <Link href={`/blog/${comment.post.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-foreground/70 transition hover:text-foreground">View publication ↗</Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
