import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { deletePost, updatePost } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await prisma.post.findUnique({
        where: { id },
        include: { revisions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!post) notFound();

    const content = (post.content ?? {}) as { html?: string; text?: string };

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Blog</p>
                    <h2 className="mt-2 text-4xl font-semibold">Edit publication</h2>
                </div>
                <Link href={`/admin/blog/${post.id}/preview`} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:text-white">Preview</Link>
            </div>

            <form action={updatePost.bind(null, post.id)} className="space-y-8">
                <BlogPostForm value={{ ...post, content }} />
                <div className="flex justify-end">
                    <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save changes</button>
                </div>
            </form>

            <section className="mt-12 border-t border-white/10 pt-8">
                <h3 className="text-lg font-semibold">Recent revisions</h3>
                <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                    {post.revisions.map((revision) => (
                        <div key={revision.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                            <span className="text-white/55">Snapshot</span>
                            <time className="text-white/35">{revision.createdAt.toLocaleString()}</time>
                        </div>
                    ))}
                    {post.revisions.length === 0 && <div className="py-6 text-sm text-white/35">No revisions yet.</div>}
                </div>
            </section>

            <section className="mt-12 border-t border-red-500/20 pt-8">
                <h3 className="text-lg font-semibold text-red-300">Danger zone</h3>
                <form action={deletePost.bind(null, post.id)} className="mt-4">
                    <button className="rounded-xl border border-red-500/30 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10">Delete publication</button>
                </form>
            </section>
        </div>
    );
}
