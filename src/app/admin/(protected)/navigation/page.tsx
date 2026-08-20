import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { createNavigationItem, deleteNavigationItem, seedDefaultNavigation, updateNavigationItem } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;
const savedMessages: Record<string, string> = {
    created: 'Navigation item created.',
    updated: 'Navigation item saved.',
    removed: 'Navigation item removed.',
    seeded: 'Default navigation created.',
};

export default async function NavigationAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [items, params] = await Promise.all([
        prisma.navigationItem.findMany({ orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] }),
        searchParams,
    ]);
    const topLevel = items.filter((item) => !item.parentId);
    const sorted = [...topLevel].flatMap((parent) => [parent, ...items.filter((item) => item.parentId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder)]);
    const savedMessage = params.saved ? savedMessages[params.saved] || 'Navigation saved.' : undefined;

    const parentOptions = (currentId?: string) => topLevel.filter((item) => item.id !== currentId);

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : savedMessage ? 'success' : undefined} message={params.error || savedMessage} />
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Structure</p>
                    <h2 className="mt-2 text-4xl font-semibold">Navigation</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Create independent top-level menus and attach submenu items to a specific parent. Existing menus are never replaced when a new item is created.</p>
                </div>
                {items.length === 0 && <form action={seedDefaultNavigation}><button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Create default navigation</button></form>}
            </div>

            <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-lg font-semibold">Add item</h3>
                <form action={createNavigationItem} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <label className="text-sm text-white/60">Label<input name="label" required className={input} /></label>
                    <label className="text-sm text-white/60">URL<input name="href" required placeholder="/projects" className={input} /></label>
                    <label className="text-sm text-white/60">Parent<select name="parentId" className={input}><option value="">Top level</option>{parentOptions().map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                    <label className="text-sm text-white/60">Order<input name="sortOrder" type="number" defaultValue={0} className={input} /></label>
                    <div className="flex items-end gap-4 pb-3">
                        <label className="flex items-center gap-2 text-sm text-white/60"><input name="isVisible" type="checkbox" defaultChecked /> Visible</label>
                        <label className="flex items-center gap-2 text-sm text-white/60"><input name="isExternal" type="checkbox" /> External</label>
                    </div>
                    <button className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black md:col-span-2 xl:col-span-5">Add navigation item</button>
                </form>
            </section>

            <div className="space-y-4">
                {sorted.map((item) => {
                    const parent = item.parentId ? topLevel.find((candidate) => candidate.id === item.parentId) : null;
                    const hasChildren = items.some((candidate) => candidate.parentId === item.id);
                    return (
                        <section key={item.id} className={`rounded-2xl border bg-white/[0.02] p-5 ${item.parentId ? 'ml-6 border-white/5' : 'border-white/10'}`}>
                            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
                                <span>{item.parentId ? `Submenu of ${parent?.label || 'unknown'}` : 'Top level'}</span>
                                {hasChildren && <span>· contains submenu</span>}
                            </div>
                            <form action={updateNavigationItem.bind(null, item.id)} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <label className="text-sm text-white/60">Label<input name="label" defaultValue={item.label} required className={input} /></label>
                                <label className="text-sm text-white/60">URL<input name="href" defaultValue={item.href} required className={input} /></label>
                                <label className="text-sm text-white/60">Parent<select name="parentId" defaultValue={item.parentId ?? ''} disabled={hasChildren} className={input}><option value="">Top level</option>{parentOptions(item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>{hasChildren && <input type="hidden" name="parentId" value="" />}</label>
                                <label className="text-sm text-white/60">Order<input name="sortOrder" type="number" defaultValue={item.sortOrder} className={input} /></label>
                                <div className="flex items-end gap-4 pb-3">
                                    <label className="flex items-center gap-2 text-sm text-white/60"><input name="isVisible" type="checkbox" defaultChecked={item.isVisible} /> Visible</label>
                                    <label className="flex items-center gap-2 text-sm text-white/60"><input name="isExternal" type="checkbox" defaultChecked={item.isExternal} /> External</label>
                                </div>
                                <button className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 md:col-span-2 xl:col-span-4">Save</button>
                            </form>
                            <form action={deleteNavigationItem.bind(null, item.id)} className="mt-3 xl:-mt-10 xl:flex xl:justify-end"><button className="rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-300">Delete</button></form>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
