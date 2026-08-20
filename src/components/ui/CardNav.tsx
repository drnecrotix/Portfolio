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

function MenuLink({ link, pathname, theme, onNavigate }: {
    link: CardNavLink;
    pathname: string;
    theme: 'light' | 'dark';
    onNavigate: () => void;
}) {
    const external = link.isExternal || /^https?:\/\//.test(link.href);
    const active = isLinkActive(pathname, link.href);

    return (
        <Link
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
            role="menuitem"
            className={cn(
                'group relative flex min-h-[82px] items-center justify-between gap-4 overflow-hidden rounded-[20px] border px-4 py-3.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D1FF4D]/50',
                theme === 'dark'
                    ? active
                        ? 'border-[#D1FF4D]/30 bg-[#D1FF4D]/[0.055] text-white'
                        : 'border-white/[0.08] bg-white/[0.022] text-white hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.05]'
                    : active
                        ? 'border-[#88a91d]/30 bg-[#88a91d]/[0.06] text-black'
                        : 'border-black/[0.08] bg-black/[0.018] text-black hover:-translate-y-0.5 hover:border-black/[0.15] hover:bg-black/[0.035]',
            )}
        >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className={cn('absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl', theme === 'dark' ? 'bg-white/[0.06]' : 'bg-black/[0.04]')} />
            </div>

            <div className="relative z-10 min-w-0">
                <div className="flex items-center gap-2">
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1FF4D] shadow-[0_0_8px_rgba(209,255,77,0.7)]" />}
                    <span className={cn('truncate text-sm font-semibold tracking-[-0.02em]', active && (theme === 'dark' ? 'text-[#D1FF4D]' : 'text-[#739a0d]'))}>{link.label}</span>
                </div>
                <span className={cn('mt-1 block truncate font-mono text-[10px]', theme === 'dark' ? 'text-white/32' : 'text-black/38')}>{link.description || link.href}</span>
            </div>

            <div className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-105', theme === 'dark' ? 'border-white/10 bg-white/[0.03] text-white/38' : 'border-black/10 bg-black/[0.025] text-black/38')}>
                {external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            </div>
        </Link>
    );
}

export default function CardNav({ items, theme = 'dark', pathname = '/' }: CardNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menu = items[0];
    const links = menu?.links ?? [];
    const isActive = useMemo(() => links.some((link) => isLinkActive(pathname, link.href)), [links, pathname]);

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

    const columnClass = links.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2';

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
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3.5 w-3.5 opacity-45" />
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        onMouseLeave={() => setIsExpanded(false)}
                        initial={{ opacity: 0, y: 8, scale: 0.985, x: '-50%' }}
                        animate={{ opacity: 1, y: 16, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 8, scale: 0.985, x: '-50%' }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-1/2 top-full z-[120] w-[min(680px,calc(100vw-40px))]"
                        role="menu"
                    >
                        <div className={cn(
                            'relative overflow-hidden rounded-[28px] border shadow-2xl backdrop-blur-2xl',
                            theme === 'dark' ? 'border-white/[0.09] bg-[#090909]/[0.97] shadow-black/80' : 'border-black/[0.09] bg-white/[0.98] shadow-black/10',
                        )}>
                            <div className={cn('absolute inset-x-8 top-0 h-px', theme === 'dark' ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/15 to-transparent')} />

                            <div className={cn('flex items-center justify-between gap-5 border-b px-5 py-4 sm:px-6', theme === 'dark' ? 'border-white/[0.07]' : 'border-black/[0.07]')}>
                                <div>
                                    <p className={cn('font-mono text-[9px] uppercase tracking-[0.3em]', theme === 'dark' ? 'text-white/28' : 'text-black/32')}>Navigation</p>
                                    <p className={cn('mt-1 text-sm font-semibold tracking-[-0.02em]', theme === 'dark' ? 'text-white/85' : 'text-black/85')}>{menu.label}</p>
                                </div>
                                <span className={cn('rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em]', theme === 'dark' ? 'border-white/10 text-white/30' : 'border-black/10 text-black/35')}>{links.length} {links.length === 1 ? 'item' : 'items'}</span>
                            </div>

                            <div className="max-h-[min(520px,65vh)] overflow-y-auto p-4 sm:p-5">
                                <div className={cn('grid gap-3', columnClass)}>
                                    {links.map((link) => (
                                        <MenuLink key={link.id || `${link.label}-${link.href}`} link={link} pathname={pathname} theme={theme} onNavigate={() => setIsExpanded(false)} />
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
