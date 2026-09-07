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
    if (style === 'compact') return 'w-[min(390px,calc(100vw-24px))]';
    if (style === 'standard') return 'w-[min(570px,calc(100vw-28px))]';
    return 'w-[min(860px,calc(100vw-32px))]';
}

function DirectionIcon({ external, className }: { external: boolean; className?: string }) {
    return external ? <ExternalLink className={className} /> : <ArrowUpRight className={className} />;
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
    const number = String(index + 1).padStart(2, '0');

    if (style === 'compact') {
        return (
            <Link
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                onClick={onNavigate}
                role="menuitem"
                className={cn(
                    'group relative grid min-h-[54px] grid-cols-[36px_minmax(0,1fr)_34px] items-center gap-3 overflow-hidden rounded-[14px] px-2 py-2 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary/40',
                    active
                        ? dark ? 'text-white' : 'text-black'
                        : dark ? 'text-white/64 hover:text-white' : 'text-black/62 hover:text-black',
                )}
            >
                <span className={cn(
                    'pointer-events-none absolute inset-0 origin-left scale-x-0 rounded-[14px] transition-transform duration-300 ease-out group-hover:scale-x-100',
                    dark ? 'bg-white/[0.055]' : 'bg-black/[0.045]',
                    active && 'scale-x-100 bg-primary/[0.075]',
                )} />
                <span className={cn(
                    'relative z-10 grid size-8 place-items-center rounded-full border font-mono text-[8px] tracking-[0.08em] transition duration-300',
                    active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : dark ? 'border-white/[0.08] text-white/28 group-hover:border-white/[0.16] group-hover:text-white/55' : 'border-black/[0.08] text-black/30 group-hover:border-black/[0.16] group-hover:text-black/58',
                )}>
                    {number}
                </span>
                <span className={cn(
                    'relative z-10 truncate text-[13px] font-semibold tracking-[-0.02em] transition-transform duration-300 group-hover:translate-x-1',
                    active && 'text-primary',
                )}>{link.label}</span>
                <span className={cn(
                    'relative z-10 grid size-8 place-items-center rounded-full transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                    dark ? 'text-white/25 group-hover:bg-white/[0.05] group-hover:text-white/72' : 'text-black/28 group-hover:bg-black/[0.04] group-hover:text-black/72',
                    active && 'text-primary',
                )}>
                    <DirectionIcon external={external} className="size-3.5" />
                </span>
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
                    'group relative min-h-[78px] overflow-hidden rounded-[19px] border px-4 py-3.5 outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-primary/40',
                    active
                        ? dark ? 'border-primary/25 bg-primary/[0.065] text-white' : 'border-primary/25 bg-primary/[0.055] text-black'
                        : dark ? 'border-white/[0.065] bg-white/[0.018] text-white hover:border-white/[0.14] hover:bg-white/[0.045]' : 'border-black/[0.065] bg-black/[0.014] text-black hover:border-black/[0.14] hover:bg-black/[0.035]',
                )}
            >
                <span className={cn(
                    'pointer-events-none absolute -right-3 -top-8 select-none font-mono text-[72px] font-black leading-none tracking-[-0.08em] transition duration-500 group-hover:-translate-x-2 group-hover:translate-y-2',
                    dark ? 'text-white/[0.025]' : 'text-black/[0.025]',
                    active && 'text-primary/[0.055]',
                )}>{number}</span>
                <span className={cn(
                    'pointer-events-none absolute inset-y-3 left-0 w-px origin-center scale-y-0 transition-transform duration-300 group-hover:scale-y-100',
                    active ? 'scale-y-100 bg-primary' : dark ? 'bg-white/35' : 'bg-black/30',
                )} />
                <div className="relative z-10 flex items-center gap-4">
                    <span className={cn(
                        'font-mono text-[9px] tracking-[0.18em] transition-colors',
                        active ? 'text-primary' : dark ? 'text-white/28 group-hover:text-white/52' : 'text-black/30 group-hover:text-black/52',
                    )}>{number}</span>
                    <span className="min-w-0 flex-1">
                        <span className={cn(
                            'block truncate text-[15px] font-semibold tracking-[-0.025em] transition-transform duration-300 group-hover:translate-x-1',
                            active && 'text-primary',
                        )}>{link.label}</span>
                    </span>
                    {external && (
                        <span className={cn('font-mono text-[7px] uppercase tracking-[0.18em]', dark ? 'text-white/20' : 'text-black/24')}>external</span>
                    )}
                    <span className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-full border transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-3',
                        active
                            ? 'border-primary/25 bg-primary/10 text-primary'
                            : dark ? 'border-white/[0.08] bg-white/[0.018] text-white/32 group-hover:border-white/[0.18] group-hover:text-white/78' : 'border-black/[0.08] bg-black/[0.012] text-black/32 group-hover:border-black/[0.18] group-hover:text-black/78',
                    )}>
                        <DirectionIcon external={external} className="size-3.5" />
                    </span>
                </div>
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
                'group relative min-h-[132px] overflow-hidden rounded-[24px] border p-5 outline-none transition duration-500 focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                    ? dark ? 'border-primary/25 bg-primary/[0.06] text-white' : 'border-primary/25 bg-primary/[0.05] text-black'
                    : dark ? 'border-white/[0.07] bg-white/[0.018] text-white hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.045]' : 'border-black/[0.07] bg-black/[0.014] text-black hover:-translate-y-1 hover:border-black/[0.15] hover:bg-black/[0.035]',
            )}
        >
            <span className={cn(
                'pointer-events-none absolute -bottom-8 -left-2 select-none font-mono text-[104px] font-black leading-none tracking-[-0.1em] transition duration-700 group-hover:-translate-y-2 group-hover:translate-x-2',
                dark ? 'text-white/[0.025]' : 'text-black/[0.025]',
                active && 'text-primary/[0.05]',
            )}>{number}</span>
            <span className={cn(
                'pointer-events-none absolute -right-10 -top-12 size-32 rounded-full blur-3xl transition duration-700 group-hover:scale-150',
                active ? 'bg-primary/[0.14]' : dark ? 'bg-white/[0.035]' : 'bg-black/[0.03]',
            )} />
            <span className={cn(
                'pointer-events-none absolute right-5 top-5 h-px w-12 origin-right transition-all duration-500 group-hover:w-20',
                active ? 'bg-primary/55' : dark ? 'bg-white/14' : 'bg-black/14',
            )} />

            <div className="relative z-10 flex h-full min-h-[90px] flex-col justify-between">
                <div className="flex items-start justify-between gap-5">
                    <div className="flex items-center gap-2.5">
                        <span className={cn('font-mono text-[9px] tracking-[0.2em]', active ? 'text-primary' : dark ? 'text-white/28' : 'text-black/30')}>{number}</span>
                        {external && <span className={cn('font-mono text-[7px] uppercase tracking-[0.18em]', dark ? 'text-white/20' : 'text-black/24')}>external</span>}
                    </div>
                    <span className={cn(
                        'grid size-9 place-items-center rounded-full border transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:rotate-6',
                        active
                            ? 'border-primary/25 bg-primary/10 text-primary'
                            : dark ? 'border-white/[0.09] bg-white/[0.02] text-white/35 group-hover:border-white/[0.2] group-hover:text-white/80' : 'border-black/[0.09] bg-black/[0.015] text-black/35 group-hover:border-black/[0.2] group-hover:text-black/80',
                    )}>
                        <DirectionIcon external={external} className="size-3.5" />
                    </span>
                </div>

                <div className="mt-7">
                    <span className={cn(
                        'block truncate text-[17px] font-semibold tracking-[-0.035em] transition-transform duration-500 group-hover:translate-x-1',
                        active && 'text-primary',
                    )}>{link.label}</span>
                    <span className={cn(
                        'mt-3 block h-px w-8 transition-all duration-500 group-hover:w-16',
                        active ? 'bg-primary/65' : dark ? 'bg-white/18 group-hover:bg-white/38' : 'bg-black/18 group-hover:bg-black/38',
                    )} />
                </div>
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
        ? 'rounded-[20px] p-2'
        : style === 'standard'
            ? 'rounded-[26px] p-3'
            : 'rounded-[30px] p-4';

    return (
        <Popover.Root open={isExpanded} onOpenChange={setIsExpanded} modal={false}>
            <div onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>
                <Popover.Trigger asChild>
                    <button
                        type="button"
                        onPointerEnter={() => { cancelClose(); setIsExpanded(true); }}
                        onKeyDown={handleTriggerKeyDown}
                        className={cn(
                            'relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/40',
                            isActive
                                ? dark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'
                                : dark ? 'text-white/70 hover:bg-white/[0.04] hover:text-white' : 'text-black/70 hover:bg-black/[0.03] hover:text-black',
                        )}
                        aria-expanded={isExpanded}
                        aria-haspopup="menu"
                    >
                        <span>{menu.label}</span>
                        <ChevronDown className={cn('size-3.5 opacity-45 transition-transform duration-300', isExpanded && 'rotate-180')} />
                    </button>
                </Popover.Trigger>

                <Popover.Portal>
                    <Popover.Content
                        ref={contentRef}
                        side="bottom"
                        align="center"
                        sideOffset={11}
                        collisionPadding={16}
                        onPointerEnter={cancelClose}
                        onPointerLeave={scheduleClose}
                        onKeyDown={handleMenuKeyDown}
                        onOpenAutoFocus={(event) => event.preventDefault()}
                        className={cn(
                            'z-[180] origin-[var(--radix-popover-content-transform-origin)] outline-none will-change-[transform,opacity] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2',
                            panelWidth(style),
                        )}
                        role="menu"
                        aria-label={menu.label}
                    >
                        <div className={cn(
                            'relative overflow-hidden border shadow-[0_32px_100px_-38px_rgba(0,0,0,0.78)] backdrop-blur-2xl',
                            panelClass,
                            dark ? 'border-white/[0.09] bg-[#080808]/[0.955]' : 'border-black/[0.09] bg-white/[0.955]',
                        )}>
                            <div className={cn('pointer-events-none absolute inset-x-9 top-0 h-px', dark ? 'bg-gradient-to-r from-transparent via-white/28 to-transparent' : 'bg-gradient-to-r from-transparent via-black/18 to-transparent')} />
                            <div className={cn('pointer-events-none absolute -right-20 -top-24 size-56 rounded-full blur-3xl', dark ? 'bg-primary/[0.055]' : 'bg-primary/[0.045]')} />
                            {style === 'mega' && <div className={cn('pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full blur-3xl', dark ? 'bg-white/[0.025]' : 'bg-black/[0.02]')} />}

                            {style !== 'compact' ? (
                                <div className={cn('relative z-10 mb-3 flex items-end justify-between gap-5 px-2 pt-1', style === 'mega' && 'mb-4 px-1')}>
                                    <div className="flex items-end gap-3">
                                        <span className={cn('font-mono text-[8px] uppercase tracking-[0.34em]', dark ? 'text-white/24' : 'text-black/28')}>index</span>
                                        <span className={cn('text-sm font-semibold tracking-[-0.025em]', dark ? 'text-white/90' : 'text-black/90')}>{menu.label}</span>
                                    </div>
                                    <span className={cn('font-mono text-[8px] uppercase tracking-[0.18em]', dark ? 'text-white/24' : 'text-black/28')}>{String(links.length).padStart(2, '0')} entries</span>
                                </div>
                            ) : (
                                <div className="relative z-10 mb-1 flex items-center gap-3 px-2 py-1.5">
                                    <span className={cn('text-[11px] font-semibold tracking-[-0.02em]', dark ? 'text-white/84' : 'text-black/84')}>{menu.label}</span>
                                    <span className={cn('h-px flex-1', dark ? 'bg-white/[0.07]' : 'bg-black/[0.07]')} />
                                    <span className={cn('font-mono text-[8px] tracking-[0.16em]', dark ? 'text-white/24' : 'text-black/28')}>{String(links.length).padStart(2, '0')}</span>
                                </div>
                            )}

                            <div className={cn('relative z-10 overflow-y-auto overscroll-contain', style === 'compact' ? 'max-h-[340px]' : 'max-h-[min(540px,70vh)]')} data-lenis-prevent>
                                <div className={cn(
                                    'grid',
                                    style === 'compact' ? 'gap-1' : style === 'standard' ? 'gap-2' : 'gap-3 sm:grid-cols-2',
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
