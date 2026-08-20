'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { SiteModeCountdown } from '@/components/site/SiteModeCountdown';
import { cn } from '@/lib/utils';

type Mode = 'MAINTENANCE' | 'COMING_SOON' | 'PRIVATE' | 'ARCHIVE';
type Template = 'hero' | 'split' | 'editorial';

type Props = {
    mode: Mode;
    template: string;
    title: string;
    message: string;
    startsAt?: string | null;
    endsAt?: string | null;
    initialNow: number;
    hasPrivatePassword: boolean;
    showContact: boolean;
    socialLinks: Array<[string, string]>;
    siteName: string;
};

const modeMeta: Record<Mode, { eyebrow: string; word: string; code: string; accent: string }> = {
    MAINTENANCE: { eyebrow: 'System maintenance', word: 'MAINTENANCE', code: '503', accent: 'text-sky-400' },
    COMING_SOON: { eyebrow: 'Work in progress', word: 'COMING SOON', code: 'SOON', accent: 'text-[#D1FF4D]' },
    PRIVATE: { eyebrow: 'Restricted access', word: 'PRIVATE', code: 'LOCK', accent: 'text-amber-400' },
    ARCHIVE: { eyebrow: 'Preserved edition', word: 'ARCHIVE', code: 'ARC', accent: 'text-violet-400' },
};

function PrivateForm({ enabled }: { enabled: boolean }) {
    if (!enabled) return null;
    return (
        <form action="/api/site-mode/private-access" method="post" className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="private-access-password">Access password</label>
            <div className="relative min-w-0 flex-1">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <input id="private-access-password" name="password" type="password" required autoComplete="current-password" placeholder="Access password" className="w-full rounded-full border border-white/15 bg-white/[0.04] py-3 pl-11 pr-5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/40" />
            </div>
            <button type="submit" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:opacity-85">Enter</button>
        </form>
    );
}

function FooterActions({ showContact, socialLinks }: Pick<Props, 'showContact' | 'socialLinks'>) {
    return (
        <div className="mt-10 flex flex-wrap items-center gap-3">
            {showContact && <Link href="/contact" className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/65 transition hover:border-white/30 hover:text-white">Contact</Link>}
            {socialLinks.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-xs text-white/45 transition hover:border-white/25 hover:text-white"><span>{label}</span><ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>)}
            <Link href="/admin/login" className="ml-auto rounded-full border border-white/10 px-4 py-2.5 text-xs text-white/30 transition hover:text-white/60">Admin</Link>
        </div>
    );
}

function Countdown(props: Props) {
    return props.endsAt ? <SiteModeCountdown startsAt={props.startsAt} endsAt={props.endsAt} initialNow={props.initialNow} /> : null;
}

function HeroTemplate(props: Props) {
    const meta = modeMeta[props.mode];
    return (
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle,_#888_0.5px,_transparent_0.5px)] opacity-15 [background-size:24px_24px] dark:bg-[radial-gradient(circle,_#444_0.5px,_transparent_0.5px)]" />
            <div className="absolute -left-[15vw] -top-[35vh] h-[70vh] w-[70vw] rounded-full bg-white/[0.035] blur-3xl" />
            <div className="absolute right-[-20vw] top-[15vh] h-[60vh] w-[60vw] rounded-full bg-white/[0.025] blur-3xl" />

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[105rem] flex-col justify-between px-6 py-10 md:px-12 lg:px-20">
                <div className="flex items-center justify-between border-b border-foreground/10 pb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                    <span>{props.siteName}</span><span>{meta.eyebrow}</span>
                </div>

                <section className="py-20 md:py-28">
                    <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className={cn('mb-7 text-xs font-bold uppercase tracking-[0.3em]', meta.accent)}>{meta.code} / {meta.eyebrow}</motion.p>
                    <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="max-w-[12ch] text-[clamp(4.25rem,11vw,12rem)] font-black leading-[0.82] tracking-[-0.065em] text-shiny">{props.title}</motion.h1>
                    <div className="mt-10 grid gap-8 border-t border-foreground/10 pt-8 lg:grid-cols-[1fr_0.55fr] lg:items-start">
                        <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{props.message}</p>
                        <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.025] p-6 backdrop-blur-xl">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Status</div>
                            <Countdown {...props} />
                            {props.mode === 'PRIVATE' && <PrivateForm enabled={props.hasPrivatePassword} />}
                        </div>
                    </div>
                    <FooterActions showContact={props.showContact && props.mode !== 'PRIVATE'} socialLinks={props.socialLinks} />
                </section>

                <div className="flex items-center justify-between border-t border-foreground/10 pt-5 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"><span>{meta.word}</span><span>Portfolio status</span></div>
            </div>
        </main>
    );
}

function SplitTemplate(props: Props) {
    const meta = modeMeta[props.mode];
    return (
        <main className="relative min-h-screen overflow-hidden bg-black text-white">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="relative z-10 mx-auto grid min-h-screen max-w-[105rem] lg:grid-cols-[1.1fr_0.9fr]">
                <section className="flex min-h-[55vh] flex-col justify-between border-white/10 px-7 py-10 lg:min-h-screen lg:border-r lg:px-16 lg:py-14">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/35"><span>{props.siteName}</span><span className={meta.accent}>{meta.code}</span></div>
                    <div className="py-20 lg:py-10">
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 0.1, scale: 1 }} transition={{ duration: 1.1 }} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[clamp(6rem,15vw,15rem)] font-black leading-none tracking-[-0.08em] text-white lg:left-8">{meta.word}</motion.div>
                        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-white/45">{meta.eyebrow}</p>
                        <h1 className="relative mt-6 max-w-4xl text-[clamp(3.5rem,8vw,8.5rem)] font-black leading-[0.88] tracking-[-0.06em]">{props.title}</h1>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/25">Designed to return</div>
                </section>

                <section className="flex flex-col justify-center px-7 py-14 lg:px-14">
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-2xl md:p-10">
                        <p className="max-w-xl text-base leading-7 text-white/55 md:text-lg">{props.message}</p>
                        <Countdown {...props} />
                        {props.mode === 'PRIVATE' && <PrivateForm enabled={props.hasPrivatePassword} />}
                        <FooterActions showContact={props.showContact && props.mode !== 'PRIVATE'} socialLinks={props.socialLinks} />
                    </div>
                </section>
            </div>
        </main>
    );
}

