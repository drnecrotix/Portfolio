import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
    const posts = await prisma.post.findMany({
        include: {
            postType: { select: { name: true } },
            categoryRef: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content</p>
                    <h2 className="mt-2 text-4xl font-semibold">Blog</h2>
                    <p className="mt-3 max-w-2xl text-sm text-white/45">Write and manage publications with reusable post types, categories, media, scheduling and revisions.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/blog/taxonomies" className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65 hover:text-white">Types & Categories</Link>
                    <Link href="/admin/blog/new" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black">Add new post</Link>
                </div>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
                {posts.map((post) => (
                    <Link key={post.id} href={`/admin/blog/${post.id}`} className="grid gap-3 py-6 transition-colors hover:bg-white/[0.025] md:grid-cols-[1fr_auto] md:px-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-medium">{post.title}</h3>
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{post.postType?.name ?? post.type.replaceAll('_', ' ')}</span>
                                {post.categoryRef?.name && <span className="rounded-full border border-sky-400/15 bg-sky-400/[0.04] px-2 py-1 text-[10px] uppercase tracking-wider text-sky-200/65">{post.categoryRef.name}</span>}
                                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">{post.status}</span>
                            </div>
                            <p className="mt-2 text-sm text-white/40">/blog/{post.slug}</p>
                        </div>
                        <div className="text-xs text-white/35 md:text-right">Updated {post.updatedAt.toLocaleDateString()}</div>
                    </Link>
                ))}
                {posts.length === 0 && <div className="py-20 text-center text-sm text-white/40">No CMS publications yet.</div>}
            </div>
        </div>
    );
}
