'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Spotlight } from '@/components/ui/spotlight-new';
import { ChevronUp, Github, Linkedin, Instagram, Copy, Check, X, Bot, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { defaultFooterSettings, type FooterLinkSetting, type FooterSettings } from '@/lib/footer-settings';

function Marquee({ phrases }: { phrases: string[] }) {
    const values = phrases.length ? phrases : defaultFooterSettings.marquee;
    return (
        <div className="relative flex overflow-hidden py-4 bg-zinc-50 dark:bg-black border-y border-zinc-200 dark:border-white/10 backdrop-blur-sm">
            <motion.div className="flex gap-12 whitespace-nowrap" animate={{ x: [0, -1000] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
                {[...values, ...values, ...values].map((phrase, index) => (
                    <div key={`${phrase}-${index}`} className="flex items-center gap-4 text-sm font-mono tracking-widest uppercase text-muted-foreground/80">
                        <span>{phrase}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    </div>
                ))}
            </motion.div>
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white dark:from-black to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white dark:from-black to-transparent z-10" />
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
    const [mounted, setMounted] = useState(false);
    const [copyrightIndex, setCopyrightIndex] = useState(0);
    const [localTime, setLocalTime] = useState('');

    useEffect(() => {
        setMounted(true);
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
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [settings.timezone]);

    useEffect(() => {
        document.body.style.overflow = isExpanded ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isExpanded]);

    const toggleExpand = useCallback(() => setIsExpanded((value) => !value), []);
    const closeExpanded = useCallback(() => setIsExpanded(false), []);
    const currentYear = new Date().getFullYear();
    const isBlog = pathname?.includes('/blog');
    const isGallery = pathname?.includes('/gallery');

    const handleCopyEmail = () => {
        if (!settings.email) return;
        navigator.clipboard.writeText(settings.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const iconLinks = [
        settings.githubUrl ? { label: 'GitHub', href: settings.githubUrl, Icon: Github } : null,
        settings.linkedinUrl ? { label: 'LinkedIn', href: settings.linkedinUrl, Icon: Linkedin } : null,
        settings.instagramUrl ? { label: 'Instagram', href: settings.instagramUrl, Icon: Instagram } : null,
        settings.workspaceUrl ? { label: 'Workspace', href: settings.workspaceUrl, Icon: Focus } : null,
    ].filter(Boolean) as Array<{ label: string; href: string; Icon: typeof Github }>;

    return (
        <>
            <footer className={cn(
                isBlog ? 'absolute bottom-0 w-full border-t-0 pointer-events-none !bg-transparent z-20' :
                    isGallery ? 'relative z-20 mt-auto !bg-transparent' : 'relative z-20 mt-auto dark:bg-black',
                isExpanded && 'opacity-0 pointer-events-none',
            )}>
                <div className={`max-w-[1600px] mx-auto relative z-10 px-6 md:px-12 lg:px-24 py-6 md:py-8 pointer-events-auto ${isBlog || isGallery ? '!bg-transparent' : ''}`}>
                    <div className={`px-6 md:px-8 py-4 md:py-6 transition-all duration-300 ${isBlog || isGallery ? 'bg-card dark:bg-black/40 dark:backdrop-blur-xl border-2 border-foreground/10 dark:border-white/5 rounded-[2rem] shadow-xl dark:shadow-black/20' : 'glass-card'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5 md:gap-2 pl-2 md:pl-4 z-10 overflow-hidden h-6">
                                <span className={`text-xs md:text-sm font-bold uppercase tracking-widest ${isBlog ? 'text-muted-foreground' : 'text-gradient'}`}>© {currentYear}</span>
                                <div className="relative w-[320px] max-w-[42vw] h-full flex items-center">
                                    <AnimatePresence mode="popLayout">
                                        {mounted && (
                                            <motion.span key={copyrightIndex} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeInOut' }} className={`absolute left-0 text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap ${isBlog ? 'text-muted-foreground' : 'text-gradient'}`}>
                                                {copyrightIndex === 0 ? settings.compactName : settings.compactSecondary}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-4 md:gap-8 z-10 ml-auto">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    {iconLinks.map(({ label, href, Icon }) => (
                                        <motion.a key={label} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel={href.startsWith('/') ? undefined : 'noopener noreferrer'} className="p-1.5 rounded-full hover:bg-foreground/5 transition-all text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95" aria-label={label}>
                                            <Icon className="w-4 h-4" />
                                        </motion.a>
                                    ))}
                                    <motion.button type="button" onClick={() => window.dispatchEvent(new CustomEvent('portfolio:toggle-chatbot', { detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 } }))} className="p-1.5 rounded-full hover:bg-foreground/5 transition-all text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95" aria-label="AI Assistant">
                                        <Bot className="w-4 h-4" />
                                    </motion.button>
                                </div>

                                <motion.button onClick={toggleExpand} className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full transition-all text-xs font-black uppercase tracking-[0.2em] ${isBlog ? 'bg-muted/50 border-2 border-foreground/10 text-foreground hover:bg-muted hover:border-foreground/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <span className="hidden sm:inline">{settings.moreLabel}</span>
                                    <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronUp className="w-4 h-4" /></motion.span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {mounted && createPortal(
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[10000] bg-white dark:bg-black flex flex-col pt-0 overflow-hidden">
                            <Spotlight
                                gradientFirst={theme === 'dark' ? 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)' : 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(0, 0%, 20%, .03) 0, hsla(0, 0%, 15%, .01) 50%, hsla(0, 0%, 10%, 0) 80%)'}
                                gradientSecond={theme === 'dark' ? 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)' : 'radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 20%, .02) 0, hsla(0, 0%, 15%, .01) 80%, transparent 100%)'}
                                gradientThird={theme === 'dark' ? 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)' : 'radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 20%, .01) 0, hsla(0, 0%, 15%, .01) 80%, transparent 100%)'}
                            />

                            <div className="flex-shrink-0 pt-[5vh]"><Marquee phrases={settings.marquee} /></div>

                            <div className="flex-1 flex flex-col px-[8vw] pt-[4vh] pb-0 justify-between relative">
                                <div className="flex-1 flex flex-col justify-center max-w-[1600px] w-full mx-auto relative">
                                    <div className="absolute top-0 right-[-2vw] z-[10001]">
                                        <motion.button onClick={closeExpanded} className="relative p-[clamp(12px,1.2vw,20px)] flex items-center justify-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                            <div className="absolute inset-0 rounded-full bg-black dark:bg-white shadow-2xl" />
                                            <motion.div className="relative z-10 flex items-center justify-center" whileHover={{ rotate: 90 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                                                <X className="w-[clamp(24px,2vw,32px)] h-[clamp(24px,2vw,32px)] text-white dark:text-black" strokeWidth={2.5} />
                                            </motion.div>
                                        </motion.button>
                                    </div>

                                    <div className="w-full grid grid-cols-4 gap-x-[5vw] gap-y-[4vh]">
                                        <FooterColumn title={settings.linksHeading}>
                                            {settings.quickLinks.map((link) => <FooterLink key={`${link.label}-${link.href}`} href={link.href}>{link.label}</FooterLink>)}
                                            {settings.aboutLinks.length > 0 && <AboutHoverMenu label={settings.aboutLabel} links={settings.aboutLinks} onExpandChange={setIsAboutExpanded} />}
                                        </FooterColumn>

                                        <FooterColumn title={settings.socialsHeading}>
                                            {settings.email && (
                                                <div className="relative flex items-center gap-2 group w-fit" onMouseEnter={() => setIsEmailHovered(true)} onMouseLeave={() => setIsEmailHovered(false)}>
                                                    <FooterLink href={`mailto:${settings.email}`}>Email</FooterLink>
                                                    <AnimatePresence>
                                                        {isEmailHovered && (
                                                            <motion.div initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} className="absolute left-full ml-[clamp(8px,1vw,16px)] whitespace-nowrap flex items-center gap-[clamp(4px,0.5vw,8px)] z-50">
                                                                <span className="text-[clamp(12px,1.1vw,18px)] font-medium text-zinc-400 dark:text-zinc-500 select-all">{settings.email}</span>
                                                                <button onClick={(event) => { event.preventDefault(); handleCopyEmail(); }} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" title="Copy Email">
                                                                    {copied ? <Check className="w-[clamp(14px,1vw,20px)] h-[clamp(14px,1vw,20px)] text-green-500" /> : <Copy className="w-[clamp(14px,1vw,20px)] h-[clamp(14px,1vw,20px)]" />}
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                            {settings.linkedinUrl && <FooterLink href={settings.linkedinUrl} target="_blank">LinkedIn</FooterLink>}
                                            {settings.instagramUrl && <FooterLink href={settings.instagramUrl} target="_blank">Instagram</FooterLink>}
                                            {settings.githubUrl && <FooterLink href={settings.githubUrl} target="_blank">GitHub</FooterLink>}
                                            {settings.workspaceUrl && <FooterLink href={settings.workspaceUrl} target={settings.workspaceUrl.startsWith('/') ? undefined : '_blank'}>Workspace</FooterLink>}
                                        </FooterColumn>

                                        <FooterColumn title={settings.localTimeHeading}>
                                            <p className="text-zinc-900 dark:text-white text-[1.2vw] min-text-[14px] font-medium tracking-tight">{localTime}</p>
                                            <a href={settings.locationUrl || '#'} target={settings.locationUrl?.startsWith('/') ? undefined : '_blank'} rel={settings.locationUrl?.startsWith('/') ? undefined : 'noopener noreferrer'} className="text-zinc-900 dark:text-white text-[1.2vw] min-text-[14px] font-medium tracking-tight hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors inline-block">{settings.locationText}</a>
                                        </FooterColumn>

                                        <FooterColumn title={settings.versionHeading}>
                                            <p className="text-zinc-900 dark:text-white text-[1.2vw] min-text-[14px] font-medium tracking-tight">{settings.editionText}</p>
                                        </FooterColumn>
                                    </div>
                                </div>

                                <div className="mt-auto overflow-hidden flex-shrink-0 relative">
                                    <motion.h2 initial={{ opacity: 0, y: '100%' }} animate={isAboutExpanded ? { opacity: 0, y: '120%' } : { opacity: 1, y: '38%' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="text-[18vw] font-black leading-none text-zinc-900 dark:text-white tracking-tighter select-none text-center whitespace-nowrap">
                                        {settings.brandText}
                                    </motion.h2>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-[1.5vw]">
            <h3 className="text-zinc-500 text-[clamp(10px,0.8vw,14px)] font-bold tracking-widest uppercase">{title}</h3>
            <div className="flex flex-col gap-[0.8vw]">{children}</div>
        </div>
    );
}

function FooterLink({ href, children, target }: { href: string; children: React.ReactNode; target?: string }) {
    return (
        <motion.div whileHover={{ x: 5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <Link href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className="text-zinc-900 dark:text-white text-[clamp(14px,1.2vw,22px)] font-medium hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors w-fit whitespace-nowrap block">{children}</Link>
        </motion.div>
    );
}

function AboutHoverMenu({ label, links, onExpandChange }: { label: string; links: FooterLinkSetting[]; onExpandChange: (expanded: boolean) => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const active = isMobile ? isOpen : isHovered;

    useEffect(() => { onExpandChange(active); }, [active, onExpandChange]);

    const containerVariants = {
        open: { height: 'auto', opacity: 1, transition: { height: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.4 }, staggerChildren: 0.05, delayChildren: 0.1 } },
        closed: { height: 0, opacity: 0, transition: { height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.2 }, staggerChildren: 0.03, staggerDirection: -1 } },
    };
    const itemVariants = {
        open: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
        closed: { y: 10, opacity: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    };

    return (
        <div className="flex flex-col gap-2" onMouseEnter={() => !isMobile && setIsHovered(true)} onMouseLeave={() => !isMobile && setIsHovered(false)}>
            <button type="button" className="flex items-center gap-2 cursor-pointer group w-fit text-left" onClick={() => isMobile && setIsOpen(!isOpen)}>
                <span className="text-zinc-900 dark:text-white text-[clamp(14px,1.2vw,22px)] font-medium group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">{label}</span>
                <motion.div animate={{ rotate: active ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronUp className="w-4 h-4 text-zinc-500 transform rotate-180" /></motion.div>
            </button>
            <AnimatePresence>
                {active && (
                    <motion.div variants={containerVariants} initial="closed" animate="open" exit="closed" className="overflow-hidden flex flex-col gap-2 pl-4 border-l border-zinc-200 dark:border-white/10 ml-2">
                        {links.map((link) => (
                            <motion.div key={`${link.label}-${link.href}`} variants={itemVariants}>
                                <Link href={link.href} className="text-zinc-500 dark:text-zinc-400 text-[clamp(12px,1vw,18px)] font-medium hover:text-zinc-900 dark:hover:text-white transition-colors">{link.label}</Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
