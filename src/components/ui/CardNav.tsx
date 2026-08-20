'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardNavLink {
    id?: string;
    label: string;
    href: string;
    description?: string;
    isExternal?: boolean;
}

export interface CardNavItem {
    label: string;
    links: CardNavLink[];
}

interface CardNavProps {
    items: CardNavItem[];
    theme?: 'light' | 'dark';
    pathname?: string;
}

function isLinkActive(pathname: string, href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function MenuLink({
    link,
    pathname,
    theme,
    variant,
    onNavigate,
}: {
    link: CardNavLink;
    pathname: string;
    theme: 'light' | 'dark';
    variant: 'featured' | 'compact' | 'side';
    onNavigate: () => void;
}) {
    const external = link.isExternal || /^https?:\/\//.test(link.href);
    const active = isLinkActive(pathname, link.href);

    const base = 'group relative overflow-hidden border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF4D]/60';
    const surface = theme === 'dark'
        ? active
            ? 'border-[#D1FF4D]/35 bg-[#D1FF4D]/[0.055] shadow-[0_0_28px_rgba(209,255,77,0.035)]'
            : 'border-white/[0.09] bg-white/[0.025] hover:border-white/[0.18] hover:bg-white/[0.055]'
        : active
            ? 'border-[#8cb815]/35 bg-[#8cb815]/[0.06]'
            : 'border-black/[0.09] bg-black/[0.018] hover:border-black/[0.17] hover:bg-black/[0.035]';

    return (
        <Link
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
            className={cn(
                base,
                surface,
                variant === 'featured' && 'flex min-h-[138px] flex-col justify-between rounded-[22px] p-5 hover:-translate-y-1',
                variant === 'compact' && 'flex min-h-[104px] flex-col justify-between rounded-[20px] p-4 hover:-translate-y-0.5',
                variant === 'side' && 'flex min-h-[86px] items-center justify-between gap-4 rounded-[18px] p-4 hover:translate-x-1',
            )}
        >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className={cn(
                    'absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl',
                    theme === 'dark' ? 'bg-white/[0.08]' : 'bg-black/[0.05]',
                )} />
            </div>

            <div className="relative z-10 min-w-0">
                <div className="flex items-center gap-2">
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1FF4D] shadow-[0_0_8px_rgba(209,255,77,0.75)]" />}
                    <p className={cn(
                        'truncate font-semibold tracking-[-0.02em]',
                        variant === 'featured' ? 'text-[15px]' : 'text-sm',
                        theme === 'dark' ? active ? 'text-[#D1FF4D]' : 'text-white' : active ? 'text-[#739a0d]' : 'text-black',
                    )}>{link.label}</p>
                </div>
                <p className={cn(
                    'mt-1.5 line-clamp-2 leading-relaxed',
                    variant === 'featured' ? 'text-xs' : 'text-[11px]',
                    theme === 'dark' ? 'text-white/42' : 'text-black/45',
                )}>{link.description || link.href}</p>
            </div>

            <div className={cn(
                'relative z-10 mt-4 flex items-center justify-between',
                variant === 'side' && 'mt-0 shrink-0',
            )}>
                {variant !== 'side' && (
                    <span className={cn(
                        'font-mono text-[9px] uppercase tracking-[0.22em]',
                        theme === 'dark' ? 'text-white/24' : 'text-black/28',
                    )}>{external ? 'External' : 'Open'}</span>
                )}
                {external
                    ? <ExternalLink className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5', theme === 'dark' ? 'text-white/30' : 'text-black/30')} />
                    : <ArrowUpRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5', theme === 'dark' ? 'text-white/30' : 'text-black/30')} />}
            </div>
        </Link>
    );
}

export default function CardNav({ items, theme = 'dark', pathname = '/' }: CardNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menu = items[0];
    const links = menu?.links ?? [];

    const isActive = useMemo(
        () => links.some((link) => isLinkActive(pathname, link.href)),
        [links, pathname],
    );

    const featured = links.slice(0, 2);
    const compact = links.slice(2, 5);
    const side = links.slice(5);
    const hasSide = side.length > 0;

    useEffect(() => {
        const onOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsExpanded(false);
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsExpanded(false);
        };
        document.addEventListener('mousedown', onOutside);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onOutside);
            document.removeEventListener('keydown', onEscape);
        };
    }, []);

    if (!menu || links.length === 0) return null;

    return (
        <div ref={containerRef} className="relative">
            <motion.button
                type="button"
                onMouseEnter={() => setIsExpanded(true)}
                onClick={() => setIsExpanded((value) => !value)}
                className={cn(
                    'relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all duration-300',
                    isActive
                        ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                        : theme === 'dark' ? 'text-white/70 hover:bg-white/[0.04] hover:text-white' : 'text-black/70 hover:bg-black/[0.03] hover:text-black',
                )}
                aria-expanded={isExpanded}
                aria-haspopup="menu"
            >
                <span>{menu.label}</span>
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
                    <ChevronDown className="h-3.5 w-3.5 opacity-45" />
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        onMouseLeave={() => setIsExpanded(false)}
                        initial={{ opacity: 0, y: 8, scale: 0.985, x: '-50%' }}
                        animate={{ opacity: 1, y: 18, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 10, scale: 0.985, x: '-50%' }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-1/2 top-full z-[120] w-[min(900px,calc(100vw-48px))]"
                        role="menu"
                    >
                        <div className={cn(
                            'relative overflow-hidden rounded-[30px] border shadow-2xl backdrop-blur-2xl',
                            theme === 'dark'
                                ? 'border-white/[0.09] bg-[#090909]/[0.965] shadow-black/80'
                                : 'border-black/[0.09] bg-white/[0.97] shadow-black/10',
                        )}>
                            <div className={cn(
                                'absolute inset-x-8 top-0 h-px',
                                theme === 'dark' ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/15 to-transparent',
                            )} />

                            <div className={cn('grid', hasSide ? 'lg:grid-cols-[1fr_260px]' : 'grid-cols-1')}>
                                <div className="p-5 sm:p-6">
                                    {featured.length > 0 && (
                                        <div className={cn('grid gap-4', featured.length > 1 && 'sm:grid-cols-2')}>
                                            {featured.map((link) => (
                                                <MenuLink key={link.id || `${link.label}-${link.href}`} link={link} pathname={pathname} theme={theme} variant="featured" onNavigate={() => setIsExpanded(false)} />
                                            ))}
                                        </div>
                                    )}

                                    {compact.length > 0 && (
                                        <div className={cn('mt-4 grid gap-4', compact.length === 1 ? 'grid-cols-1' : compact.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
                                            {compact.map((link) => (
                                                <MenuLink key={link.id || `${link.label}-${link.href}`} link={link} pathname={pathname} theme={theme} variant="compact" onNavigate={() => setIsExpanded(false)} />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {hasSide && (
                                    <div className={cn(
                                        'flex flex-col gap-3 border-t p-5 sm:p-6 lg:border-l lg:border-t-0',
                                        theme === 'dark' ? 'border-white/[0.07] bg-white/[0.012]' : 'border-black/[0.07] bg-black/[0.012]',
                                    )}>
                                        <div className="mb-1">
                                            <p className={cn('font-mono text-[9px] uppercase tracking-[0.28em]', theme === 'dark' ? 'text-white/28' : 'text-black/32')}>More</p>
                                        </div>
                                        {side.map((link) => (
                                            <MenuLink key={link.id || `${link.label}-${link.href}`} link={link} pathname={pathname} theme={theme} variant="side" onNavigate={() => setIsExpanded(false)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
