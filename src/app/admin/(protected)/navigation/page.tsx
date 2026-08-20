import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { createNavigationItem, deleteNavigationItem, moveNavigationItem, seedDefaultNavigation, updateNavigationItem } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ saved?: string; error?: string }>;
const savedMessages: Record<string, string> = {
    created: 'Navigation item created.',
    updated: 'Navigation item saved.',
    moved: 'Navigation order updated.',
    removed: 'Navigation item removed.',
    seeded: 'Default navigation created.',
};

const dropdownStyleOptions = [
    ['auto', 'Auto · adapts to item count'],
    ['compact', 'Compact · best for 1–2 items'],
    ['standard', 'Standard · best for 3–4 items'],
    ['mega', 'Mega · two-column layout'],
] as const;

export default async function NavigationAdminPage({ searchParams }: { searchParams: SearchParams }) {
    const [items, params] = await Promise.all([
        prisma.navigationItem.findMany({ orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] }),
        searchParams,
    ]);
    const topLevel = items.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const dropdowns = topLevel.filter((item) => item.isDropdown);
    const sorted = topLevel.flatMap((parent) => [parent, ...items.filter((item) => item.parentId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder)]);
    const savedMessage = params.saved ? savedMessages[params.saved] || 'Navigation saved.' : undefined;

    const parentOptions = (currentId?: string) => dropdowns.filter((item) => item.id !== currentId);
    const siblingPosition = (itemId: string, parentId: string | null) => {
        const siblings = items.filter((item) => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        const index = siblings.findIndex((item) => item.id === itemId);
        return { index, count: siblings.length };
    };

    return (
        <div className="mx-auto max-w-6xl">
            <StatusToast type={params.error ? 'error' : savedMessage ? 'success' : undefined} message={params.error || savedMessage} />
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Structure</p>
                    <h2 className="mt-2 text-4xl font-semibold">Navigation</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Create links and dropdown menus, choose how each dropdown is presented, and use the arrow controls to arrange top-level and submenu items independently.</p>
                </div>
                {items.length === 0 && <form action={seedDefaultNavigation}><button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Create default navigation</button></form>}
            </div>

            <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">Add menu item</h3>
                        <p className="mt-1 text-xs text-white/35">Dropdown style can stay on Auto: 1–2 items become Compact, 3–4 Standard, and 5+ Mega automatically.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/35">Adaptive dropdowns</span>
                </div>
                <form action={createNavigationItem} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-8">
                    <label className="text-sm text-white/60">Type<select name="itemType" defaultValue="link" className={input}><option value="link">Link</option><option value="dropdown">Dropdown menu</option></select></label>
                    <label className="text-sm text-white/60">Label<input name="label" required placeholder="Projects" className={input} /></label>
                    <label className="text-sm text-white/60 xl:col-span-2">URL <span className="text-white/25">(optional for dropdown)</span><input name="href" placeholder="/projects" className={input} /></label>
                    <label className="text-sm text-white/60">Parent<select name="parentId" className={input}><option value="">Top level</option>{parentOptions().map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                    <label className="text-sm text-white/60 xl:col-span-2">Dropdown style<select name="dropdownStyle" defaultValue="auto" className={input}>{dropdownStyleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="text-sm text-white/60">Initial order<input name="sortOrder" type="number" defaultValue={1000} className={input} /></label>
                    <div className="flex items-center gap-5 md:col-span-2 xl:col-span-8">
                        <label className="flex items-center gap-2 text-sm text-white/60"><input name="isVisible" type="checkbox" defaultChecked /> Visible</label>
                        <label className="flex items-center gap-2 text-sm text-white/60"><input name="isExternal" type="checkbox" /> External link</label>
                    </div>
                    <button className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black md:col-span-2 xl:col-span-8">Create menu item</button>
                </form>
            </section>

            <div className="space-y-5">
                {sorted.map((item) => {
                    const parent = item.parentId ? topLevel.find((candidate) => candidate.id === item.parentId) : null;
                    const children = items.filter((candidate) => candidate.parentId === item.id).sort((a, b) => a.sortOrder - b.sortOrder);
                    const hasChildren = children.length > 0;
                    const position = siblingPosition(item.id, item.parentId);
                    return (
                        <section key={item.id} className={`relative overflow-hidden rounded-3xl border bg-white/[0.02] ${item.parentId ? 'ml-5 border-white/[0.06]' : 'border-white/10'}`}>
                            {!item.parentId && <div className="absolute inset-y-0 left-0 w-1 bg-white/[0.08]" />}
                            <div className="p-5 md:p-6">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${item.isDropdown ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200' : 'border-white/10 text-white/35'}`}>{item.isDropdown ? 'Dropdown' : item.parentId ? 'Submenu link' : 'Link'}</span>
                                        {item.isDropdown && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/30">{item.dropdownStyle}</span>}
                                        {parent && <span className="text-xs text-white/30">inside <span className="text-white/55">{parent.label}</span></span>}
                                        {hasChildren && <span className="text-xs text-white/30">{children.length} item{children.length === 1 ? '' : 's'}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="mr-1 text-[10px] uppercase tracking-[0.18em] text-white/25">Position {position.index + 1}/{position.count}</span>
                                        <form action={moveNavigationItem.bind(null, item.id, 'up')}><button disabled={position.index <= 0} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-20" aria-label={`Move ${item.label} up`}>↑</button></form>
                                        <form action={moveNavigationItem.bind(null, item.id, 'down')}><button disabled={position.index >= position.count - 1} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/65 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-20" aria-label={`Move ${item.label} down`}>↓</button></form>
                                    </div>
                                </div>

                                <form action={updateNavigationItem.bind(null, item.id)} className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
                                    <label className="text-sm text-white/60">Type<select name="itemType" defaultValue={item.isDropdown ? 'dropdown' : 'link'} disabled={hasChildren} className={input}><option value="link">Link</option><option value="dropdown">Dropdown menu</option></select>{hasChildren && <input type="hidden" name="itemType" value="dropdown" />}</label>
                                    <label className="text-sm text-white/60">Label<input name="label" defaultValue={item.label} required className={input} /></label>
                                    <label className="text-sm text-white/60 xl:col-span-2">URL <span className="text-white/25">(optional for dropdown)</span><input name="href" defaultValue={item.href === '#' ? '' : item.href} className={input} /></label>
                                    <label className="text-sm text-white/60">Parent<select name="parentId" defaultValue={item.parentId ?? ''} disabled={hasChildren || item.isDropdown} className={input}><option value="">Top level</option>{parentOptions(item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>{(hasChildren || item.isDropdown) && <input type="hidden" name="parentId" value="" />}</label>
                                    <label className={`text-sm ${item.isDropdown ? 'text-white/60' : 'text-white/25'} xl:col-span-2`}>Dropdown style<select name="dropdownStyle" defaultValue={item.dropdownStyle || 'auto'} disabled={!item.isDropdown} className={input}>{dropdownStyleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{!item.isDropdown && <input type="hidden" name="dropdownStyle" value="auto" />}</label>
                                    <label className="text-sm text-white/60">Order value<input name="sortOrder" type="number" defaultValue={item.sortOrder} className={input} /></label>
                                    <div className="flex items-center gap-5 md:col-span-2 xl:col-span-8">
                                        <label className="flex items-center gap-2 text-sm text-white/60"><input name="isVisible" type="checkbox" defaultChecked={item.isVisible} /> Visible</label>
                                        <label className={`flex items-center gap-2 text-sm ${item.isDropdown ? 'text-white/25' : 'text-white/60'}`}><input name="isExternal" type="checkbox" defaultChecked={item.isExternal} disabled={item.isDropdown} /> External</label>
                                    </div>
                                    <button className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.05] md:col-span-2 xl:col-span-7">Save changes</button>
                                </form>
                                <form action={deleteNavigationItem.bind(null, item.id)} className="mt-3 xl:-mt-[42px] xl:flex xl:justify-end"><button className="rounded-xl border border-red-500/20 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/[0.06]">Delete</button></form>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
