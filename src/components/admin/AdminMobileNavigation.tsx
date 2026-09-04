'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown, Menu, ShieldCheck } from 'lucide-react';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';

export type AdminNavItem = readonly [label: string, href: string];
export type AdminNavGroup = readonly [label: string, items: readonly AdminNavItem[]];

function isItemActive(pathname: string, href: string, items: readonly AdminNavItem[]) {
    if (pathname === href) return true;
    if (href === '/admin' || !pathname.startsWith(`${href}/`)) return false;
    return !items.some(([, siblingHref]) => siblingHref !== href && siblingHref.startsWith(`${href}/`) && (pathname === siblingHref || pathname.startsWith(`${siblingHref}/`)));
}

export function AdminMobileNavigation({
    siteName,
    role,
    dashboardItem,
    navGroups,
    signOutAction,
}: {
    siteName: string;
    role: string;
    dashboardItem: AdminNavItem;
    navGroups: readonly AdminNavGroup[];
    signOutAction: () => Promise<void>;
}) {
    const pathname = usePathname();
    const detailsRef = useRef<HTMLDetailsElement>(null);

    const closeMenu = () => {
        detailsRef.current?.removeAttribute('open');
    };

    useEffect(() => {
        detailsRef.current?.removeAttribute('open');
    }, [pathname]);

    const linkClass = (active: boolean) => `block min-w-0 rounded-xl border px-3 py-2.5 text-sm transition-colors ${active ? 'border-foreground/15 bg-foreground/[0.08] font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:border-foreground/10 hover:bg-foreground/[0.05] hover:text-foreground'}`;

    return (
        <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/95 px-3 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-2">
                <details ref={detailsRef} className="group min-w-0 flex-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold">Portfolio CMS</p>
                            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{siteName} · {role}</p>
                        </div>
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.04] text-muted-foreground transition group-open:bg-foreground group-open:text-background">
                            <Menu className="size-5" />
                        </span>
                    </summary>

                    <div className="absolute inset-x-3 top-[calc(100%+0.35rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-foreground/10 bg-background p-3 shadow-2xl">
                        <div className="mb-3 flex items-center gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                            <ShieldCheck className="size-3.5" />
                            Admin navigation
                        </div>

                        <nav className="grid gap-2">
                            <Link href={dashboardItem[1]} onClick={closeMenu} className={linkClass(pathname === dashboardItem[1])}>{dashboardItem[0]}</Link>

                            {navGroups.map(([groupLabel, items]) => {
                                const groupActive = items.some(([, href]) => isItemActive(pathname, href, items));
                                return (
                                    <details key={groupLabel} className="group/nav rounded-xl border border-foreground/10 bg-foreground/[0.018]" open={groupActive || undefined}>
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground [&::-webkit-details-marker]:hidden">
                                            <span>{groupLabel}</span>
                                            <ChevronDown className="size-4 transition-transform group-open/nav:rotate-180" />
                                        </summary>
                                        <div className="grid gap-1 border-t border-foreground/10 p-2">
                                            {items.map(([label, href]) => (
                                                <Link key={href} href={href} onClick={closeMenu} className={linkClass(isItemActive(pathname, href, items))}>{label}</Link>
                                            ))}
                                        </div>
                                    </details>
                                );
                            })}
                        </nav>

                        <form action={signOutAction} className="mt-3 border-t border-foreground/10 pt-3">
                            <button className="w-full rounded-xl px-3 py-3 text-left text-sm text-red-500/80 transition hover:bg-red-500/10 hover:text-red-500">Sign out</button>
                        </form>
                    </div>
                </details>
                <AdminThemeToggle />
            </div>
        </header>
    );
}
