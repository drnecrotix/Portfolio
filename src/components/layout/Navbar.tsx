'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import CardNav from '@/components/ui/CardNav';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { usePreloadState } from '@/components/ui/arc-preloader-hero';

type NavigationItem = {
    id: string;
    label: string;
    href: string;
    location: string;
    sortOrder: number;
    isVisible: boolean;
    isExternal: boolean;
};

const fallbackItems: NavigationItem[] = [
    { id: 'home', label: 'Home', href: '/', location: 'primary', sortOrder: 0, isVisible: true, isExternal: false },
    { id: 'achievements', label: 'Achievements', href: '/achievements', location: 'about', sortOrder: 10, isVisible: true, isExternal: false },
    { id: 'skills', label: 'Skills', href: '/skills', location: 'about', sortOrder: 20, isVisible: true, isExternal: false },
    { id: 'experience', label: 'Experience', href: '/experience', location: 'about', sortOrder: 30, isVisible: true, isExternal: false },
    { id: 'projects', label: 'Projects', href: '/projects', location: 'about', sortOrder: 40, isVisible: true, isExternal: false },
    { id: 'blog', label: 'Blog', href: '/blog', location: 'about', sortOrder: 50, isVisible: true, isExternal: false },
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 100, isVisible: true, isExternal: false },
];

function Clock() {
    const [time, setTime] = useState('00:00:00');
    useEffect(() => {
        const update = () => setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);
    return <span className="font-mono text-xl font-black tracking-widest text-gradient transition-all duration-300 hover:tracking-[0.2em] md:text-2xl">{time}</span>;
}

export function Navbar() {
    const pathname = usePathname();
    const { resolvedTheme } = useTheme();
    const { scrollY } = useScroll();
    const { isPreloading } = usePreloadState();
    const [items, setItems] = useState<NavigationItem[]>(fallbackItems);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [locale, setLocale] = useState('en');

    useEffect(() => {
        fetch('/api/navigation', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : fallbackItems)
            .then((data) => Array.isArray(data) && data.length ? setItems(data) : setItems(fallbackItems))
            .catch(() => setItems(fallbackItems));
        setLocale(document.cookie.split('; ').find((row) => row.startsWith('locale='))?.split('=')[1] || 'en');
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    useEffect(() => setIsMenuOpen(false), [pathname]);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        if (isMenuOpen) return;
        setIsScrolled(latest > 50);
        setIsVisible(!(latest > lastScrollY && latest > 100));
        setLastScrollY(latest);
    });

    const visibleItems = useMemo(() => items.filter((item) => item.isVisible), [items]);
    const primary = visibleItems.filter((item) => item.location === 'primary').sort((a, b) => a.sortOrder - b.sortOrder);
    const about = visibleItems.filter((item) => item.location === 'about').sort((a, b) => a.sortOrder - b.sortOrder);
    const home = primary.find((item) => item.href === '/') ?? fallbackItems[0];
    const directPrimary = primary.filter((item) => item.href !== '/');
    const cardItems = about.length ? [{ label: 'About', links: about.map((item) => ({ label: item.label, href: item.href, description: item.label })) }] : [];

    const toggleLocale = useCallback(() => {
        const next = locale === 'en' ? 'id' : 'en';
        document.cookie = `locale=${next};path=/;max-age=31536000`;
        setLocale(next);
        window.location.reload();
    }, [locale]);

    const renderLink = (item: NavigationItem, mobile = false) => {
        const external = item.isExternal || /^https?:\/\//.test(item.href);
        return (
            <Link
                key={item.id}
                href={item.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className={mobile
                    ? cn('text-3xl font-black transition-colors', pathname === item.href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
                    : cn('relative rounded-full px-5 py-2 text-sm font-bold transition-all duration-300', pathname === item.href ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
                {item.label}
            </Link>
        );
    };

    return (
        <>
            <motion.nav
                initial="hidden"
                animate={!isPreloading && (isVisible || isMenuOpen) ? 'visible' : 'hidden'}
                variants={{ visible: { y: 0, opacity: 1 }, hidden: { y: -100, opacity: 0 } }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="fixed inset-x-0 top-0 z-[100]"
            >
                <div className="mx-auto max-w-[1600px] px-6 py-4 md:px-12 md:py-6 lg:px-24">
                    <motion.div layout className={cn('flex items-center justify-between rounded-full transition-all duration-500', isScrolled ? 'glass-strong px-6 py-3' : 'py-2')}>
                        <Link href={home.href} className="relative min-w-[120px] group"><Clock /></Link>

                        <div className="hidden items-center gap-6 lg:flex">
                            {renderLink(home)}
                            {cardItems.length > 0 && <CardNav items={cardItems} theme={resolvedTheme === 'dark' ? 'dark' : 'light'} pathname={pathname} />}
                            {directPrimary.map((item) => renderLink(item))}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleLocale} className="rounded-full bg-muted/80 p-2 transition-colors hover:bg-muted md:p-2.5" aria-label="Toggle language">
                                <Globe className="h-4 w-4" />
                            </motion.button>
                            <AnimatedThemeToggler />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsMenuOpen((value) => !value)} className="rounded-full bg-muted/80 p-2 transition-colors hover:bg-muted md:p-2.5 lg:hidden" aria-label="Toggle menu">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div key={isMenuOpen ? 'close' : 'menu'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </motion.nav>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-background lg:hidden">
                        <div className="flex h-full flex-col items-center justify-center overflow-y-auto py-24">
                            <nav className="flex flex-col items-center gap-6">
                                {renderLink(home, true)}
                                {directPrimary.map((item) => renderLink(item, true))}
                                {about.length > 0 && (
                                    <div className="flex w-full flex-col items-center gap-4 border-t border-foreground/10 pt-6 text-center">
                                        <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">About</span>
                                        {about.map((item) => renderLink(item, true))}
                                    </div>
                                )}
                            </nav>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
