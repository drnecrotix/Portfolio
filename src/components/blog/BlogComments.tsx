'use client';

import { useState, type FormEvent } from 'react';
import { CornerUpLeft, MessageCircle, RefreshCw, Send, ShieldCheck, X } from 'lucide-react';

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

    const fieldClass = 'w-full rounded-lg border border-foreground/10 bg-foreground/[0.035] px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/45 focus:border-foreground/25 focus:bg-foreground/[0.05] focus:ring-0';
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
                ? 'ml-5 border-l border-foreground/10 px-4 py-4 sm:ml-8 sm:px-5'
                : 'border-t border-foreground/10 px-4 py-5 first:border-t-0 sm:px-5'}
        >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <strong className="break-words text-sm font-semibold text-foreground">{comment.authorName}</strong>
                <time className="text-xs text-muted-foreground/65" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground/90">{comment.content}</p>
            {!isReply && (
                <button
                    type="button"
                    onClick={() => startReply(comment)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
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
            <div className="mb-4 flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 id="comments-title" className="text-base font-semibold tracking-tight sm:text-lg">Comments</h3>
                <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{comments.length}</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.018]">
                <button
                    type="button"
                    onClick={openComposer}
                    disabled={composerOpen}
                    className="group flex w-full items-center gap-3 border-b border-foreground/10 px-3 py-3 text-left transition hover:bg-foreground/[0.025] disabled:cursor-default sm:px-4"
                    aria-expanded={composerOpen}
                >
                    <div className="min-w-0 flex-1 rounded-lg bg-foreground/[0.055] px-4 py-3 text-sm text-muted-foreground/70 transition group-hover:bg-foreground/[0.07]">
                        {replyTarget ? `Reply to ${replyTarget.authorName}…` : 'Leave a comment…'}
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition group-hover:text-foreground" aria-hidden="true">
                        <Send className="h-4 w-4" />
                    </span>
                </button>

                {composerOpen && (
                    <form id="comment-composer" onSubmit={submit} className="border-b border-foreground/10 bg-background/35 p-4 sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-semibold">{replyTarget ? `Reply to ${replyTarget.authorName}` : 'Leave a comment'}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">Name is shown publicly. Email is optional and private.</p>
                            </div>
                            <button type="button" onClick={closeComposer} className="rounded-md p-1 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground" aria-label="Close comment form">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="sr-only">Name</span>
                                <input name="authorName" required maxLength={80} autoComplete="name" placeholder="Name *" className={fieldClass} />
                            </label>
                            <label className="block">
                                <span className="sr-only">Email</span>
                                <input name="authorEmail" type="email" maxLength={160} autoComplete="email" placeholder="Email (optional)" className={fieldClass} />
                            </label>
                        </div>

                        <label className="mt-3 block">
                            <span className="sr-only">{replyTarget ? 'Reply' : 'Comment'}</span>
                            <textarea name="content" required maxLength={3000} rows={4} placeholder={replyTarget ? `Reply to ${replyTarget.authorName}…` : 'Write your comment…'} className={`${fieldClass} min-h-28 resize-y leading-6`} />
                        </label>

                        <div className="mt-4 flex flex-col gap-4 border-t border-foreground/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 flex-1 sm:max-w-sm">
                                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck className="h-3 w-3" />Bot check</span>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <span className="min-w-0 text-xs text-muted-foreground">{loadingChallenge ? 'Loading…' : challenge?.question || 'Verification unavailable'}</span>
                                    <input name="challengeAnswer" required inputMode="numeric" pattern="[0-9]*" placeholder="Answer" className="w-24 rounded-md border border-foreground/10 bg-foreground/[0.035] px-2.5 py-2 text-xs outline-none focus:border-foreground/25" />
                                    <button type="button" onClick={() => { setChallenge(null); void loadChallenge(); }} disabled={loadingChallenge} className="text-muted-foreground transition hover:text-foreground disabled:opacity-40" aria-label="New bot-check question">
                                        <RefreshCw className={`h-3.5 w-3.5 ${loadingChallenge ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting || !challenge} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
                                <Send className="h-3.5 w-3.5" />{submitting ? 'Posting…' : replyTarget ? 'Post reply' : 'Post comment'}
                            </button>
                        </div>

                        <div aria-live="polite" className="mt-3 min-h-4 text-xs">
                            {error && <span className="text-red-500">{error}</span>}
                            {!error && message && <span className="text-emerald-500">{message}</span>}
                        </div>

                        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                    </form>
                )}

                {comments.length === 0 ? (
                    <div className="px-4 py-8 text-center sm:px-5">
                        <p className="text-sm text-muted-foreground">No comments yet.</p>
                        <button type="button" onClick={openComposer} className="mt-2 text-xs font-medium text-foreground/75 transition hover:text-foreground">Start the conversation</button>
                    </div>
                ) : (
                    <div>
                        {roots.map((comment) => {
                            const replies = comments.filter((item) => item.parentId === comment.id);
                            return <div key={comment.id}>{renderComment(comment)}{replies.map((reply) => renderComment(reply, true))}</div>;
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
