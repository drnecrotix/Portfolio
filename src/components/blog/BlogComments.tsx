'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MessageSquare, RefreshCw, Send, ShieldCheck } from 'lucide-react';

export type PublicBlogComment = {
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
};

type Challenge = { question: string; token: string };

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
        try { setChallenge(await fetchChallenge()); }
        catch (challengeError) { setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.'); }
        finally { setLoadingChallenge(false); }
    };

    useEffect(() => {
        let active = true;
        fetchChallenge().then((data) => { if (active) setChallenge(data); }).catch((challengeError) => { if (active) setError(challengeError instanceof Error ? challengeError.message : 'Unable to load bot check.'); }).finally(() => { if (active) setLoadingChallenge(false); });
        return () => { active = false; };
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
        } finally { setSubmitting(false); }
    };

    const fieldClass = 'w-full rounded-xl border border-foreground/10 bg-background px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-foreground/35 focus:ring-2 focus:ring-foreground/5 sm:text-sm';

    return (
        <section className="mx-auto mt-14 w-full max-w-7xl border-t border-foreground/10 px-4 pb-10 pt-10 sm:mt-20 sm:px-6 sm:pt-14" aria-labelledby="comments-title">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="min-w-0 lg:col-span-7">
                    <div className="mb-6 flex items-center gap-3 sm:mb-8">
                        <span className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.05]"><MessageSquare className="h-4 w-4" /></span>
                        <h3 id="comments-title" className="text-xl font-black tracking-tight sm:text-2xl">Comments</h3>
                        <span className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-2.5 py-1 text-xs text-muted-foreground">{comments.length}</span>
                    </div>
                    {comments.length === 0 ? <div className="rounded-2xl border border-dashed border-foreground/10 px-5 py-8 text-center"><p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p></div> : (
                        <div className="space-y-5">{comments.map((comment) => (
                            <article key={comment.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5">
                                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"><strong className="break-words text-sm">{comment.authorName}</strong><time className="text-[11px] text-muted-foreground sm:text-xs" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></div>
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground sm:leading-7">{comment.content}</p>
                            </article>
                        ))}</div>
                    )}
                </div>

                <div className="min-w-0 lg:col-span-5">
                    <form onSubmit={submit} className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05]"><MessageSquare className="h-4 w-4" /></span><div><h4 className="font-bold">Leave a comment</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Email is optional and never shown publicly.</p></div></div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block"><span className="mb-2 block text-xs font-medium text-muted-foreground">Name *</span><input name="authorName" required maxLength={80} autoComplete="name" className={fieldClass} /></label>
                            <label className="block"><span className="mb-2 block text-xs font-medium text-muted-foreground">Email <span className="font-normal opacity-70">(optional)</span></span><input name="authorEmail" type="email" maxLength={160} autoComplete="email" className={fieldClass} /></label>
                        </div>

                        <label className="mt-4 block"><span className="mb-2 block text-xs font-medium text-muted-foreground">Comment *</span><textarea name="content" required maxLength={3000} rows={5} placeholder="Write your comment…" className={`${fieldClass} min-h-32 resize-y leading-7`} /></label>

                        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

                        <div className="mt-4 rounded-xl border border-foreground/10 bg-background/70 p-3.5 sm:p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0"><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Bot check</span><span className="mt-1.5 block break-words text-sm font-semibold">{loadingChallenge ? 'Loading question…' : challenge?.question || 'Verification unavailable'}</span></div>
                                <button type="button" onClick={() => void loadChallenge()} disabled={loadingChallenge} className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-40" aria-label="New bot-check question"><RefreshCw className={`h-4 w-4 ${loadingChallenge ? 'animate-spin' : ''}`} /></button>
                            </div>
                            <input name="challengeAnswer" required inputMode="numeric" pattern="[0-9]*" placeholder="Answer" className={`${fieldClass} mt-3`} />
                        </div>

                        <div aria-live="polite" className="mt-4 min-h-5 text-xs">{error && <span className="text-red-500">{error}</span>}{!error && message && <span className="text-emerald-500">{message}</span>}</div>
                        <button type="submit" disabled={submitting || !challenge} className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Send className="h-4 w-4" />{submitting ? 'Posting…' : 'Post comment'}</button>
                    </form>
                </div>
            </div>
        </section>
    );
}
