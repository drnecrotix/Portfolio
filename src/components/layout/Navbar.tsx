'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LibraryBig, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import CardNav, { type DropdownStyle } from '@/components/ui/CardNav';
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
    isDropdown: boolean;
    dropdownStyle: DropdownStyle;
    parentId: string | null;
};

const fallbackItems: NavigationItem[] = [
    { id: 'home', label: 'Home', href: '/', location: 'primary', sortOrder: 10, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
    { id: 'about', label: 'About', href: '#', location: 'primary', sortOrder: 20, isVisible: true, isExternal: false, isDropdown: true, dropdownStyle: 'auto', parentId: null },
    { id: 'achievements', label: 'Achievements', href: '/achievements', location: 'primary', sortOrder: 10, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'lab', label: 'Lab', href: '/lab', location: 'primary', sortOrder: 20, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'experience', label: 'Journey', href: '/journey', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'projects', label: 'Projects', href: '/projects', location: 'primary', sortOrder: 40, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'blog', label: 'Blog', href: '/blog', location: 'primary', sortOrder: 50, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: 'about' },
    { id: 'contact', label: 'Contact', href: '/contact', location: 'primary', sortOrder: 30, isVisible: true, isExternal: false, isDropdown: false, dropdownStyle: 'auto', parentId: null },
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

    useEffect(() => {
        fetch('/api/navigation', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : fallbackItems)
            .then((data) => Array.isArray(data) && data.length ? setItems(data) : setItems(fallbackItems))
            .catch(() => setItems(fallbackItems));
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        if (isMenuOpen) return;
        setIsScrolled(latest > 50);
        setIsVisible(!(latest > lastScrollY && latest > 100));
        setLastScrollY(latest);
    });

    const visibleItems = useMemo(() => items.filter((item) => item.isVisible), [items]);
    const topLevel = useMemo(() => visibleItems.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder), [visibleItems]);
    const childrenByParent = useMemo(() => {
        const map = new Map<string, NavigationItem[]>();
        for (const item of visibleItems) {
            if (!item.parentId) continue;
            const list = map.get(item.parentId) || [];
            list.push(item);
            map.set(item.parentId, list);
        }
        for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
        return map;
    }, [visibleItems]);

    const home = topLevel.find((item) => item.href === '/' && !item.isDropdown) ?? fallbackItems[0];
    const desktopTopLevel = topLevel.filter((item) => item.id !== home.id);

    const renderLink = (item: NavigationItem, mobile = false) => {
        const external = item.isExternal || /^https?:\/\//.test(item.href);
        return (
            <Link
                key={item.id}
                href={item.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={mobile ? () => setIsMenuOpen(false) : undefined}
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
                            {desktopTopLevel.map((item) => {
                                const children = childrenByParent.get(item.id) || [];
                                if (item.isDropdown) {
                                    if (!children.length) return null;
                                    return (
                                        <CardNav
                                            key={item.id}
                                            items={[{
                                                label: item.label,
                                                style: item.dropdownStyle || 'auto',
                                                links: children.map((child) => ({ id: child.id, label: child.label, href: child.href, description: child.href, isExternal: child.isExternal })),
                                            }]}
                                            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                            pathname={pathname}
                                        />
                                    );
                                }
                                return renderLink(item);
                            })}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href="/wiki/articles"
                                    className={cn(
                                        'flex rounded-full bg-muted/80 p-2 transition-colors hover:bg-muted md:p-2.5',
                                        pathname === '/wiki/articles' || pathname.startsWith('/wiki/') ? 'text-sky-500 dark:text-sky-300' : 'text-foreground',
                                    )}
                                    aria-label="Open Wiki index"
                                    title="Wiki index"
                                >
                                    <LibraryBig className="h-4 w-4" />
                                </Link>
                            </motion.div>
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
                            <nav className="flex w-full max-w-md flex-col items-center gap-6 px-6">
                                {renderLink(home, true)}
                                {desktopTopLevel.map((item) => {
                                    const children = childrenByParent.get(item.id) || [];
                                    if (item.isDropdown) {
                                        if (!children.length) return null;
                                        return (
                                            <div key={item.id} className="flex w-full flex-col items-center gap-4 border-t border-foreground/10 pt-6 text-center">
                                                <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">{item.label}</span>
                                                {children.map((child) => renderLink(child, true))}
                                            </div>
                                        );
                                    }
                                    return renderLink(item, true);
                                })}
                            </nav>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