function EditorialTemplate(props: Props) {
    const meta = modeMeta[props.mode];
    return (
        <main className="min-h-screen bg-[#080808] px-6 py-8 text-white md:px-12 md:py-12">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[105rem] flex-col rounded-[2.25rem] border border-white/10 bg-[#0d0d0d] p-6 md:min-h-[calc(100vh-6rem)] md:p-10 lg:p-14">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/30"><span>{props.siteName}</span><span>{meta.code}</span></div>
                <div className="my-auto py-14">
                    <div className="grid gap-8 lg:grid-cols-[0.4fr_1fr] lg:items-end">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn('text-[clamp(5rem,13vw,13rem)] font-black leading-[0.75] tracking-[-0.08em]', meta.accent)}>{meta.code}</motion.div>
                        <div>
                            <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-white/35">{meta.eyebrow}</p>
                            <h1 className="max-w-5xl text-[clamp(3rem,7vw,7.5rem)] font-black leading-[0.9] tracking-[-0.055em]">{props.title}</h1>
                        </div>
                    </div>
                    <div className="mt-12 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[0.4fr_1fr]">
                        <Countdown {...props} />
                        <div>
                            <p className="max-w-3xl text-base leading-7 text-white/50">{props.message}</p>
                            {props.mode === 'PRIVATE' && <PrivateForm enabled={props.hasPrivatePassword} />}
                            <FooterActions showContact={props.showContact && props.mode !== 'PRIVATE'} socialLinks={props.socialLinks} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.28em] text-white/25"><span>{meta.word}</span><span>© {new Date().getFullYear()}</span></div>
            </div>
        </main>
    );
}

export function SiteModeExperience(props: Props) {
    const template: Template = ['hero', 'split', 'editorial'].includes(props.template) ? props.template as Template : 'hero';
    if (template === 'split') return <SplitTemplate {...props} />;
    if (template === 'editorial') return <EditorialTemplate {...props} />;
    return <HeroTemplate {...props} />;
}
