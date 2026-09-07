'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DropdownStyle = 'auto' | 'compact' | 'standard' | 'mega';

type ResolvedDropdownStyle = Exclude<DropdownStyle, 'auto'>;

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

function resolveStyle(style: DropdownStyle | undefined, count: number): ResolvedDropdownStyle {
    if (style && style !== 'auto') return style;
    if (count <= 3) return 'compact';
    if (count <= 6) return 'standard';
    return 'mega';
}

function externalLink(link: CardNavLink) {
    return Boolean(link.isExternal || /^https?:\/\//.test(link.href));
}

function panelWidth(style: ResolvedDropdownStyle) {
    if (style === 'compact') return 'w-[min(360px,calc(100vw-24px))]';
    if (style === 'standard') return 'w-[min(520px,calc(100vw-28px))]';
    return 'w-[min(820px,calc(100vw-32px))]';
}

function MenuLink({
    link,
    pathname,
    theme,
    style,
    index,
    onNavigate,
}: {
    link: CardNavLink;
    pathname: string;
    theme: 'light' | 'dark';
    style: ResolvedDropdownStyle;
    index: number;
    onNavigate: () => void;
}) {
    const external = externalLink(link);
    const active = isLinkActive(pathname, link.href);
    const dark = theme === 'dark';

    if (style === 'compact') {
        return (
            <Link
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={onNavigate}
                role="menuitem"
                className={cn(
                    'group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary/40',
                    active
                        ? dark ? 'bg-white/[0.08] text-white' : 'bg-black/[0.06] text-black'
                        : dark ? 'text-white/72 hover:bg-white/[0.055] hover:text-white' : 'text-black/70 hover:bg-black/[0.045] hover:text-black',
                )}
            >
                <span className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[9px] tabular-nums transition',
                    active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : dark ? 'border-white/[0.08] bg-white/[0.025] text-white/32 group-hover:text-white/60' : 'border-black/[0.08] bg-black/[0.02] text-black/35 group-hover:text-black/60',
                )}>
                    {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold tracking-[-0.015em]">{link.label}</span>
                    <span className={cn('mt-0.5 block truncate font-mono text-[9px]', dark ? 'text-white/28' : 'text-black/36')}>{link.description || link.href}</span>
                </span>
                {external ? <ExternalLink className="size-3.5 shrink-0 opacity-35 transition group-hover:opacity-75" /> : <ArrowUpRight className="size-3.5 shrink-0 opacity-35 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-75" />}
            </Link>
        );
    }

    if (style === 'standard') {
        return (
            <Link
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={onNavigate}
                role="menuitem"
                className={cn(
                    'group relative flex min-h-[68px] items-center gap-4 overflow-hidden rounded-2xl border px-4 py-3 outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary/40',
                    active
                        ? dark ? 'border-primary/25 bg-primary/[0.07] text-white' : 'border-primary/25 bg-primary/[0.06] text-black'
                        : dark ? 'border-white/[0.07] bg-white/[0.025] text-white hover:border-white/[0.13] hover:bg-white/[0.05]' : 'border-black/[0.075] bg-black/[0.018] text-black hover:border-black/[0.14] hover:bg-black/[0.035]',
                )}
            >
                <div className={cn('absolute inset-y-0 left-0 w-px transition-opacity', active ? 'bg-primary opacity-100' : 'bg-primary opacity-0 group-hover:opacity-45')} />
                <span className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-xl border transition',
                    active
                        ? 'border-primary/25 bg-primary/10 text-primary'
                        : dark ? 'border-white/[0.08] bg-black/20 text-white/35 group-hover:text-white/70' : 'border-black/[0.08] bg-white/70 text-black/35 group-hover:text-black/70',
                )}>
                    {external ? <ExternalLink className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold tracking-[-0.02em]">{link.label}</span>
                    <span className={cn('mt-1 block truncate font-mono text-[9px]', dark ? 'text-white/30' : 'text-black/38')}>{link.description || link.href}</span>
                </span>
                <span className={cn('font-mono text-[9px] tabular-nums', dark ? 'text-white/20' : 'text-black/24')}>{String(index + 1).padStart(2, '0')}</span>
            </Link>
        );
    }

    return (
        <Link
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            onClick={onNavigate}
            role="menuitem"
            className={cn(
                'group relative min-h-[108px] overflow-hidden rounded-[22px] border p-4 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                    ? dark ? 'border-primary/25 bg-primary/[0.065] text-white' : 'border-primary/25 bg-primary/[0.055] text-black'
                    : dark ? 'border-white/[0.075] bg-white/[0.022] text-white hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05]' : 'border-black/[0.075] bg-black/[0.018] text-black hover:-translate-y-0.5 hover:border-black/[0.14] hover:bg-black/[0.035]',
            )}
        >
            <div className="flex items-start justify-between gap-5">
                <span className={cn('font-mono text-[9px] tracking-[0.16em]', active ? 'text-primary' : dark ? 'text-white/26' : 'text-black/30')}>{String(index + 1).padStart(2, '0')}</span>
                <span className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full border transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                    dark ? 'border-white/[0.09] bg-white/[0.025] text-white/38 group-hover:text-white/75' : 'border-black/[0.09] bg-black/[0.02] text-black/38 group-hover:text-black/75',
                )}>
                    {external ? <ExternalLink className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                </span>
            </div>
            <div className="mt-4 min-w-0">
                <span className={cn('block truncate text-base font-semibold tracking-[-0.025em]', active && 'text-primary')}>{link.label}</span>
                <span className={cn('mt-1.5 block truncate font-mono text-[9px]', dark ? 'text-white/30' : 'text-black/38')}>{link.description || link.href}</span>
            </div>
        </Link>
    );
}

