import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth, signOut } from '@/auth';

const navItems = [
    ['Dashboard', '/admin'],
    ['Homepage', '/admin/homepage'],
    ['Projects', '/admin/projects'],
    ['Blog', '/admin/blog'],
    ['Pages', '/admin/pages'],
    ['Navigation', '/admin/navigation'],
    ['Media', '/admin/media'],
    ['Site Mode', '/admin/site-mode'],
    ['SEO', '/admin/seo'],
    ['Redirects', '/admin/redirects'],
    ['Users', '/admin/users'],
    ['Settings', '/admin/settings'],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user) {
        redirect('/admin/login');
    }

    return (
        <div className="min-h-screen bg-[#080808] text-white grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            <aside className="border-r border-white/10 p-6 lg:min-h-screen">
                <div className="mb-8">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">Dr Necrotix</p>
                    <h1 className="text-xl font-semibold mt-2">Portfolio CMS</h1>
                    <p className="text-xs text-white/40 mt-1">{session.user.role}</p>
                </div>

                <nav className="space-y-1">
                    {navItems.map(([label, href]) => (
                        <Link
                            key={href}
                            href={href}
                            className="block rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <form
                    action={async () => {
                        'use server';
                        const cookieStore = await cookies();
                        cookieStore.delete('portfolio-admin-bypass');
                        await signOut({ redirectTo: '/admin/login' });
                    }}
                    className="mt-10"
                >
                    <button className="text-sm text-white/45 hover:text-white">Sign out</button>
                </form>
            </aside>

            <main className="p-6 md:p-10 lg:p-12">{children}</main>
        </div>
    );
}
