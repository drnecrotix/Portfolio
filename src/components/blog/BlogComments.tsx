'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MessageSquare, RefreshCw, Send } from 'lucide-react';

export type PublicBlogComment = {
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
};

type Challenge = {
    question: string;
    token: string;
};

async function fetchChallenge() {
    const response = await fetch('/api/blog/comments/challenge', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load bot check.');
    return data as Challenge;
}

export function BlogComments({ postId, initialComments }: { postId: string; initialComments: PublicBlogComment[] }) {
    const [comments, setComments] = useState(initialComments);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loadingChallenge, setLoadingChallenge] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const loadChallenge = async () => {
        setLoadingChallenge(true);
        setError('');
        try {
            setChallenge(await fetchChallenge());
        } catch (challengeError) {
            setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.');
        } finally {
            setLoadingChallenge(false);
        }
    };

    useEffect(() => {
        let active = true;
        fetchChallenge()
            .then((data) => {
                if (active) setChallenge(data);
            })
            .catch((challengeError) => {
                if (active) setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.');
            })
            .finally(() => {
                if (active) setLoadingChallenge(false);
            });
        return () => {
            active = false;
        };
    }, []);

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
            setMessage('Comment published.');
            await loadChallenge();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to post comment.');
            await loadChallenge();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="container mx-auto mt-20 max-w-7xl border-t border-foreground/10 px-6 pt-16" aria-labelledby="comments-title">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <div className="mb-8 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5" />
                        <h3 id="comments-title" className="text-2xl font-black tracking-tight">Comments</h3>
                        <span className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-2.5 py-1 text-xs text-muted-foreground">{comments.length}</span>
                    </div>
                    {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
                    ) : (
                        <div className="space-y-7">
                            {comments.map((comment) => (
                                <article key={comment.id} className="border-b border-foreground/10 pb-7 last:border-b-0">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <strong className="text-sm">{comment.authorName}</strong>
                                        <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{comment.content}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5">
                    <form onSubmit={submit} className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-5 sm:p-6">
                        <h4 className="mb-1 font-bold">Leave a comment</h4>
                        <p className="mb-6 text-xs leading-relaxed text-muted-foreground">Your email is optional and is never displayed publicly. Complete the bot check before submitting.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-2 block text-xs font-medium text-muted-foreground">Name</span>
                                <input name="authorName" required maxLength={80} className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-xs font-medium text-muted-foreground">Email (optional)</span>
                                <input name="authorEmail" type="email" maxLength={160} className="w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
                            </label>
                        </div>
                        <label className="mt-4 block">
                            <span className="mb-2 block text-xs font-medium text-muted-foreground">Comment</span>
                            <textarea name="content" required maxLength={3000} rows={5} className="w-full resize-y rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30" />
                        </label>

                        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                            <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                        </div>

                        <div className="mt-4 rounded-xl border border-foreground/10 bg-background/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bot check</span>
                                    <span className="mt-1 block text-sm font-semibold">{loadingChallenge ? 'Loading question…' : challenge?.question || 'Verification unavailable'}</span>
                                </div>
                                <button type="button" onClick={() => void loadChallenge()} disabled={loadingChallenge} className="rounded-lg border border-foreground/10 p-2 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-40" aria-label="New bot-check question">
                                    <RefreshCw className={`h-4 w-4 ${loadingChallenge ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <input name="challengeAnswer" required inputMode="numeric" placeholder="Your answer" className="mt-3 w-full rounded-lg border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/30" />
                        </div>

                        <div aria-live="polite" className="mt-4 min-h-5 text-xs">
                            {error && <span className="text-red-500">{error}</span>}
                            {!error && message && <span className="text-emerald-500">{message}</span>}
                        </div>
                        <button type="submit" disabled={submitting || !challenge} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                            <Send className="h-4 w-4" />
                            {submitting ? 'Posting…' : 'Post comment'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
