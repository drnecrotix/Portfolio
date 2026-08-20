import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import {
    createBlogCategory,
    createBlogType,
    deleteBlogCategory,
    deleteBlogType,
    updateBlogCategory,
    updateBlogType,
} from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
const editorModes = ['ARTICLE', 'POETRY', 'THOUGHT', 'NOTE', 'PROJECT_LOG'] as const;
const messages: Record<string, string> = {
    'type-created': 'Post type created.',
    'type-updated': 'Post type updated.',
    'type-removed': 'Post type removed.',
    'category-created': 'Category created.',
    'category-updated': 'Category updated.',
    'category-removed': 'Category removed.',
};

export const dynamic = 'force-dynamic';

export default async function BlogTaxonomiesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
    const [types, categories, params] = await Promise.all([
        prisma.blogPostType.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { posts: true } } } }),
        prisma.blogCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { posts: true } } } }),
        searchParams,
    ]);
    const success = params.saved ? messages[params.saved] || 'Taxonomy saved.' : undefined;

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : success ? 'success' : undefined} message={params.error || success} />
            <div className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">Blog</p>
                <h2 className="mt-2 text-4xl font-semibold">Types & Categories</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Manage reusable publication types and real categories. Type names are fully editable; Editor mode controls how the content editor behaves without breaking the public renderer.</p>
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
                <section className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                        <h3 className="text-lg font-semibold">Create post type</h3>
                        <form action={createBlogType} className="mt-5 grid gap-4 md:grid-cols-2">
                            <label className="text-sm text-white/60">Name<input name="name" required placeholder="Tutorial" className={input} /></label>
                            <label className="text-sm text-white/60">Slug<input name="slug" required placeholder="tutorial" className={input} /></label>
                            <label className="text-sm text-white/60">Editor mode<select name="editorMode" defaultValue="ARTICLE" className={input}>{editorModes.map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>
                            <label className="text-sm text-white/60">Order<input name="sortOrder" type="number" defaultValue={100} className={input} /></label>
                            <label className="text-sm text-white/60 md:col-span-2">Description<textarea name="description" rows={2} className={input} /></label>
                            <label className="flex items-center gap-2 text-sm text-white/60"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
                            <button className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black md:col-span-2">Create type</button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {types.map((type) => (
                            <article key={type.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                <div className="mb-4 flex items-center justify-between gap-3"><div><h4 className="font-semibold">{type.name}</h4><p className="mt-1 text-xs text-white/35">{type._count.posts} post(s) · {type.editorMode}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${type.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/35'}`}>{type.isActive ? 'Active' : 'Hidden'}</span></div>
                                <form action={updateBlogType.bind(null, type.id)} className="grid gap-3 md:grid-cols-2">
                                    <label className="text-xs text-white/45">Name<input name="name" defaultValue={type.name} required className={input} /></label>
                                    <label className="text-xs text-white/45">Slug<input name="slug" defaultValue={type.slug} required className={input} /></label>
                                    <label className="text-xs text-white/45">Editor mode<select name="editorMode" defaultValue={type.editorMode} className={input}>{editorModes.map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>
                                    <label className="text-xs text-white/45">Order<input name="sortOrder" type="number" defaultValue={type.sortOrder} className={input} /></label>
                                    <label className="text-xs text-white/45 md:col-span-2">Description<textarea name="description" rows={2} defaultValue={type.description ?? ''} className={input} /></label>
                                    <label className="flex items-center gap-2 text-xs text-white/55"><input name="isActive" type="checkbox" defaultChecked={type.isActive} /> Active</label>
                                    <button className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80">Save type</button>
                                </form>
                                <form action={deleteBlogType.bind(null, type.id)} className="mt-3"><button className="text-xs text-red-300/75 hover:text-red-300">Delete type</button></form>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                        <h3 className="text-lg font-semibold">Create category</h3>
                        <form action={createBlogCategory} className="mt-5 grid gap-4 md:grid-cols-2">
                            <label className="text-sm text-white/60">Name<input name="name" required placeholder="Development" className={input} /></label>
                            <label className="text-sm text-white/60">Slug<input name="slug" required placeholder="development" className={input} /></label>
                            <label className="text-sm text-white/60">Order<input name="sortOrder" type="number" defaultValue={100} className={input} /></label>
                            <label className="flex items-end gap-2 pb-3 text-sm text-white/60"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
                            <label className="text-sm text-white/60 md:col-span-2">Description<textarea name="description" rows={2} className={input} /></label>
                            <button className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black md:col-span-2">Create category</button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        {categories.map((category) => (
                            <article key={category.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                <div className="mb-4 flex items-center justify-between gap-3"><div><h4 className="font-semibold">{category.name}</h4><p className="mt-1 text-xs text-white/35">{category._count.posts} post(s)</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${category.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/35'}`}>{category.isActive ? 'Active' : 'Hidden'}</span></div>
                                <form action={updateBlogCategory.bind(null, category.id)} className="grid gap-3 md:grid-cols-2">
                                    <label className="text-xs text-white/45">Name<input name="name" defaultValue={category.name} required className={input} /></label>
                                    <label className="text-xs text-white/45">Slug<input name="slug" defaultValue={category.slug} required className={input} /></label>
                                    <label className="text-xs text-white/45">Order<input name="sortOrder" type="number" defaultValue={category.sortOrder} className={input} /></label>
                                    <label className="flex items-end gap-2 pb-3 text-xs text-white/55"><input name="isActive" type="checkbox" defaultChecked={category.isActive} /> Active</label>
                                    <label className="text-xs text-white/45 md:col-span-2">Description<textarea name="description" rows={2} defaultValue={category.description ?? ''} className={input} /></label>
                                    <button className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 md:col-span-2">Save category</button>
                                </form>
                                <form action={deleteBlogCategory.bind(null, category.id)} className="mt-3"><button className="text-xs text-red-300/75 hover:text-red-300">Delete category</button></form>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
