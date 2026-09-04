'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Github, Instagram, Linkedin, Loader2, Mail, MapPin, Send, Twitter } from 'lucide-react';
import type { ContactSettings, SocialSettings } from '@/lib/site-settings';

type Props = {
    contact: ContactSettings;
    socials: SocialSettings;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

type FormState = {
    name: string;
    email: string;
    reason: string;
    subject: string;
    message: string;
    privacyAccepted: boolean;
    company: string;
    startedAt: number;
};

function createInitialForm(): FormState {
    return {
        name: '',
        email: '',
        reason: 'PROJECT',
        subject: '',
        message: '',
        privacyAccepted: false,
        company: '',
        startedAt: Date.now(),
    };
}

const fieldClass = 'mt-2 w-full border-0 border-b border-foreground/20 bg-transparent px-0 py-3 text-lg text-foreground outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground/45';
const selectClass = `${fieldClass} cursor-pointer bg-background text-foreground [color-scheme:light] dark:bg-zinc-950 dark:text-white dark:[color-scheme:dark]`;

const socialMeta = [
    ['github', 'GitHub', Github],
    ['instagram', 'Instagram', Instagram],
    ['linkedin', 'LinkedIn', Linkedin],
    ['twitter', 'X / Twitter', Twitter],
] as const;

const reasonOptions = [
    ['PROJECT', 'Project / collaboration'],
    ['DEVELOPMENT', 'Development / technical'],
    ['CREATIVE', 'Creative work'],
    ['COMMUNITY', 'Community'],
    ['PARTNERSHIP', 'Partnership'],
    ['BUSINESS', 'Business enquiry'],
    ['SUPPORT', 'Technical support'],
    ['MEDIA', 'Media / press'],
    ['CAREER', 'Career / opportunity'],
    ['FEEDBACK', 'Feedback / suggestion'],
    ['OTHER', 'Other'],
] as const;

export function ContactV2({ contact, socials }: Props) {
    const [form, setForm] = useState<FormState>(() => createInitialForm());
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState('');

    const visibleSocials = useMemo(() => socialMeta
        .map(([key, label, Icon]) => ({ key, label, Icon, url: socials[key] }))
        .filter((item) => Boolean(item.url)), [socials]);

    const update = (key: keyof FormState, value: string | boolean) => {
        setForm((current) => ({ ...current, [key]: value }));
        if (status === 'error') {
            setStatus('idle');
            setError('');
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (status === 'loading') return;
        setStatus('loading');
        setError('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                setStatus('error');
                setError(payload?.error || 'The message could not be sent. Please try again.');
                return;
            }

            setStatus('success');
            setForm(createInitialForm());
        } catch {
            setStatus('error');
            setError('The message could not be sent. Check your connection and try again.');
        }
    };

    return (
        <main className="min-h-screen bg-background text-foreground px-6 pb-24 pt-32 md:px-12 md:pt-40">
            <div className="mx-auto grid w-full max-w-7xl gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
                <aside className="lg:sticky lg:top-36 lg:self-start">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Contact / 01</p>
                    <h1 className="mt-5 text-5xl font-black tracking-[-0.05em] md:text-7xl">Start a<br />conversation.</h1>
                    <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground md:text-lg">Projects, collaborations, technical work or a thoughtful idea. Send the essentials and I will have enough context to reply properly.</p>

                    <div className="mt-12 space-y-5 border-t border-foreground/10 pt-8 text-sm">
                        {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-foreground"><Mail className="size-4" />{contact.email}</a>}
                        {contact.location && <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="size-4" />{contact.location}</div>}
                    </div>

                    {visibleSocials.length > 0 && (
                        <div className="mt-10 flex flex-wrap gap-3">
                            {visibleSocials.map(({ key, label, Icon, url }) => (
                                <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex size-11 items-center justify-center rounded-full border border-foreground/10 transition-all hover:-translate-y-1 hover:border-foreground/30">
                                    <Icon className="size-4" />
                                </a>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="relative">
                    {status === 'success' ? (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[520px] flex-col justify-center border-y border-foreground/10 py-16">
                            <CheckCircle2 className="size-10" />
                            <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">Message received.</h2>
                            <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">Thanks for reaching out. Your message has been sent successfully and the conversation can continue from there.</p>
                            <button type="button" onClick={() => { setStatus('idle'); setForm(createInitialForm()); }} className="mt-10 flex w-fit items-center gap-2 border-b border-foreground pb-1 text-sm font-semibold">Send another message <ArrowUpRight className="size-4" /></button>
                        </motion.div>
                    ) : (
                        <form onSubmit={submit} className="space-y-10" noValidate>
                            <div className="grid gap-8 md:grid-cols-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name
                                    <input value={form.name} onChange={(e) => update('name', e.target.value)} required minLength={2} maxLength={80} autoComplete="name" className={fieldClass} placeholder="Your name" />
                                </label>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Email
                                    <input value={form.email} onChange={(e) => update('email', e.target.value)} required type="email" maxLength={200} autoComplete="email" className={fieldClass} placeholder="you@example.com" />
                                </label>
                            </div>

                            <div className="grid gap-8 md:grid-cols-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reason
                                    <select value={form.reason} onChange={(e) => update('reason', e.target.value)} className={selectClass}>
                                        {reasonOptions.map(([value, label]) => <option key={value} value={value} className="bg-white text-black dark:bg-zinc-950 dark:text-white">{label}</option>)}
                                    </select>
                                </label>
                                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Subject
                                    <input value={form.subject} onChange={(e) => update('subject', e.target.value)} required minLength={3} maxLength={120} className={fieldClass} placeholder="What is this about?" />
                                </label>
                            </div>

                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Message
                                <textarea value={form.message} onChange={(e) => update('message', e.target.value)} required minLength={20} maxLength={3000} rows={8} className={`${fieldClass} resize-y leading-7`} placeholder="Context, goal, timeline, links - whatever helps explain the idea." />
                                <span className="mt-2 block text-right font-mono text-[10px] tracking-normal text-muted-foreground/60">{form.message.length} / 3000</span>
                            </label>

                            <div className="hidden" aria-hidden="true">
                                <label>Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => update('company', e.target.value)} /></label>
                            </div>

                            <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                                <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => update('privacyAccepted', e.target.checked)} required className="mt-1 size-4" />
                                <span>I have read the <Link href="/privacy" className="text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">Privacy & GDPR Policy</Link> and understand that these details will be processed to respond to this enquiry.</span>
                            </label>

                            {status === 'error' && <div role="alert" className="border-l-2 border-red-500 pl-4 text-sm text-red-400">{error}</div>}

                            <motion.button whileTap={{ scale: 0.99 }} disabled={status === 'loading'} type="submit" className="group flex w-full items-center justify-between border-y border-foreground py-7 text-left disabled:opacity-50">
                                <span className="text-3xl font-semibold tracking-tight md:text-4xl">{status === 'loading' ? 'Sending...' : 'Send message'}</span>
                                <span className="flex size-12 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:rotate-45">
                                    {status === 'loading' ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                                </span>
                            </motion.button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
