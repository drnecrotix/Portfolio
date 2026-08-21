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

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
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
    const activeTypes = types.filter((item) => item.isActive).length;
    const activeCategories = categories.filter((item) => item.isActive).length;

    return (
        <div className="mx-auto max-w-7xl">
            <StatusToast type={params.error ? 'error' : success ? 'success' : undefined} message={params.error || success} />
            <div className="mb-8 sm:mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Blog</p>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Types & Categories</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Create reusable publication types and categories without keeping every editor open at once. Expand an item only when you need to edit it.</p>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Post types</p><p className="mt-2 text-2xl font-semibold">{types.length}</p><p className="mt-1 text-xs text-muted-foreground">{activeTypes} active</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Categories</p><p className="mt-2 text-2xl font-semibold">{categories.length}</p><p className="mt-1 text-xs text-muted-foreground">{activeCategories} active</p></div>
                <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:col-span-2"><p className="text-xs uppercase tracking-wider text-muted-foreground">Tip</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Editor mode controls the writing experience; the public renderer still uses the selected reusable type/category labels.</p></div>
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
                <section className="space-y-4">
                    <div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Publication</p><h3 className="mt-1 text-xl font-semibold">Post types</h3></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">{types.length}</span></div>
                    <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 sm:p-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden"><div><h4 className="font-semibold">Create post type</h4><p className="mt-1 text-xs text-muted-foreground">Add a new reusable publishing format.</p></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">New</span></summary>
                        <form action={createBlogType} className="mt-5 grid gap-4 border-t border-foreground/10 pt-5 md:grid-cols-2">
                            <label className="text-sm text-muted-foreground">Name<input name="name" required placeholder="Tutorial" className={input} /></label>
                            <label className="text-sm text-muted-foreground">Slug<input name="slug" required placeholder="tutorial" className={input} /></label>
                            <label className="text-sm text-muted-foreground">Editor mode<select name="editorMode" defaultValue="ARTICLE" className={input}>{editorModes.map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>
                            <label className="text-sm text-muted-foreground">Order<input name="sortOrder" type="number" defaultValue={100} className={input} /></label>
                            <label className="text-sm text-muted-foreground md:col-span-2">Description<textarea name="description" rows={2} className={input} /></label>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
                            <button className="rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background md:col-span-2">Create type</button>
                        </form>
                    </details>

                    <div className="space-y-3">
                        {types.map((type) => (
                            <details key={type.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{type.name}</h4><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${type.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-muted-foreground'}`}>{type.isActive ? 'Active' : 'Hidden'}</span></div><p className="mt-1 text-xs text-muted-foreground">{type._count.posts} post(s) · {type.editorMode} · /{type.slug}</p></div>
                                    <span className="shrink-0 rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Edit</span>
                                </summary>
                                <form action={updateBlogType.bind(null, type.id)} className="mt-5 grid gap-3 border-t border-foreground/10 pt-5 md:grid-cols-2">
                                    <label className="text-xs text-muted-foreground">Name<input name="name" defaultValue={type.name} required className={input} /></label>
                                    <label className="text-xs text-muted-foreground">Slug<input name="slug" defaultValue={type.slug} required className={input} /></label>
                                    <label className="text-xs text-muted-foreground">Editor mode<select name="editorMode" defaultValue={type.editorMode} className={input}>{editorModes.map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>
                                    <label className="text-xs text-muted-foreground">Order<input name="sortOrder" type="number" defaultValue={type.sortOrder} className={input} /></label>
                                    <label className="text-xs text-muted-foreground md:col-span-2">Description<textarea name="description" rows={2} defaultValue={type.description ?? ''} className={input} /></label>
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground"><input name="isActive" type="checkbox" defaultChecked={type.isActive} /> Active</label>
                                    <button className="rounded-xl border border-foreground/15 px-4 py-2 text-sm font-medium">Save type</button>
                                </form>
                                <form action={deleteBlogType.bind(null, type.id)} className="mt-3 border-t border-foreground/10 pt-3"><button className="text-xs text-red-500/80 hover:text-red-500">Delete type</button></form>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Organization</p><h3 className="mt-1 text-xl font-semibold">Categories</h3></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">{categories.length}</span></div>
                    <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 sm:p-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden"><div><h4 className="font-semibold">Create category</h4><p className="mt-1 text-xs text-muted-foreground">Add a reusable category for blog filtering.</p></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">New</span></summary>
                        <form action={createBlogCategory} className="mt-5 grid gap-4 border-t border-foreground/10 pt-5 md:grid-cols-2">
                            <label className="text-sm text-muted-foreground">Name<input name="name" required placeholder="Development" className={input} /></label>
                            <label className="text-sm text-muted-foreground">Slug<input name="slug" required placeholder="development" className={input} /></label>
                            <label className="text-sm text-muted-foreground">Order<input name="sortOrder" type="number" defaultValue={100} className={input} /></label>
                            <label className="flex items-end gap-2 pb-3 text-sm text-muted-foreground"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
                            <label className="text-sm text-muted-foreground md:col-span-2">Description<textarea name="description" rows={2} className={input} /></label>
                            <button className="rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background md:col-span-2">Create category</button>
                        </form>
                    </details>

                    <div className="space-y-3">
                        {categories.map((category) => (
                            <details key={category.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{category.name}</h4><span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${category.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground/5 text-muted-foreground'}`}>{category.isActive ? 'Active' : 'Hidden'}</span></div><p className="mt-1 text-xs text-muted-foreground">{category._count.posts} post(s) · /{category.slug}</p></div>
                                    <span className="shrink-0 rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Edit</span>
                                </summary>
                                <form action={updateBlogCategory.bind(null, category.id)} className="mt-5 grid gap-3 border-t border-foreground/10 pt-5 md:grid-cols-2">
                                    <label className="text-xs text-muted-foreground">Name<input name="name" defaultValue={category.name} required className={input} /></label>
                                    <label className="text-xs text-muted-foreground">Slug<input name="slug" defaultValue={category.slug} required className={input} /></label>
                                    <label className="text-xs text-muted-foreground">Order<input name="sortOrder" type="number" defaultValue={category.sortOrder} className={input} /></label>
                                    <label className="flex items-end gap-2 pb-3 text-xs text-muted-foreground"><input name="isActive" type="checkbox" defaultChecked={category.isActive} /> Active</label>
                                    <label className="text-xs text-muted-foreground md:col-span-2">Description<textarea name="description" rows={2} defaultValue={category.description ?? ''} className={input} /></label>
                                    <button className="rounded-xl border border-foreground/15 px-4 py-2 text-sm font-medium md:col-span-2">Save category</button>
                                </form>
                                <form action={deleteBlogCategory.bind(null, category.id)} className="mt-3 border-t border-foreground/10 pt-3"><button className="text-xs text-red-500/80 hover:text-red-500">Delete category</button></form>
                            </details>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
