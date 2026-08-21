import './admin.css';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';
import { AdminMobileNavigation } from '@/components/admin/AdminMobileNavigation';

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
        <div className="admin-shell min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
            <AdminMobileNavigation siteName={siteName} role={session.user.role} navItems={navItems} signOutAction={signOutAction} />

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

            <main className="min-w-0 overflow-x-hidden p-3 sm:p-5 md:p-7 lg:p-9 xl:p-10 [&_button]:max-w-full [&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full">
                {children}
            </main>
        </div>
    );
}
