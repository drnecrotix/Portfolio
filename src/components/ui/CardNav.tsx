'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DropdownStyle = 'auto' | 'compact' | 'standard' | 'mega';

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
    style?: DropdownStyle;
}

interface CardNavProps {
    items: CardNavItem[];
    theme?: 'light' | 'dark';
    pathname?: string;
}

function isLinkActive(pathname: string, href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

function resolveStyle(style: DropdownStyle | undefined, count: number): Exclude<DropdownStyle, 'auto'> {
    if (style && style !== 'auto') return style;
    if (count <= 2) return 'compact';
    if (count <= 4) return 'standard';
    return 'mega';
}

function MenuLink({ link, pathname, theme, onNavigate, density }: {
    link: CardNavLink;
    pathname: string;
    theme: 'light' | 'dark';
    onNavigate: () => void;
    density: Exclude<DropdownStyle, 'auto'>;
}) {
    const external = link.isExternal || /^https?:\/\//.test(link.href);
    const active = isLinkActive(pathname, link.href);
    const compact = density === 'compact';

    return (
        <Link
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
            role="menuitem"
            className={cn(
                'group relative flex items-center justify-between gap-4 overflow-hidden border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF4D]/50',
                compact ? 'min-h-[68px] rounded-[17px] px-4 py-3' : density === 'standard' ? 'min-h-[76px] rounded-[19px] px-4 py-3.5' : 'min-h-[84px] rounded-[20px] px-5 py-4',
                theme === 'dark'
                    ? active
                        ? 'border-[#D1FF4D]/30 bg-[#D1FF4D]/[0.055] text-white shadow-[0_0_0_1px_rgba(209,255,77,0.03)]'
                        : 'border-white/[0.075] bg-white/[0.022] text-white hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.055] hover:shadow-[0_16px_40px_-28px_rgba(255,255,255,0.35)]'
                    : active
                        ? 'border-[#88a91d]/30 bg-[#88a91d]/[0.06] text-black'
                        : 'border-black/[0.08] bg-black/[0.018] text-black hover:-translate-y-0.5 hover:border-black/[0.16] hover:bg-black/[0.04] hover:shadow-[0_16px_40px_-30px_rgba(0,0,0,0.32)]',
            )}
        >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className={cn('absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl', theme === 'dark' ? 'bg-white/[0.07]' : 'bg-black/[0.045]')} />
            </div>

            <div className="relative z-10 min-w-0">
                <div className="flex items-center gap-2">
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1FF4D] shadow-[0_0_8px_rgba(209,255,77,0.7)]" />}
                    <span className={cn('truncate font-semibold tracking-[-0.02em]', compact ? 'text-[13px]' : 'text-sm', active && (theme === 'dark' ? 'text-[#D1FF4D]' : 'text-[#739a0d]'))}>{link.label}</span>
                </div>
                <span className={cn('mt-1 block truncate font-mono', compact ? 'text-[9px]' : 'text-[10px]', theme === 'dark' ? 'text-white/32' : 'text-black/38')}>{link.description || link.href}</span>
            </div>

            <div className={cn(
                'relative z-10 flex shrink-0 items-center justify-center rounded-full border transition-all duration-300 group-hover:translate-x-0.5 group-hover:scale-105',
                compact ? 'h-7 w-7' : 'h-8 w-8',
                theme === 'dark' ? 'border-white/10 bg-white/[0.03] text-white/38 group-hover:border-white/20 group-hover:text-white/70' : 'border-black/10 bg-black/[0.025] text-black/38 group-hover:border-black/20 group-hover:text-black/70',
            )}>
                {external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            </div>
        </Link>
    );
}

export default function CardNav({ items, theme = 'dark', pathname = '/' }: CardNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const menu = items[0];
    const links = menu?.links ?? [];
    const density = resolveStyle(menu?.style, links.length);
    const isActive = useMemo(() => links.some((link) => isLinkActive(pathname, link.href)), [links, pathname]);

    const cancelClose = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    };
    const scheduleClose = () => {
        cancelClose();
        closeTimerRef.current = setTimeout(() => setIsExpanded(false), 180);
    };

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
            cancelClose();
        };
    }, []);

    if (!menu || links.length === 0) return null;

    const widthClass = density === 'compact'
        ? 'w-[min(460px,calc(100vw-32px))]'
        : density === 'standard'
            ? 'w-[min(600px,calc(100vw-36px))]'
            : 'w-[min(820px,calc(100vw-40px))]';
    const columnClass = density === 'mega' ? 'sm:grid-cols-2' : 'grid-cols-1';

    return (
        <div ref={containerRef} className="relative" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            <motion.button
                type="button"
                onMouseEnter={() => { cancelClose(); setIsExpanded(true); }}
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
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3.5 w-3.5 opacity-45" />
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        onMouseEnter={cancelClose}
                        initial={{ opacity: 0, y: 6, scale: 0.985, x: '-50%' }}
                        animate={{ opacity: 1, y: 13, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 6, scale: 0.985, x: '-50%' }}
                        transition={{ duration: 0.19, ease: [0.22, 1, 0.36, 1] }}
                        className={cn('absolute left-1/2 top-full z-[120]', widthClass)}
                        role="menu"
                    >
                        <div className={cn(
                            'relative overflow-hidden border shadow-2xl backdrop-blur-2xl',
                            density === 'compact' ? 'rounded-[22px]' : 'rounded-[26px]',
                            theme === 'dark' ? 'border-white/[0.09] bg-[#090909]/[0.97] shadow-black/80' : 'border-black/[0.09] bg-white/[0.98] shadow-black/10',
                        )}>
                            <div className={cn('absolute inset-x-8 top-0 h-px', theme === 'dark' ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/15 to-transparent')} />

                            {density === 'compact' ? (
                                <div className={cn('flex items-center justify-between gap-4 border-b px-4 py-3.5', theme === 'dark' ? 'border-white/[0.065]' : 'border-black/[0.065]')}>
                                    <p className={cn('text-[13px] font-semibold tracking-[-0.02em]', theme === 'dark' ? 'text-white/88' : 'text-black/88')}>{menu.label}</p>
                                    {links.length > 1 && <span className={cn('font-mono text-[9px] uppercase tracking-[0.18em]', theme === 'dark' ? 'text-white/28' : 'text-black/32')}>{links.length} items</span>}
                                </div>
                            ) : (
                                <div className={cn('flex items-center justify-between gap-5 border-b px-5 py-4 sm:px-6', theme === 'dark' ? 'border-white/[0.07]' : 'border-black/[0.07]')}>
                                    <div>
                                        <p className={cn('font-mono text-[9px] uppercase tracking-[0.3em]', theme === 'dark' ? 'text-white/28' : 'text-black/32')}>Navigation</p>
                                        <p className={cn('mt-1 text-sm font-semibold tracking-[-0.02em]', theme === 'dark' ? 'text-white/85' : 'text-black/85')}>{menu.label}</p>
                                    </div>
                                    <span className={cn('rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em]', theme === 'dark' ? 'border-white/10 text-white/30' : 'border-black/10 text-black/35')}>{links.length} {links.length === 1 ? 'item' : 'items'}</span>
                                </div>
                            )}

                            <div className={cn('overflow-y-auto', density === 'compact' ? 'max-h-[360px] p-3' : 'max-h-[min(520px,65vh)] p-4 sm:p-5')}>
                                <div className={cn('grid', density === 'compact' ? 'gap-2' : 'gap-3', columnClass)}>
                                    {links.map((link, index) => (
                                        <motion.div key={link.id || `${link.label}-${link.href}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.12), duration: 0.18 }}>
                                            <MenuLink link={link} pathname={pathname} theme={theme} density={density} onNavigate={() => setIsExpanded(false)} />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
