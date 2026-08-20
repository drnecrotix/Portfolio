'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ExternalLink } from 'lucide-react';
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

export default function CardNav({ items, theme = 'dark', pathname = '/' }: CardNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menu = items[0];
    const links = menu?.links ?? [];
    const isActive = useMemo(
        () => links.some((link) => pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`))),
        [links, pathname],
    );

    useEffect(() => {
        const onOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsExpanded(false);
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
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
                        : theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black',
                )}
                aria-expanded={isExpanded}
            >
                <span>{menu.label}</span>
                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </motion.span>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        onMouseLeave={() => setIsExpanded(false)}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 14, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-1/2 top-full z-[120] w-[min(620px,80vw)] -translate-x-1/2"
                    >
                        <div className={cn(
                            'grid gap-3 rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl sm:grid-cols-2',
                            theme === 'dark' ? 'border-white/10 bg-[#0a0a0a]/95 shadow-black/70' : 'border-black/10 bg-white/95 shadow-black/10',
                        )}>
                            {links.map((link) => {
                                const external = link.isExternal || /^https?:\/\//.test(link.href);
                                const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
                                return (
                                    <Link
                                        key={link.id || `${link.label}-${link.href}`}
                                        href={link.href}
                                        target={external ? '_blank' : undefined}
                                        rel={external ? 'noopener noreferrer' : undefined}
                                        onClick={() => setIsExpanded(false)}
                                        className={cn(
                                            'group rounded-2xl border p-4 transition hover:-translate-y-0.5',
                                            theme === 'dark'
                                                ? active ? 'border-[#D1FF4D]/40 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                                                : active ? 'border-[#8cb815]/50 bg-black/[0.04]' : 'border-black/10 bg-black/[0.02] hover:border-black/20 hover:bg-black/[0.04]',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">{link.label}</p>
                                                <p className="mt-1 text-xs opacity-55">{link.description || link.href}</p>
                                            </div>
                                            {external && <ExternalLink className="h-4 w-4 shrink-0 opacity-35" />}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
