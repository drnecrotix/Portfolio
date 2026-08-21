'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { SiteModeCountdown } from '@/components/site/SiteModeCountdown';
import { cn } from '@/lib/utils';

type Mode = 'MAINTENANCE' | 'COMING_SOON' | 'PRIVATE' | 'ARCHIVE';
type Template = 'hero' | 'split' | 'editorial' | 'signal' | 'portal';

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
        <form action="/api/site-mode/private-access" method="post" className="mt-7 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
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
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
            {showContact && <Link href="/contact" className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/65 transition hover:border-white/30 hover:text-white">Contact</Link>}
            {socialLinks.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-xs text-white/45 transition hover:border-white/25 hover:text-white"><span>{label}</span><ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>)}
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <Link href="/admin/login" className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs text-white/35 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/70">Admin</Link>
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
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[105rem] flex-col justify-between px-6 py-8 md:px-12 md:py-10 lg:px-20">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 pb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground"><span>{props.siteName}</span><span>{meta.eyebrow}</span></div>
                <section className="py-14 md:py-20 lg:py-24">
                    <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className={cn('mb-6 text-xs font-bold uppercase tracking-[0.3em]', meta.accent)}>{meta.code} / {meta.eyebrow}</motion.p>
                    <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="max-w-[11ch] break-words text-[clamp(3.8rem,10vw,10.5rem)] font-black leading-[0.84] tracking-[-0.06em] text-shiny">{props.title}</motion.h1>
                    <div className="mt-9 grid gap-7 border-t border-foreground/10 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.48fr)] lg:items-start">
                        <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{props.message}</p>
                        <div className="min-w-0 rounded-3xl border border-foreground/10 bg-foreground/[0.025] p-5 backdrop-blur-xl md:p-6">
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
            <div className="relative z-10 mx-auto grid min-h-screen max-w-[105rem] lg:grid-cols-[1.08fr_0.92fr]">
                <section className="relative flex min-h-[54vh] min-w-0 flex-col justify-between overflow-hidden border-white/10 px-7 py-9 lg:min-h-screen lg:border-r lg:px-14 lg:py-12 xl:px-16">
                    <div className="relative z-10 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-white/35"><span className="truncate">{props.siteName}</span><span className={meta.accent}>{meta.code}</span></div>
                    <div className="relative z-10 py-14 lg:py-8">
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 0.075, scale: 1 }} transition={{ duration: 1.1 }} className="pointer-events-none absolute -left-2 top-1/2 max-w-full -translate-y-1/2 overflow-hidden whitespace-nowrap text-[clamp(6rem,13vw,13rem)] font-black leading-none tracking-[-0.08em] text-white">{meta.word}</motion.div>
                        <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-white/45">{meta.eyebrow}</p>
                        <h1 className="relative mt-6 max-w-[9ch] break-words text-[clamp(3.3rem,7.2vw,7.6rem)] font-black leading-[0.9] tracking-[-0.055em]">{props.title}</h1>
                    </div>
                    <div className="relative z-10 text-[10px] uppercase tracking-[0.25em] text-white/25">Designed to return</div>
                </section>
                <section className="flex min-w-0 flex-col justify-center px-7 py-10 lg:px-12 xl:px-14">
                    <div className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl md:p-9">
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
        <main className="min-h-screen overflow-hidden bg-[#080808] px-4 py-4 text-white sm:px-6 sm:py-6 md:px-10 md:py-8">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[105rem] min-w-0 flex-col rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] p-5 sm:min-h-[calc(100vh-3rem)] sm:p-7 md:min-h-[calc(100vh-4rem)] md:p-10 lg:p-12">
                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-white/30"><span>{props.siteName}</span><span>{meta.code}</span></div>
                <div className="my-auto py-10 md:py-12">
                    <div className="grid min-w-0 gap-7 lg:grid-cols-[0.34fr_minmax(0,1fr)] lg:items-end">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn('min-w-0 whitespace-nowrap text-[clamp(3.5rem,8.2vw,7.5rem)] font-black leading-[0.82] tracking-[-0.07em]', meta.accent)}>{meta.code}</motion.div>
                        <div className="min-w-0">
                            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-white/35">{meta.eyebrow}</p>
                            <h1 className="max-w-[10ch] break-words text-[clamp(3rem,6.5vw,6.8rem)] font-black leading-[0.92] tracking-[-0.05em]">{props.title}</h1>
                        </div>
                    </div>
                    <div className="mt-10 grid min-w-0 gap-7 border-t border-white/10 pt-7 lg:grid-cols-[0.34fr_minmax(0,1fr)]">
                        <div className="min-w-0"><Countdown {...props} /></div>
                        <div className="min-w-0">
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

