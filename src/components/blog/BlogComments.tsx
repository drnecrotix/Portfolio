'use client';

import { useState, type FormEvent } from 'react';
import { CornerUpLeft, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';

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

    const fieldClass = 'w-full rounded-lg border border-foreground/10 bg-background px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/45 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
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

    const renderComment = (comment: PublicBlogComment, isReply = false) => (
        <article key={comment.id} className={isReply ? 'ml-5 border-l border-foreground/10 py-4 pl-4 sm:ml-8 sm:pl-5' : 'border-b border-foreground/10 py-5 first:pt-0'}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <strong className="text-sm font-semibold">{comment.authorName}</strong>
                <time className="font-mono text-[10px] text-muted-foreground/70" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{comment.content}</p>
            {!isReply && (
                <button type="button" onClick={() => startReply(comment)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 transition hover:text-foreground" aria-label={`Reply to ${comment.authorName}`} title="Reply">
                    <CornerUpLeft className="h-3.5 w-3.5" />
                    Reply
                </button>
            )}
        </article>
    );

    return (
        <section className="mx-auto mt-14 w-full border-t border-foreground/10 pb-8 pt-8 sm:mt-16 sm:pt-10" aria-labelledby="comments-title">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <h3 id="comments-title" className="text-base font-semibold tracking-tight">Comments</h3>
                    <span className="font-mono text-[10px] text-muted-foreground">{comments.length}</span>
                </div>
                {!composerOpen && (
                    <button type="button" onClick={openComposer} className="text-xs font-medium text-muted-foreground transition hover:text-foreground">
                        Leave a comment
                    </button>
                )}
            </div>

            {comments.length === 0 ? (
                <p className="mb-6 border-y border-foreground/10 py-5 text-sm text-muted-foreground">No comments yet.</p>
            ) : (
                <div className="mb-7 border-t border-foreground/10 pt-5">
                    {roots.map((comment) => {
                        const replies = comments.filter((item) => item.parentId === comment.id);
                        return <div key={comment.id}>{renderComment(comment)}{replies.map((reply) => renderComment(reply, true))}</div>;
                    })}
                </div>
            )}

            {!composerOpen ? null : (
                <form id="comment-composer" onSubmit={submit} className="border-t border-foreground/10 pt-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-semibold">{replyTarget ? `Reply to ${replyTarget.authorName}` : 'Leave a comment'}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">Email is optional and never shown publicly.</p>
                        </div>
                        <button type="button" onClick={closeComposer} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground" aria-label={replyTarget ? 'Cancel reply' : 'Close comment form'} title={replyTarget ? 'Cancel reply' : 'Close'}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Name *</span>
                            <input name="authorName" required maxLength={80} autoComplete="name" className={fieldClass} />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Email <span className="font-normal opacity-70">(optional)</span></span>
                            <input name="authorEmail" type="email" maxLength={160} autoComplete="email" className={fieldClass} />
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{replyTarget ? 'Reply *' : 'Comment *'}</span>
                        <textarea name="content" required maxLength={3000} rows={6} placeholder={replyTarget ? `Reply to ${replyTarget.authorName}…` : 'Write your comment…'} className={`${fieldClass} min-h-40 resize-y leading-6`} />
                    </label>

                    <div className="mt-4 flex flex-col gap-3 border-t border-foreground/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"><ShieldCheck className="h-3 w-3" />Bot check</span>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <span className="text-xs text-foreground/80">{loadingChallenge ? 'Loading question…' : challenge?.question || 'Verification unavailable'}</span>
                                <input name="challengeAnswer" required inputMode="numeric" pattern="[0-9]*" placeholder="Answer" className={`${fieldClass} sm:w-28`} />
                                <button type="button" onClick={() => { setChallenge(null); void loadChallenge(); }} disabled={loadingChallenge} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-40" aria-label="New bot-check question" title="New bot-check question">
                                    <RefreshCw className={`h-3.5 w-3.5 ${loadingChallenge ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={submitting || !challenge} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
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
        </section>
    );
}
