import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
    const posts = await prisma.post.findMany({ orderBy: { updatedAt: 'desc' } });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content</p>
                    <h2 className="mt-2 text-4xl font-semibold">Blog</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/45">Manage articles, poetry, thoughts, notes and project logs. Public posts remain list-only and do not require thumbnails.</p>
                </div>
                <Link href="/admin/blog/new" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">New publication</Link>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
                {posts.map((post) => (
                    <Link key={post.id} href={`/admin/blog/${post.id}`} className="grid gap-3 py-6 transition-colors hover:bg-white/[0.025] md:grid-cols-[1fr_auto] md:px-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-medium">{post.title}</h3>
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{post.type.replaceAll('_', ' ')}</span>
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{post.status}</span>
                            </div>
                            <p className="mt-2 text-sm text-white/40">/{post.slug}</p>
                        </div>
                        <div className="text-xs text-white/35 md:text-right">Updated {post.updatedAt.toLocaleDateString()}</div>
                    </Link>
                ))}
                {posts.length === 0 && <div className="py-20 text-center text-sm text-white/40">No CMS publications yet.</div>}
            </div>
        </div>
    );
}
