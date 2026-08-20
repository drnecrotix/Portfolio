import Link from 'next/link';
import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { prisma } from '@/lib/prisma';
import { createPost } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
    const [postTypes, categories] = await Promise.all([
        prisma.blogPostType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, editorMode: true } }),
        prisma.blogCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } }),
    ]);

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Blog</p>
                    <h2 className="mt-2 text-4xl font-semibold">Add new post</h2>
                    <p className="mt-2 text-sm text-white/40">WordPress-style writing workspace with reusable types, categories, media and publishing controls.</p>
                </div>
                <Link href="/admin/blog/taxonomies" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:text-white">Manage Types & Categories</Link>
            </div>
            {postTypes.length === 0 ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-6 text-sm text-amber-200">Create at least one active post type before writing a post.</div>
            ) : (
                <form action={createPost}>
                    <BlogPostForm postTypes={postTypes} categories={categories} submitLabel="Create post" />
                </form>
            )}
        </div>
    );
}
