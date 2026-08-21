'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bot, Check, ChevronUp, Copy, Focus, Github, Instagram, Linkedin, X } from 'lucide-react';
import { Spotlight } from '@/components/ui/spotlight-new';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { defaultFooterSettings, type FooterLinkSetting, type FooterSettings } from '@/lib/footer-settings';

function Marquee({ phrases }: { phrases: string[] }) {
    const values = phrases.length ? phrases : defaultFooterSettings.marquee;
    return (
        <div className="relative flex overflow-hidden border-y border-zinc-200 bg-zinc-50 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-black sm:py-4">
            <motion.div className="flex gap-8 whitespace-nowrap sm:gap-12" animate={{ x: [0, -1000] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
                {[...values, ...values, ...values].map((phrase, index) => (
                    <div key={`${phrase}-${index}`} className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 sm:gap-4 sm:text-sm">
                        <span>{phrase}</span>
                        <span className="size-1.5 rounded-full bg-primary/50" />
                    </div>
                ))}
            </motion.div>
            <div className="absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent dark:from-black sm:w-20" />
            <div className="absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-black sm:w-20" />
        </div>
    );
}

function offsetLabel(timezone: string, date: Date) {
    try {
        const part = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
            .formatToParts(date)
            .find((item) => item.type === 'timeZoneName')?.value;
        return part?.replace('GMT', 'UTC') ?? '';
    } catch {
        return '';
    }
}

export function Footer() {
    const { theme } = useTheme();
    const pathname = usePathname();
    const [settings, setSettings] = useState<FooterSettings>(defaultFooterSettings);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [isEmailHovered, setIsEmailHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyrightIndex, setCopyrightIndex] = useState(0);
    const [localTime, setLocalTime] = useState('');

    useEffect(() => {
        fetch('/api/footer-settings', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : defaultFooterSettings)
            .then((data) => setSettings({ ...defaultFooterSettings, ...data }))
            .catch(() => setSettings(defaultFooterSettings));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setCopyrightIndex((value) => (value + 1) % 2), 2500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            try {
                const time = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: settings.timezone,
                }).format(now);
                const offset = offsetLabel(settings.timezone, now);
                setLocalTime(`${time}${offset ? ` ${offset}` : ''}`);
            } catch {
                setLocalTime('');
            }
        };
        const firstUpdate = window.setTimeout(update, 0);
        const interval = window.setInterval(update, 60000);
        return () => {
            window.clearTimeout(firstUpdate);
            window.clearInterval(interval);
        };
    }, [settings.timezone]);

    useEffect(() => {
        document.body.style.overflow = isExpanded ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isExpanded]);

    useEffect(() => {
        if (!isExpanded) return;
        const timer = window.setTimeout(() => {
            setIsExpanded(false);
            setIsAboutExpanded(false);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    const toggleExpand = useCallback(() => setIsExpanded((value) => !value), []);
    const closeExpanded = useCallback(() => {
        setIsExpanded(false);
        setIsAboutExpanded(false);
    }, []);

    const currentYear = new Date().getFullYear();
    const isBlog = pathname?.includes('/blog');
    const isGallery = pathname?.includes('/gallery');

    const handleCopyEmail = () => {
        if (!settings.email) return;
        navigator.clipboard.writeText(settings.email);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const iconLinks = [
        settings.githubUrl ? { label: 'GitHub', href: settings.githubUrl, Icon: Github } : null,
        settings.linkedinUrl ? { label: 'LinkedIn', href: settings.linkedinUrl, Icon: Linkedin } : null,
        settings.instagramUrl ? { label: 'Instagram', href: settings.instagramUrl, Icon: Instagram } : null,
        settings.workspaceUrl ? { label: 'Workspace', href: settings.workspaceUrl, Icon: Focus } : null,
    ].filter(Boolean) as Array<{ label: string; href: string; Icon: typeof Github }>;

    const expandedMenu = typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[10000] flex min-h-0 flex-col overflow-y-auto bg-white dark:bg-black"
                >
                    <Spotlight
                        gradientFirst={theme === 'dark' ? 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)' : 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(0, 0%, 20%, .03) 0, hsla(0, 0%, 15%, .01) 50%, hsla(0, 0%, 10%, 0) 80%)'}
                        gradientSecond={theme === 'dark' ? 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)' : 'radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 20%, .02) 0, hsla(0, 0%, 15%, .01) 80%, transparent 100%)'}
                        gradientThird={theme === 'dark' ? 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)' : 'radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 20%, .01) 0, hsla(0, 0%, 15%, .01) 80%, transparent 100%)'}
                    />
                    <div className="shrink-0 pt-3 sm:pt-[5vh]"><Marquee phrases={settings.marquee} /></div>
                    <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-8 lg:px-[8vw] lg:pb-0 lg:pt-[4vh]">
                        <div className="mb-6 flex justify-end lg:absolute lg:right-[6vw] lg:top-[3vh] lg:mb-0">
                            <motion.button onClick={closeExpanded} className="relative flex size-12 items-center justify-center rounded-full bg-black text-white shadow-2xl dark:bg-white dark:text-black sm:size-14" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} aria-label="Close footer menu">
                                <X className="size-5 sm:size-6" strokeWidth={2.5} />
                            </motion.button>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-9 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-[5vw] lg:gap-y-[4vh]">
                            <FooterColumn title={settings.linksHeading}>
                                {settings.quickLinks.map((link) => <FooterLink key={`${link.label}-${link.href}`} href={link.href} onNavigate={closeExpanded}>{link.label}</FooterLink>)}
                                {settings.aboutLinks.length > 0 && <AboutHoverMenu label={settings.aboutLabel} links={settings.aboutLinks} onExpandChange={setIsAboutExpanded} onNavigate={closeExpanded} />}
                            </FooterColumn>

                            <FooterColumn title={settings.socialsHeading}>
                                {settings.email && (
                                    <div className="relative flex w-fit items-center gap-2" onMouseEnter={() => setIsEmailHovered(true)} onMouseLeave={() => setIsEmailHovered(false)}>
                                        <FooterLink href={`mailto:${settings.email}`} onNavigate={closeExpanded}>Email</FooterLink>
                                        <AnimatePresence>
                                            {isEmailHovered && (
                                                <motion.div initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} className="absolute left-full z-50 ml-2 hidden items-center gap-2 whitespace-nowrap md:flex">
                                                    <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">{settings.email}</span>
                                                    <button onClick={(event) => { event.preventDefault(); handleCopyEmail(); }} className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white" title="Copy email">
                                                        {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                                {settings.linkedinUrl && <FooterLink href={settings.linkedinUrl} target="_blank" onNavigate={closeExpanded}>LinkedIn</FooterLink>}
                                {settings.instagramUrl && <FooterLink href={settings.instagramUrl} target="_blank" onNavigate={closeExpanded}>Instagram</FooterLink>}
                                {settings.githubUrl && <FooterLink href={settings.githubUrl} target="_blank" onNavigate={closeExpanded}>GitHub</FooterLink>}
                                {settings.workspaceUrl && <FooterLink href={settings.workspaceUrl} target={settings.workspaceUrl.startsWith('/') ? undefined : '_blank'} onNavigate={closeExpanded}>Workspace</FooterLink>}
                            </FooterColumn>

                            <FooterColumn title={settings.localTimeHeading}>
                                <p className="text-sm font-medium tracking-tight text-zinc-900 dark:text-white sm:text-base lg:text-[1.2vw]">{localTime}</p>
                                <a href={settings.locationUrl || '#'} onClick={closeExpanded} target={settings.locationUrl?.startsWith('/') ? undefined : '_blank'} rel={settings.locationUrl?.startsWith('/') ? undefined : 'noopener noreferrer'} className="inline-block text-sm font-medium tracking-tight text-zinc-900 transition-colors hover:text-zinc-500 dark:text-white dark:hover:text-zinc-400 sm:text-base lg:text-[1.2vw]">{settings.locationText}</a>
                            </FooterColumn>

                            <FooterColumn title={settings.versionHeading}>
                                <p className="text-sm font-medium tracking-tight text-zinc-900 dark:text-white sm:text-base lg:text-[1.2vw]">{settings.editionText}</p>
                            </FooterColumn>
                        </div>

                        <div className="mt-auto hidden overflow-hidden pt-8 lg:block">
                            <motion.h2 initial={{ opacity: 0, y: '100%' }} animate={isAboutExpanded ? { opacity: 0, y: '120%' } : { opacity: 1, y: '38%' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="select-none whitespace-nowrap text-center text-[18vw] font-black leading-none tracking-tighter text-zinc-900 dark:text-white">{settings.brandText}</motion.h2>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    ) : null;

    return (
        <>
            <footer className={cn(
                isBlog ? 'absolute bottom-0 z-20 w-full border-t-0 !bg-transparent pointer-events-none' :
                    isGallery ? 'relative z-20 mt-auto !bg-transparent' : 'relative z-20 mt-auto dark:bg-black',
                isExpanded && 'pointer-events-none opacity-0',
            )}>
                <div className={`relative z-10 mx-auto max-w-[1600px] px-3 py-3 pointer-events-auto sm:px-6 sm:py-5 md:px-12 md:py-8 lg:px-24 ${isBlog || isGallery ? '!bg-transparent' : ''}`}>
                    <div className={`px-3 py-3 transition-all duration-300 sm:px-5 sm:py-4 md:px-8 md:py-6 ${isBlog || isGallery ? 'rounded-[1.5rem] border border-foreground/10 bg-card shadow-xl dark:border-white/5 dark:bg-black/40 dark:backdrop-blur-xl md:rounded-[2rem]' : 'glass-card'}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden pl-1 sm:h-6 sm:gap-2 sm:pl-2 md:pl-4">
                                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest sm:text-xs md:text-sm ${isBlog ? 'text-muted-foreground' : 'text-gradient'}`}>© {currentYear}</span>
                                <div className="relative h-5 min-w-0 flex-1 overflow-hidden sm:h-full sm:w-[260px] sm:flex-none md:w-[320px]">
                                    <AnimatePresence mode="popLayout">
                                        <motion.span key={copyrightIndex} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.45, ease: 'easeInOut' }} className={`absolute left-0 max-w-full truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-widest sm:text-xs md:text-sm ${isBlog ? 'text-muted-foreground' : 'text-gradient'}`}>
                                            {copyrightIndex === 0 ? settings.compactName : settings.compactSecondary}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-center justify-between gap-2 sm:ml-auto sm:justify-end sm:gap-4 md:gap-8">
                                <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5 md:gap-2">
                                    {iconLinks.map(({ label, href, Icon }) => (
                                        <motion.a key={label} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel={href.startsWith('/') ? undefined : 'noopener noreferrer'} className="rounded-full p-2 text-muted-foreground transition-all hover:bg-foreground/5 hover:text-foreground active:scale-95 sm:p-1.5" aria-label={label}>
                                            <Icon className="size-4" />
                                        </motion.a>
                                    ))}
                                    <motion.button type="button" onClick={() => window.dispatchEvent(new CustomEvent('portfolio:toggle-chatbot', { detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 } }))} className="rounded-full p-2 text-muted-foreground transition-all hover:bg-foreground/5 hover:text-foreground active:scale-95 sm:p-1.5" aria-label="AI Assistant"><Bot className="size-4" /></motion.button>
                                </div>

                                <motion.button onClick={toggleExpand} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all md:px-5 md:py-2.5 md:text-xs ${isBlog ? 'border border-foreground/10 bg-muted/50 text-foreground hover:bg-muted' : 'bg-muted text-foreground hover:bg-muted/80'}`} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} aria-label="Open footer menu">
                                    <span className="hidden md:inline">{settings.moreLabel}</span>
                                    <ChevronUp className="size-4" />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
            {expandedMenu}
        </>
    );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0 space-y-3 sm:space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:text-xs lg:text-[clamp(10px,0.8vw,14px)]">{title}</h3>
            <div className="flex min-w-0 flex-col gap-2 sm:gap-3 lg:gap-[0.8vw]">{children}</div>
        </div>
    );
}

function FooterLink({ href, children, target, onNavigate }: { href: string; children: React.ReactNode; target?: string; onNavigate?: () => void }) {
    return (
        <motion.div whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="min-w-0">
            <Link href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} onClick={onNavigate} className="block w-fit max-w-full break-words text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-500 dark:text-white dark:hover:text-zinc-400 sm:text-base lg:text-[clamp(14px,1.2vw,22px)]">{children}</Link>
        </motion.div>
    );
}

function AboutHoverMenu({ label, links, onExpandChange, onNavigate }: { label: string; links: FooterLinkSetting[]; onExpandChange: (expanded: boolean) => void; onNavigate: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const active = isMobile ? isOpen : isHovered;

    useEffect(() => {
        const timer = window.setTimeout(() => onExpandChange(active), 0);
        return () => window.clearTimeout(timer);
    }, [active, onExpandChange]);

    return (
        <div className="flex min-w-0 flex-col gap-2" onMouseEnter={() => !isMobile && setIsHovered(true)} onMouseLeave={() => !isMobile && setIsHovered(false)}>
            <button type="button" className="flex w-fit items-center gap-2 text-left" onClick={() => isMobile && setIsOpen((value) => !value)}>
                <span className="text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-500 dark:text-white dark:hover:text-zinc-400 sm:text-base lg:text-[clamp(14px,1.2vw,22px)]">{label}</span>
                <motion.span animate={{ rotate: active ? 180 : 0 }} transition={{ duration: 0.25 }}><ChevronUp className="size-4 rotate-180 text-zinc-500" /></motion.span>
            </button>
            <AnimatePresence>
                {active && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="ml-1 flex flex-col gap-2 overflow-hidden border-l border-zinc-200 pl-3 dark:border-white/10">
                        {links.map((link) => (
                            <Link key={`${link.label}-${link.href}`} href={link.href} onClick={() => { setIsOpen(false); onNavigate(); }} className="break-words text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">{link.label}</Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
