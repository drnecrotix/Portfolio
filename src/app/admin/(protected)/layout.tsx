import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Menu, ShieldCheck } from 'lucide-react';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';

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
        <div className="min-h-screen bg-[#080808] text-white lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080808]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">Portfolio CMS</p>
                            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-white/35">{siteName} · {session.user.role}</p>
                        </div>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition group-open:bg-white group-open:text-black">
                            <Menu className="size-4" />
                        </span>
                    </summary>

                    <div className="mt-2 max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d0d] p-3 shadow-2xl">
                        <div className="mb-3 flex items-center gap-2 px-2 py-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                            <ShieldCheck className="size-3.5" />
                            Admin navigation
                        </div>
                        <nav className="grid grid-cols-2 gap-1.5">
                            {navItems.map(([label, href]) => (
                                <Link key={href} href={href} className="min-w-0 rounded-xl border border-transparent px-3 py-3 text-sm text-white/65 transition-colors hover:border-white/10 hover:bg-white/[0.05] hover:text-white">
                                    {label}
                                </Link>
                            ))}
                        </nav>
                        <form action={signOutAction} className="mt-3 border-t border-white/10 pt-3">
                            <button className="w-full rounded-xl px-3 py-3 text-left text-sm text-red-300/75 transition hover:bg-red-500/10 hover:text-red-200">Sign out</button>
                        </form>
                    </div>
                </details>
            </header>

            <aside className="hidden border-r border-white/10 p-6 lg:block lg:min-h-screen">
                <div className="mb-8">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">{siteName}</p>
                    <h1 className="mt-2 text-xl font-semibold">Portfolio CMS</h1>
                    <p className="mt-1 text-xs text-white/40">{session.user.role}</p>
                </div>

                <nav className="space-y-1">
                    {navItems.map(([label, href]) => (
                        <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white">{label}</Link>
                    ))}
                </nav>

                <form action={signOutAction} className="mt-10">
                    <button className="text-sm text-white/45 hover:text-white">Sign out</button>
                </form>
            </aside>

            <main className="min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 lg:p-12 [&_input]:max-w-full [&_select]:max-w-full [&_textarea]:max-w-full">
                {children}
            </main>
        </div>
    );
}
