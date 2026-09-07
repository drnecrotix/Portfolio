'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { Check, Copy, CornerUpLeft, MessageCircle, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';
import type { CommentSourceType } from '@/lib/comment-engine';

export type PublicComment = {
    id: string;
    parentId: string | null;
    authorName: string;
    content: string;
    createdAt: string;
};

type Challenge = { question: string; token: string };
type ReplyTarget = { id: string; authorName: string } | null;
type SortMode = 'newest' | 'oldest' | 'replied';

async function fetchChallenge() {
    const response = await fetch('/api/comments/challenge', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load bot check.');
    return data as Challenge;
}

export function CommentsEngine({
    sourceType,
    sourceKey,
    initialComments,
}: {
    sourceType: CommentSourceType;
    sourceKey: string;
    initialComments: PublicComment[];
}) {
    const [comments, setComments] = useState(initialComments);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loadingChallenge, setLoadingChallenge] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [sort, setSort] = useState<SortMode>('newest');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const loadChallenge = async () => {
        setLoadingChallenge(true);
        setError('');
        try { setChallenge(await fetchChallenge()); }
        catch (challengeError) { setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.'); }
        finally { setLoadingChallenge(false); }
    };

    const openComposer = (target: ReplyTarget = null) => {
        setReplyTarget(target);
        setComposerOpen(true);
        setNotice('');
        setError('');
        if (!challenge && !loadingChallenge) void loadChallenge();
    };

    const closeComposer = () => {
        setComposerOpen(false);
        setReplyTarget(null);
        setError('');
    };

    const childrenByParent = useMemo(() => {
        const map = new Map<string, PublicComment[]>();
        for (const comment of comments) {
            if (!comment.parentId) continue;
            const list = map.get(comment.parentId) || [];
            list.push(comment);
            map.set(comment.parentId, list);
        }
        for (const list of map.values()) {
            list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return map;
    }, [comments]);

    const knownIds = useMemo(() => new Set(comments.map((comment) => comment.id)), [comments]);
    const roots = useMemo(() => {
        const list = comments.filter((comment) => !comment.parentId || !knownIds.has(comment.parentId));
        return [...list].sort((a, b) => {
            if (sort === 'replied') {
                const diff = (childrenByParent.get(b.id)?.length || 0) - (childrenByParent.get(a.id)?.length || 0);
                if (diff) return diff;
            }
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return sort === 'oldest' ? aTime - bTime : bTime - aTime;
        });
    }, [childrenByParent, comments, knownIds, sort]);

    const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!challenge) return;
        setSubmitting(true);
        setError('');
        setNotice('');
        const form = event.currentTarget;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceType,
                    sourceKey,
                    parentId: replyTarget?.id || null,
                    authorName: formData.get('authorName'),
                    authorEmail: formData.get('authorEmail'),
                    content: formData.get('content'),
                    website: formData.get('website'),
                    challengeToken: challenge.token,
                    challengeAnswer: formData.get('challengeAnswer'),
                }),
            });
            const data = await response.json();
            if (!response.ok && response.status !== 202) throw new Error(data.error || 'Unable to post comment.');
            if (data.comment) setComments((current) => [...current, data.comment as PublicComment]);
            setNotice('Comment submitted.');
            setChallenge(null);
            setReplyTarget(null);
            setComposerOpen(false);
            form.reset();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to post comment.');
            setChallenge(null);
            await loadChallenge();
        } finally {
            setSubmitting(false);
        }
    };

    const copyCommentLink = async (id: string) => {
        const url = `${window.location.origin}${window.location.pathname}#comment-${id}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1400);
    };

    const fieldClass = 'w-full border-0 border-b border-foreground/15 bg-transparent px-0 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/45 focus:border-foreground/45 focus:ring-0';

    const composer = (inline = false) => (
        <form onSubmit={submit} className={inline ? 'mt-5 border-l border-foreground/10 pl-4 sm:pl-5' : 'border-b border-foreground/10 py-6'}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{replyTarget ? `Reply to ${replyTarget.authorName}` : 'Leave a comment'}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Name is public. Email is optional and private.</p>
                </div>
                <button type="button" onClick={closeComposer} className="text-muted-foreground transition hover:text-foreground" aria-label="Close comment form"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <label className="block"><span className="text-[11px] text-muted-foreground">Name *</span><input name="authorName" required maxLength={80} autoComplete="name" className={fieldClass} /></label>
                <label className="block"><span className="text-[11px] text-muted-foreground">Email <span className="opacity-60">(optional)</span></span><input name="authorEmail" type="email" maxLength={160} autoComplete="email" className={fieldClass} /></label>
            </div>

            <label className="mt-5 block">
                <span className="text-[11px] text-muted-foreground">{replyTarget ? 'Reply *' : 'Comment *'}</span>
                <textarea name="content" required maxLength={3000} rows={4} placeholder={replyTarget ? `Reply to ${replyTarget.authorName}…` : 'Write your comment…'} className={`${fieldClass} min-h-28 resize-y leading-7`} />
            </label>

            <div className="mt-5 flex flex-col gap-5 border-t border-foreground/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1 sm:max-w-sm">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-3 w-3" />Verification</span>
                    <div className="mt-2 flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">{loadingChallenge ? 'Loading question…' : challenge?.question || 'Verification unavailable'}</p>
                            <input name="challengeAnswer" required inputMode="numeric" pattern="[0-9]*" placeholder="Answer" className={fieldClass} />
                        </div>
                        <button type="button" onClick={() => { setChallenge(null); void loadChallenge(); }} disabled={loadingChallenge} className="mb-2 text-muted-foreground transition hover:text-foreground disabled:opacity-40" aria-label="New verification question"><RefreshCw className={`h-4 w-4 ${loadingChallenge ? 'animate-spin' : ''}`} /></button>
                    </div>
                </div>
                <button type="submit" disabled={submitting || !challenge} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"><Send className="h-3.5 w-3.5" />{submitting ? 'Posting…' : replyTarget ? 'Post reply' : 'Post comment'}</button>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-muted-foreground/65">By posting, you acknowledge the <Link href="/privacy" className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground">Privacy Policy</Link> and <Link href="/terms" className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground">Terms of Use</Link>.</p>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </form>
    );

    const renderComment = (comment: PublicComment, depth = 0): React.ReactNode => {
        const replies = childrenByParent.get(comment.id) || [];
        const visualDepth = Math.min(depth, 3);
        return (
            <div key={comment.id} className={visualDepth > 0 ? 'border-l border-foreground/10 pl-4 sm:pl-5' : ''} style={visualDepth > 1 ? { marginLeft: `${(visualDepth - 1) * 12}px` } : undefined}>
                <article id={`comment-${comment.id}`} className="scroll-mt-28 border-b border-foreground/10 py-6 transition-colors target:bg-foreground/[0.025]">
                    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <strong className="break-words text-sm font-semibold text-foreground">{comment.authorName}</strong>
                        <time className="font-mono text-[10px] text-muted-foreground/65" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                    </div>
                    {depth >= 3 && comment.parentId ? <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/55">Nested reply</p> : null}
                    <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground/88">{comment.content}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <button type="button" onClick={() => openComposer({ id: comment.id, authorName: comment.authorName })} className="inline-flex items-center gap-1.5 transition hover:text-foreground"><CornerUpLeft className="h-3.5 w-3.5" />Reply</button>
                        <button type="button" onClick={() => void copyCommentLink(comment.id)} className="inline-flex items-center gap-1.5 transition hover:text-foreground">{copiedId === comment.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedId === comment.id ? 'Copied' : 'Copy link'}</button>
                    </div>
                    {composerOpen && replyTarget?.id === comment.id ? composer(true) : null}
                </article>
                {replies.map((reply) => renderComment(reply, depth + 1))}
            </div>
        );
    };

    return (
        <section className="mx-auto w-full border-t border-foreground/10 pt-8" aria-labelledby={`comments-${sourceType.toLowerCase()}-${sourceKey}`}>
            <div className="flex flex-col gap-5 border-b border-foreground/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 text-muted-foreground" /><h3 id={`comments-${sourceType.toLowerCase()}-${sourceKey}`} className="text-lg font-semibold tracking-tight">Discussion</h3><span className="font-mono text-[10px] text-muted-foreground">{comments.length}</span></div>
                    <p className="mt-2 text-sm text-muted-foreground">Thoughts and responses from readers.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {(['newest', 'oldest', 'replied'] as const).map((value) => <button key={value} type="button" onClick={() => setSort(value)} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${sort === value ? 'border-foreground bg-foreground text-background' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>{value === 'replied' ? 'Most replied' : value[0].toUpperCase() + value.slice(1)}</button>)}
                    {!composerOpen ? <button type="button" onClick={() => openComposer()} className="rounded-full border border-foreground/15 bg-foreground/[0.035] px-4 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-foreground/[0.06]">Leave a comment</button> : null}
                </div>
            </div>

            {notice ? <p className="border-b border-foreground/10 py-3 text-xs text-muted-foreground">{notice}</p> : null}
            {composerOpen && !replyTarget ? composer(false) : null}

            {comments.length === 0 ? (
                <div className="py-8"><p className="text-sm text-muted-foreground">No comments yet.</p>{!composerOpen ? <button type="button" onClick={() => openComposer()} className="mt-2 text-xs font-medium text-foreground/75 transition hover:text-foreground">Start the conversation</button> : null}</div>
            ) : <div>{roots.map((comment) => renderComment(comment))}</div>}
        </section>
    );
}
