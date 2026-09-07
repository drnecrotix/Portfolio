'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { CheckCircle2, ExternalLink, ShieldAlert, Trash2 } from 'lucide-react';
import { bulkModerateComments } from '@/app/admin/(protected)/comments/actions';

export type AdminCommentRow = {
    id: string;
    parentId: string | null;
    parentAuthor: string | null;
    authorName: string;
    authorEmail: string | null;
    content: string;
    status: string;
    createdAt: string;
    sourceType: 'BLOG' | 'GALLERY' | 'PRODUCT';
    sourceTitle: string;
    sourcePath: string;
    replyCount: number;
    spamExpiresAt: string | null;
};

function sourceLabel(type: AdminCommentRow['sourceType']) {
    if (type === 'PRODUCT') return 'PRODUCT';
    if (type === 'GALLERY') return 'GALLERY';
    return 'BLOG';
}

function expiryLabel(value: string | null) {
    if (!value) return null;
    const ms = new Date(value).getTime() - Date.now();
    if (ms <= 0) return 'expires soon';
    const hours = Math.ceil(ms / 3_600_000);
    if (hours < 24) return `deletes in ${hours}h`;
    return `${Math.ceil(hours / 24)}d remaining`;
}

export function AdminCommentsManager({ comments }: { comments: AdminCommentRow[] }) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pending, startTransition] = useTransition();
    const allSelected = comments.length > 0 && selected.size === comments.length;
    const selectedRows = useMemo(() => comments.filter((comment) => selected.has(comment.id)), [comments, selected]);

    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(comments.map((comment) => comment.id)));
    const toggle = (id: string) => setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const runAction = (action: 'approve' | 'spam' | 'delete') => {
        if (!selected.size || pending) return;
        if (action === 'delete' && !window.confirm(`Permanently delete ${selected.size} selected comment${selected.size === 1 ? '' : 's'}?`)) return;
        const ids = Array.from(selected);
        startTransition(async () => {
            await bulkModerateComments(ids, action);
            setSelected(new Set());
            router.refresh();
        });
    };

    if (!comments.length) return <div className="border-y border-dashed border-foreground/10 px-5 py-12 text-center text-sm text-muted-foreground">No comments match this view.</div>;

    return (
        <div className="border-y border-foreground/10">
            <div className="flex flex-col gap-3 border-b border-foreground/10 bg-foreground/[0.012] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4 rounded border-foreground/20 bg-background" />
                    Select all shown
                </label>
                {selected.size > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{selected.size} selected</span>
                        <button type="button" disabled={pending} onClick={() => runAction('approve')} className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 px-3 py-2 text-xs font-medium transition hover:bg-foreground/[0.04] disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
                        <button type="button" disabled={pending} onClick={() => runAction('spam')} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-500 transition hover:bg-amber-500/[0.06] disabled:opacity-50"><ShieldAlert className="h-3.5 w-3.5" />Mark spam</button>
                        <button type="button" disabled={pending} onClick={() => runAction('delete')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/[0.06] disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                    </div>
                ) : <span className="text-xs text-muted-foreground">Bulk actions appear after selecting comments.</span>}
            </div>

            <div className="divide-y divide-foreground/10">
                {comments.map((comment) => {
                    const expires = expiryLabel(comment.spamExpiresAt);
                    return (
                        <article key={comment.id} className={`grid gap-3 px-3 py-4 transition sm:grid-cols-[24px_minmax(130px,0.7fr)_minmax(220px,1.7fr)_minmax(170px,0.85fr)] sm:items-start sm:px-4 ${selected.has(comment.id) ? 'bg-foreground/[0.025]' : ''}`}>
                            <input type="checkbox" checked={selected.has(comment.id)} onChange={() => toggle(comment.id)} aria-label={`Select comment by ${comment.authorName}`} className="mt-1 size-4 rounded border-foreground/20 bg-background" />

                            <div className="min-w-0">
                                <strong className="block break-words text-sm font-semibold">{comment.authorName}</strong>
                                {comment.parentAuthor ? <span className="mt-1 block text-[11px] text-muted-foreground">reply to {comment.parentAuthor}</span> : null}
                                {comment.authorEmail ? <span className="mt-1 block break-all text-[11px] text-muted-foreground/70">{comment.authorEmail}</span> : null}
                                <time dateTime={comment.createdAt} className="mt-2 block font-mono text-[9px] text-muted-foreground/60">{new Date(comment.createdAt).toLocaleString()}</time>
                            </div>

                            <div className="min-w-0">
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">{comment.content}</p>
                                {comment.replyCount > 0 ? <span className="mt-2 block text-[11px] text-muted-foreground">{comment.replyCount} direct repl{comment.replyCount === 1 ? 'y' : 'ies'}</span> : null}
                            </div>

                            <div className="min-w-0 sm:text-right">
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <span className="rounded-full border border-foreground/10 px-2 py-1 font-mono text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">{sourceLabel(comment.sourceType)}</span>
                                    <span className={`rounded-full border px-2 py-1 font-mono text-[9px] font-semibold tracking-[0.12em] ${comment.status === 'SPAM' ? 'border-amber-500/20 text-amber-500' : 'border-foreground/10 text-muted-foreground'}`}>{comment.status}</span>
                                </div>
                                <p className="mt-2 break-words text-xs font-medium text-foreground/80">{comment.sourceTitle}</p>
                                {expires ? <p className="mt-1 text-[10px] text-amber-500/80">{expires}</p> : null}
                                <Link href={comment.sourcePath} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground">View <ExternalLink className="h-3 w-3" /></Link>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