function SignalTemplate(props: Props) {
    const meta = modeMeta[props.mode];
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#070707] px-5 py-8 text-white sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(209,255,77,0.08),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(56,189,248,0.06),transparent_28%)]" />
            <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between">
                <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.3em] text-white/35"><span>{props.siteName}</span><span>{meta.code}</span></div>
                <section className="mx-auto w-full max-w-4xl py-14 text-center">
                    <motion.div animate={{ scale: [1, 1.06, 1], opacity: [0.65, 1, 0.65] }} transition={{ duration: 3.2, repeat: Infinity }} className="mx-auto mb-8 flex size-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] shadow-[0_0_80px_rgba(209,255,77,0.08)]"><Sparkles className={cn('h-7 w-7', meta.accent)} /></motion.div>
                    <p className={cn('text-xs font-bold uppercase tracking-[0.32em]', meta.accent)}>{meta.eyebrow}</p>
                    <h1 className="mx-auto mt-6 max-w-[12ch] break-words text-[clamp(3.5rem,8vw,7.5rem)] font-black leading-[0.9] tracking-[-0.055em]">{props.title}</h1>
                    <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/50 md:text-lg">{props.message}</p>
                    <div className="mx-auto mt-8 max-w-2xl"><Countdown {...props} />{props.mode === 'PRIVATE' && <PrivateForm enabled={props.hasPrivatePassword} />}</div>
                    <div className="flex justify-center"><FooterActions showContact={props.showContact && props.mode !== 'PRIVATE'} socialLinks={props.socialLinks} /></div>
                </section>
                <div className="flex items-center justify-between border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.26em] text-white/25"><span>Signal active</span><span>{meta.word}</span></div>
            </div>
        </main>
    );
}

function PortalTemplate(props: Props) {
    const meta = modeMeta[props.mode];
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#080808] p-4 text-white sm:p-7 md:p-10">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.025),transparent_38%,rgba(255,255,255,.02))]" />
            <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[96rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c0c] sm:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1fr_0.72fr]">
                <section className="flex min-w-0 flex-col justify-between p-6 sm:p-9 lg:p-12">
                    <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-white/30"><span>{props.siteName}</span><span className={meta.accent}>{meta.code}</span></div>
                    <div className="py-14 lg:py-8">
                        <p className={cn('text-xs font-bold uppercase tracking-[0.3em]', meta.accent)}>{meta.eyebrow}</p>
                        <h1 className="mt-6 max-w-[9ch] break-words text-[clamp(3.7rem,8vw,8rem)] font-black leading-[0.88] tracking-[-0.06em]">{props.title}</h1>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.26em] text-white/25">Portfolio / {meta.word}</div>
                </section>
                <section className="flex min-w-0 items-center border-t border-white/10 bg-white/[0.018] p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
                    <div className="w-full min-w-0">
                        <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/35"><ShieldCheck className="h-4 w-4" /> Current status</div>
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

export function SiteModeExperience(props: Props) {
    const template: Template = ['hero', 'split', 'editorial', 'signal', 'portal'].includes(props.template) ? props.template as Template : 'hero';
    if (template === 'split') return <SplitTemplate {...props} />;
    if (template === 'editorial') return <EditorialTemplate {...props} />;
    if (template === 'signal') return <SignalTemplate {...props} />;
    if (template === 'portal') return <PortalTemplate {...props} />;
    return <HeroTemplate {...props} />;
}
