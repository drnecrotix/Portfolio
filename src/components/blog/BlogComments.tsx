'use client';

import { useState, type FormEvent } from 'react';
import { CornerUpLeft, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';

export type PublicBlogComment = {
    id: string;
    parentId: string | null;
    authorName: string;
    content: string;
    createdAt: string;
};

type Challenge = { question: string; token: string };
type ReplyTarget = { id: string; authorName: string } | null;

async function fetchChallenge() {
    const response = await fetch('/api/blog/comments/challenge', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load bot check.');
    return data as Challenge;
}

export function BlogComments({ postId, initialComments }: { postId: string; initialComments: PublicBlogComment[] }) {
    const [comments, setComments] = useState(initialComments);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loadingChallenge, setLoadingChallenge] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
    const [composerOpen, setComposerOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadChallenge = async () => {
        setLoadingChallenge(true);
        setError('');
        try { setChallenge(await fetchChallenge()); }
        catch (challengeError) { setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.'); }
        finally { setLoadingChallenge(false); }
    };

    const closeComposer = () => {
        setComposerOpen(false);
        setReplyTarget(null);
        setMessage('');
        setError('');
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!challenge) return;
        setSubmitting(true);
        setError('');
        setMessage('');
        const form = event.currentTarget;
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/blog/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
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
            if (!response.ok) throw new Error(data.error || 'Unable to post comment.');
            setComments((current) => [...current, data.comment as PublicBlogComment]);
            form.reset();
            setReplyTarget(null);
            setChallenge(null);
            setComposerOpen(false);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to post comment.');
            setChallenge(null);
            await loadChallenge();
        } finally {
            setSubmitting(false);
        }
    };

    const fieldClass = 'w-full border-0 border-b border-foreground/15 bg-transparent px-0 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/45 focus:border-foreground/45 focus:ring-0';
    const roots = comments.filter((comment) => !comment.parentId);

    const openComposer = () => {
        setReplyTarget(null);
        setMessage('');
        setError('');
        setComposerOpen(true);
        if (!challenge && !loadingChallenge) void loadChallenge();
        window.requestAnimationFrame(() => document.getElementById('comment-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    };

    const startReply = (comment: PublicBlogComment) => {
        setReplyTarget({ id: comment.id, authorName: comment.authorName });
        setMessage('');
        setError('');
        setComposerOpen(true);
        if (!challenge && !loadingChallenge) void loadChallenge();
        window.requestAnimationFrame(() => document.getElementById('comment-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    };

    const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    });

    const renderComment = (comment: PublicBlogComment, isReply = false) => (
        <article
            key={comment.id}
            className={isReply
                ? 'ml-4 border-l border-foreground/10 py-4 pl-5 sm:ml-7 sm:pl-6'
                : 'rounded-xl border border-foreground/10 bg-foreground/[0.018] px-5 py-5 shadow-[0_1px_0_rgba(255,255,255,0.02)] sm:px-6 sm:py-6'}
        >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="break-words text-sm font-semibold text-foreground">{comment.authorName}</strong>
                <span className="text-muted-foreground/35">·</span>
                <time className="text-xs text-muted-foreground/65" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground/90">{comment.content}</p>
            {!isReply && (
                <button
                    type="button"
                    onClick={() => startReply(comment)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
                    aria-label={`Reply to ${comment.authorName}`}
                >
                    <CornerUpLeft className="h-3.5 w-3.5" />
                    Reply
                </button>
            )}
        </article>
    );

    return (
        <section className="mx-auto w-full border-t border-foreground/10 pt-8" aria-labelledby="comments-title">
            <div className="flex flex-col gap-4 border-b border-foreground/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <h3 id="comments-title" className="text-lg font-semibold tracking-tight">Comments</h3>
                        <span className="font-mono text-[10px] text-muted-foreground">{comments.length}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Thoughts, replies and notes from readers.</p>
                </div>

                {!composerOpen && (
                    <button
                        type="button"
                        onClick={openComposer}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.035] px-4 py-2 text-xs font-medium text-foreground transition hover:border-foreground/25 hover:bg-foreground/[0.06]"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Leave a comment
                    </button>
                )}
            </div>

            {composerOpen && (
                <form id="comment-composer" onSubmit={submit} className="border-b border-foreground/10 py-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-semibold">{replyTarget ? `Reply to ${replyTarget.authorName}` : 'Leave a comment'}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">Name is public. Email is optional and private.</p>
                        </div>
                        <button type="button" onClick={closeComposer} className="text-muted-foreground transition hover:text-foreground" aria-label="Close comment form">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                            <span className="text-[11px] text-muted-foreground">Name *</span>
                            <input name="authorName" required maxLength={80} autoComplete="name" className={fieldClass} />
                        </label>
                        <label className="block">
                            <span className="text-[11px] text-muted-foreground">Email <span className="opacity-60">(optional)</span></span>
                            <input name="authorEmail" type="email" maxLength={160} autoComplete="email" className={fieldClass} />
                        </label>
                    </div>

                    <label className="mt-6 block">
                        <span className="text-[11px] text-muted-foreground">{replyTarget ? 'Reply *' : 'Comment *'}</span>
                        <textarea name="content" required maxLength={3000} rows={5} placeholder={replyTarget ? `Reply to ${replyTarget.authorName}…` : 'Write your comment…'} className={`${fieldClass} min-h-32 resize-y leading-7`} />
                    </label>

                    <div className="mt-6 flex flex-col gap-5 border-t border-foreground/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 flex-1 sm:max-w-sm">
                            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"><ShieldCheck className="h-3 w-3" />Bot check</span>
                            <div className="mt-2 flex items-end gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">{loadingChallenge ? 'Loading question…' : challenge?.question || 'Verification unavailable'}</p>
                                    <input name="challengeAnswer" required inputMode="numeric" pattern="[0-9]*" placeholder="Answer" className={fieldClass} />
                                </div>
                                <button type="button" onClick={() => { setChallenge(null); void loadChallenge(); }} disabled={loadingChallenge} className="mb-2 text-muted-foreground transition hover:text-foreground disabled:opacity-40" aria-label="New bot-check question">
                                    <RefreshCw className={`h-4 w-4 ${loadingChallenge ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={submitting || !challenge} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
                            <Send className="h-3.5 w-3.5" />{submitting ? 'Posting…' : replyTarget ? 'Post reply' : 'Post comment'}
                        </button>
                    </div>

                    <div aria-live="polite" className="mt-3 min-h-5 text-xs">
                        {error && <span className="text-red-500">{error}</span>}
                        {!error && message && <span className="text-emerald-500">{message}</span>}
                    </div>

                    <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                </form>
            )}

            {comments.length === 0 ? (
                <div className="py-8">
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                    {!composerOpen && <button type="button" onClick={openComposer} className="mt-2 text-xs font-medium text-foreground/75 transition hover:text-foreground">Start the conversation</button>}
                </div>
            ) : (
                <div className="space-y-4 py-6">
                    {roots.map((comment) => {
                        const replies = comments.filter((item) => item.parentId === comment.id);
                        return (
                            <div key={comment.id}>
                                {renderComment(comment)}
                                {replies.length > 0 && <div className="mt-1">{replies.map((reply) => renderComment(reply, true))}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
