import './admin.css';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminDesktopNavigation } from '@/components/admin/AdminDesktopNavigation';
import { AdminMobileNavigation, type AdminNavGroup, type AdminNavItem } from '@/components/admin/AdminMobileNavigation';

const dashboardItem = ['Dashboard', '/admin'] as const satisfies AdminNavItem;

const navGroups = [
    ['Content', [
        ['Homepage', '/admin/homepage'],
        ['Experience', '/admin/experience'],
        ['Projects', '/admin/projects'],
        ['Blog', '/admin/blog'],
        ['Comments', '/admin/comments'],
        ['Blog Taxonomies', '/admin/blog/taxonomies'],
        ['Gallery', '/admin/gallery'],
        ['Pages', '/admin/pages'],
        ['Media', '/admin/media'],
    ]],
    ['Appearance', [
        ['Navigation', '/admin/navigation'],
        ['Footer', '/admin/footer'],
    ]],
    ['Publishing & SEO', [
        ['Revisions', '/admin/revisions'],
        ['Site Mode', '/admin/site-mode'],
        ['SEO', '/admin/seo'],
        ['Redirects', '/admin/redirects'],
    ]],
    ['Tools', [
        ['AI Assistant', '/admin/assistant'],
    ]],
    ['Administration', [
        ['Users', '/admin/users'],
        ['Settings', '/admin/settings'],
    ]],
] as const satisfies readonly AdminNavGroup[];

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
    const canModerateComments = session.user.role === 'OWNER' || session.user.role === 'ADMIN';
    const visibleNavGroups = navGroups.map(([groupLabel, items]) => [
        groupLabel,
        items.filter(([label]) => label !== 'Comments' || canModerateComments),
    ] as const).filter(([, items]) => items.length > 0);

    return (
        <div className="admin-shell min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
            <AdminMobileNavigation siteName={siteName} role={session.user.role} dashboardItem={dashboardItem} navGroups={visibleNavGroups} signOutAction={signOutAction} />
            <AdminDesktopNavigation siteName={siteName} role={session.user.role} dashboardItem={dashboardItem} navGroups={visibleNavGroups} signOutAction={signOutAction} />

            <main className="min-w-0 overflow-x-hidden p-3 sm:p-5 md:p-7 lg:p-9 xl:p-10 [&_button]:max-w-full [&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full">
                {children}
            </main>
        </div>
    );
}
