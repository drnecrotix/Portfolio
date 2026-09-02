import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function PagesAdminPage() {
    const pages = await prisma.page.findMany({
        where: { slug: { notIn: ['__experience-config', '__journey-entry-state'] } },
        orderBy: { updatedAt: 'desc' },
    });

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content</p>
                    <h2 className="text-4xl font-semibold mt-2">Pages</h2>
                    <p className="mt-3 text-sm text-white/45">Create standalone CMS pages with status, SEO and revision history.</p>
                </div>
                <Link href="/admin/pages/new" className="rounded-xl bg-white text-black px-4 py-2.5 text-sm font-semibold">New page</Link>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
                {pages.map((page) => (
                    <Link key={page.id} href={`/admin/pages/${page.id}`} className="grid gap-3 py-5 md:grid-cols-[1fr_auto_auto] md:items-center hover:bg-white/[0.02] md:px-4">
                        <div>
                            <p className="text-lg font-medium">{page.title}</p>
                            <p className="text-xs text-white/35 mt-1">/pages/{page.slug}</p>
                        </div>
                        <span className="text-xs text-white/45">{page.status}</span>
                        <span className="text-xs text-white/35">{page.updatedAt.toLocaleDateString()}</span>
                    </Link>
                ))}
                {pages.length === 0 && <p className="py-16 text-center text-white/40">No CMS pages yet.</p>}
            </div>
        </div>
    );
}
