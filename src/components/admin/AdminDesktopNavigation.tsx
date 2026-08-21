'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';
import type { AdminNavGroup, AdminNavItem } from '@/components/admin/AdminMobileNavigation';

function activeGroupForPath(pathname: string, navGroups: readonly AdminNavGroup[]) {
    return navGroups.find(([groupLabel, items]) => items.some(([, href]) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`))))?.[0] ?? null;
}

export function AdminDesktopNavigation({
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
    const [openGroup, setOpenGroup] = useState<string | null>(() => activeGroupForPath(pathname, navGroups) ?? navGroups[0]?.[0] ?? null);

    useEffect(() => {
        const active = activeGroupForPath(pathname, navGroups);
        if (active) setOpenGroup(active);
    }, [pathname, navGroups]);

    const linkClass = (active: boolean) => `block rounded-lg border px-3 py-2 text-sm transition-colors ${active ? 'border-foreground/10 bg-foreground/[0.06] font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:border-foreground/10 hover:bg-foreground/[0.05] hover:text-foreground'}`;

    return (
        <aside className="hidden h-screen min-h-0 flex-col border-r border-foreground/10 bg-foreground/[0.015] lg:sticky lg:top-0 lg:flex">
            <div className="shrink-0 p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{siteName}</p>
                        <h1 className="mt-2 text-lg font-semibold">Portfolio CMS</h1>
                        <p className="mt-1 text-xs text-muted-foreground">{role}</p>
                    </div>
                    <AdminThemeToggle />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 [scrollbar-gutter:stable]">
                <nav className="grid gap-2 py-3">
                    <Link href={dashboardItem[1]} className={linkClass(pathname === dashboardItem[1])}>{dashboardItem[0]}</Link>

                    {navGroups.map(([groupLabel, items]) => {
                        const isOpen = openGroup === groupLabel;
                        return (
                            <section key={groupLabel} className="overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.012]">
                                <button
                                    type="button"
                                    onClick={() => setOpenGroup((current) => current === groupLabel ? null : groupLabel)}
                                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
                                    aria-expanded={isOpen}
                                >
                                    <span>{groupLabel}</span>
                                    <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="grid gap-0.5 border-t border-foreground/10 p-1.5">
                                        {items.map(([label, href]) => (
                                            <Link key={href} href={href} className={linkClass(pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)))}>{label}</Link>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </nav>
            </div>

            <form action={signOutAction} className="shrink-0 border-t border-foreground/10 p-5">
                <button className="text-sm text-muted-foreground transition hover:text-foreground">Sign out</button>
            </form>
        </aside>
    );
}