export default function CardNav({ items, theme = 'dark', pathname = '/' }: CardNavProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const menu = items[0];
    const links = menu?.links ?? [];
    const style = resolveStyle(menu?.style, links.length);
    const isActive = useMemo(() => links.some((link) => isLinkActive(pathname, link.href)), [links, pathname]);
    const dark = theme === 'dark';

    const cancelClose = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
    };

    const scheduleClose = () => {
        cancelClose();
        closeTimerRef.current = setTimeout(() => setIsExpanded(false), 150);
    };

    const focusFirstItem = () => {
        window.requestAnimationFrame(() => {
            contentRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        });
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            if (event.key === 'ArrowDown') event.preventDefault();
            if (!isExpanded) setIsExpanded(true);
            if (event.key === 'ArrowDown') focusFirstItem();
        }
    };

    const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (!targets.length) return;
        const currentIndex = targets.indexOf(document.activeElement as HTMLElement);

        if (event.key === 'Escape') {
            event.preventDefault();
            setIsExpanded(false);
            return;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            targets[0]?.focus();
            return;
        }
        if (event.key === 'End') {
            event.preventDefault();
            targets[targets.length - 1]?.focus();
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = currentIndex < 0
            ? direction > 0 ? 0 : targets.length - 1
            : (currentIndex + direction + targets.length) % targets.length;
        targets[nextIndex]?.focus();
    };

    useEffect(() => () => cancelClose(), []);

    if (!menu || links.length === 0) return null;

    const panelClass = style === 'compact'
        ? 'rounded-[18px] p-2'
        : style === 'standard'
            ? 'rounded-[24px] p-3'
            : 'rounded-[28px] p-4';

    return (
        <Popover.Root open={isExpanded} onOpenChange={setIsExpanded} modal={false}>
            <div onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>
                <Popover.Trigger asChild>
                    <button
                        type="button"
                        onPointerEnter={() => { cancelClose(); setIsExpanded(true); }}
                        onKeyDown={handleTriggerKeyDown}
                        className={cn(
                            'relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40',
                            isActive
                                ? dark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                                : dark ? 'text-white/70 hover:bg-white/[0.04] hover:text-white' : 'text-black/70 hover:bg-black/[0.03] hover:text-black',
                        )}
                        aria-expanded={isExpanded}
                        aria-haspopup="menu"
                    >
                        <span>{menu.label}</span>
                        <ChevronDown className={cn('size-3.5 opacity-45 transition-transform duration-200', isExpanded && 'rotate-180')} />
                    </button>
                </Popover.Trigger>

                <Popover.Portal>
                    <Popover.Content
                        ref={contentRef}
                        side="bottom"
                        align="center"
                        sideOffset={10}
                        collisionPadding={16}
                        onPointerEnter={cancelClose}
                        onPointerLeave={scheduleClose}
                        onKeyDown={handleMenuKeyDown}
                        onOpenAutoFocus={(event) => event.preventDefault()}
                        className={cn(
                            'z-[180] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2',
                            panelWidth(style),
                        )}
                        role="menu"
                        aria-label={menu.label}
                    >
                        <div className={cn(
                            'relative overflow-hidden border shadow-[0_28px_90px_-36px_rgba(0,0,0,0.72)] backdrop-blur-2xl',
                            panelClass,
                            dark ? 'border-white/[0.09] bg-[#090909]/[0.94]' : 'border-black/[0.09] bg-white/[0.94]',
                        )}>
                            <div className={cn('pointer-events-none absolute inset-x-10 top-0 h-px', dark ? 'bg-gradient-to-r from-transparent via-white/24 to-transparent' : 'bg-gradient-to-r from-transparent via-black/16 to-transparent')} />

                            {style !== 'compact' && (
                                <div className={cn('mb-3 flex items-end justify-between gap-5 px-2 pt-1', style === 'mega' && 'mb-4 px-1 pt-0.5')}>
                                    <div>
                                        <p className={cn('font-mono text-[8px] uppercase tracking-[0.3em]', dark ? 'text-white/28' : 'text-black/32')}>Navigation</p>
                                        <p className={cn('mt-1 text-sm font-semibold tracking-[-0.02em]', dark ? 'text-white/88' : 'text-black/88')}>{menu.label}</p>
                                    </div>
                                    <span className={cn('rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em]', dark ? 'border-white/[0.08] text-white/28' : 'border-black/[0.08] text-black/32')}>{links.length} {links.length === 1 ? 'item' : 'items'}</span>
                                </div>
                            )}

                            {style === 'compact' && (
                                <div className={cn('mb-1 flex items-center justify-between px-2 py-1.5', dark ? 'text-white/42' : 'text-black/45')}>
                                    <span className="text-[11px] font-semibold tracking-[-0.01em]">{menu.label}</span>
                                    <span className="font-mono text-[8px] uppercase tracking-[0.16em]">{links.length}</span>
                                </div>
                            )}

                            <div className={cn('overflow-y-auto overscroll-contain', style === 'compact' ? 'max-h-[330px]' : 'max-h-[min(520px,68vh)]')} data-lenis-prevent>
                                <div className={cn(
                                    'grid',
                                    style === 'compact' ? 'gap-0.5' : style === 'standard' ? 'gap-2' : 'gap-3 sm:grid-cols-2',
                                )}>
                                    {links.map((link, index) => (
                                        <MenuLink
                                            key={link.id || `${link.label}-${link.href}`}
                                            link={link}
                                            pathname={pathname}
                                            theme={theme}
                                            style={style}
                                            index={index}
                                            onNavigate={() => setIsExpanded(false)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Popover.Content>
                </Popover.Portal>
            </div>
        </Popover.Root>
    );
}
