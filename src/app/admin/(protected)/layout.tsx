import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Menu, ShieldCheck } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';

const navItems = [
    ['Dashboard', '/admin'],
    ['Homepage', '/admin/homepage'],
    ['Projects', '/admin/projects'],
    ['Blog', '/admin/blog'],
    ['Blog Taxonomies', '/admin/blog/taxonomies'],
    ['Gallery', '/admin/gallery'],
    ['Pages', '/admin/pages'],
    ['Navigation', '/admin/navigation'],
    ['Footer', '/admin/footer'],
    ['Media', '/admin/media'],
    ['AI Assistant', '/admin/assistant'],
    ['Revisions', '/admin/revisions'],
    ['Site Mode', '/admin/site-mode'],
    ['SEO', '/admin/seo'],
    ['Redirects', '/admin/redirects'],
    ['Users', '/admin/users'],
    ['Settings', '/admin/settings'],
] as const;

async function signOutAction() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('portfolio-admin-bypass');
    await signOut({ redirectTo: '/admin/login' });
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user) redirect('/admin/login');

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { siteName: true } }).catch(() => null);
    const siteName = settings?.siteName ?? 'Portfolio';

    return (
        <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
            <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/95 px-3 py-3 backdrop-blur-xl lg:hidden">
                <div className="flex items-center gap-2">
                    <details className="group min-w-0 flex-1">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 [&::-webkit-details-marker]:hidden">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">Portfolio CMS</p>
                                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{siteName} · {session.user.role}</p>
                            </div>
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/[0.04] text-muted-foreground transition group-open:bg-foreground group-open:text-background">
                                <Menu className="size-4" />
                            </span>
                        </summary>

                        <div className="mt-2 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-foreground/10 bg-background p-3 shadow-2xl">
                            <div className="mb-3 flex items-center gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                                <ShieldCheck className="size-3.5" />
                                Admin navigation
                            </div>
                            <nav className="grid grid-cols-2 gap-1.5">
                                {navItems.map(([label, href]) => (
                                    <Link key={href} href={href} className="min-w-0 rounded-xl border border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/10 hover:bg-foreground/[0.05] hover:text-foreground">
                                        {label}
                                    </Link>
                                ))}
                            </nav>
                            <form action={signOutAction} className="mt-3 border-t border-foreground/10 pt-3">
                                <button className="w-full rounded-xl px-3 py-3 text-left text-sm text-red-500/80 transition hover:bg-red-500/10 hover:text-red-500">Sign out</button>
                            </form>
                        </div>
                    </details>
                    <AdminThemeToggle />
                </div>
            </header>

            <aside className="hidden border-r border-foreground/10 bg-foreground/[0.015] p-5 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
                <div className="mb-7 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{siteName}</p>
                        <h1 className="mt-2 text-lg font-semibold">Portfolio CMS</h1>
                        <p className="mt-1 text-xs text-muted-foreground">{session.user.role}</p>
                    </div>
                    <AdminThemeToggle />
                </div>

                <nav className="grid gap-1">
                    {navItems.map(([label, href]) => (
                        <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground">{label}</Link>
                    ))}
                </nav>

                <form action={signOutAction} className="mt-8 border-t border-foreground/10 pt-5">
                    <button className="text-sm text-muted-foreground transition hover:text-foreground">Sign out</button>
                </form>
            </aside>

            <main className="min-w-0 overflow-x-hidden p-3 sm:p-5 md:p-7 lg:p-9 xl:p-10 [&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full">
                {children}
            </main>
        </div>
    );
}
