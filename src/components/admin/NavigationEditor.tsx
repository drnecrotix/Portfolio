'use client';

import { useMemo, useState, useTransition } from 'react';
import { GripVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
    createNavigationItemAjax,
    deleteNavigationItemAjax,
    reorderNavigationItems,
    saveNavigationItems,
    seedDefaultNavigationAjax,
} from '@/app/admin/(protected)/navigation/actions';

export type NavigationEditorItem = {
    id: string;
    label: string;
    href: string;
    parentId: string | null;
    sortOrder: number;
    isVisible: boolean;
    isExternal: boolean;
    isDropdown: boolean;
    dropdownStyle: string;
};

type EditableState = NavigationEditorItem & { itemType: 'link' | 'dropdown' };

const input = 'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-white/25';
const dropdownStyles = [
    ['auto', 'Auto'],
    ['compact', 'Compact'],
    ['standard', 'Standard'],
    ['mega', 'Mega'],
] as const;

function normalize(items: NavigationEditorItem[]): EditableState[] {
    return items.map((item) => ({ ...item, itemType: item.isDropdown ? 'dropdown' : 'link' }));
}

export function NavigationEditor({ initialItems }: { initialItems: NavigationEditorItem[] }) {
    const [items, setItems] = useState<EditableState[]>(() => normalize(initialItems));
    const [baseline, setBaseline] = useState<EditableState[]>(() => normalize(initialItems));
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const topLevel = useMemo(() => items.filter((item) => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder), [items]);
    const dropdowns = topLevel.filter((item) => item.isDropdown);
    const dirty = JSON.stringify(items.map(({ sortOrder, ...item }) => item)) !== JSON.stringify(baseline.map(({ sortOrder, ...item }) => item));

    const childrenFor = (parentId: string) => items.filter((item) => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const childCount = (id: string) => items.filter((item) => item.parentId === id).length;

    const patch = (id: string, values: Partial<EditableState>) => {
        setItems((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));
        setMessage(null);
    };

    const saveAll = () => {
        startTransition(async () => {
            const result = await saveNavigationItems(items.map((item) => ({
                id: item.id,
                label: item.label,
                href: item.href,
                parentId: item.parentId,
                itemType: item.itemType,
                dropdownStyle: item.dropdownStyle,
                isVisible: item.isVisible,
                isExternal: item.isExternal,
            })));
            if (!result.ok) {
                setMessage({ type: 'error', text: result.error });
                return;
            }
            setBaseline(items.map((item) => ({ ...item })));
            setEditingId(null);
            setMessage({ type: 'success', text: 'Navigation changes saved.' });
        });
    };

    const reorder = (parentId: string | null, draggedId: string, targetId: string) => {
        if (draggedId === targetId) return;
        const siblings = items.filter((item) => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        const from = siblings.findIndex((item) => item.id === draggedId);
        const to = siblings.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return;
        const next = [...siblings];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const orderedIds = next.map((item) => item.id);
        const sortMap = new Map(orderedIds.map((id, index) => [id, (index + 1) * 10]));
        const previous = items;
        setItems((current) => current.map((item) => item.parentId === parentId ? { ...item, sortOrder: sortMap.get(item.id) ?? item.sortOrder } : item));
        setBaseline((current) => current.map((item) => item.parentId === parentId ? { ...item, sortOrder: sortMap.get(item.id) ?? item.sortOrder } : item));
        setMessage({ type: 'success', text: 'Order saved automatically.' });
        startTransition(async () => {
            const result = await reorderNavigationItems(parentId, orderedIds);
            if (!result.ok) {
                setItems(previous);
                setBaseline(previous);
                setMessage({ type: 'error', text: result.error });
            }
        });
    };

    const remove = (id: string) => {
        if (!window.confirm('Delete this navigation item?')) return;
        startTransition(async () => {
            const result = await deleteNavigationItemAjax(id);
            if (!result.ok) {
                setMessage({ type: 'error', text: result.error });
                return;
            }
            setItems((current) => current.filter((item) => item.id !== id));
            setBaseline((current) => current.filter((item) => item.id !== id));
            if (editingId === id) setEditingId(null);
            setMessage({ type: 'success', text: 'Menu item deleted.' });
        });
    };

    const createItem = (form: FormData) => {
        startTransition(async () => {
            const itemType = String(form.get('itemType') || 'link') === 'dropdown' ? 'dropdown' as const : 'link' as const;
            const result = await createNavigationItemAjax({
                label: String(form.get('label') || ''),
                href: String(form.get('href') || ''),
                parentId: String(form.get('parentId') || '') || null,
                itemType,
                dropdownStyle: String(form.get('dropdownStyle') || 'auto'),
                isVisible: form.get('isVisible') === 'on',
                isExternal: form.get('isExternal') === 'on',
            });
            if (!result.ok) {
                setMessage({ type: 'error', text: result.error });
                return;
            }
            const next = { ...result.item, itemType: result.item.isDropdown ? 'dropdown' as const : 'link' as const };
            setItems((current) => [...current, next]);
            setBaseline((current) => [...current, next]);
            setShowAdd(false);
            setMessage({ type: 'success', text: 'Menu item created.' });
        });
    };

    const seed = () => {
        startTransition(async () => {
            const result = await seedDefaultNavigationAjax();
            if (!result.ok) {
                setMessage({ type: 'error', text: result.error });
                return;
            }
            const next = normalize(result.items);
            setItems(next);
            setBaseline(next);
            setMessage({ type: 'success', text: 'Default navigation created.' });
        });
    };

    const renderRow = (item: EditableState, position: number, total: number, depth = 0) => {
        const hasChildren = childCount(item.id) > 0;
        const isEditing = editingId === item.id;
        return (
            <div
                key={item.id}
                draggable={!isEditing && !isPending}
                onDragStart={() => setDraggingId(item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => draggingId && reorder(item.parentId, draggingId, item.id)}
                className={`rounded-2xl border transition ${draggingId === item.id ? 'border-white/25 bg-white/[0.06] opacity-60' : 'border-white/[0.08] bg-white/[0.025]'} ${depth ? 'ml-6' : ''}`}
            >
                <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-white/25" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-white/85">{item.label || 'Untitled item'}</span>
                            {!item.isVisible && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-white/30">Hidden</span>}
                            {hasChildren && <span className="text-[10px] text-white/30">{childCount(item.id)} subitem{childCount(item.id) === 1 ? '' : 's'}</span>}
                        </div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-white/25">{position}/{total}</span>
                    <button type="button" onClick={() => setEditingId(isEditing ? null : item.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/[0.05] hover:text-white">
                        {isEditing ? 'Close' : 'Edit'}
                    </button>
                </div>

                {isEditing && (
                    <div className="border-t border-white/[0.07] p-4 md:p-5">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label className="text-xs text-white/45">Type
                                <select value={item.itemType} disabled={hasChildren} onChange={(e) => patch(item.id, { itemType: e.target.value as 'link' | 'dropdown', isDropdown: e.target.value === 'dropdown', parentId: e.target.value === 'dropdown' ? null : item.parentId })} className={input}>
                                    <option value="link">Link</option>
                                    <option value="dropdown">Dropdown menu</option>
                                </select>
                            </label>
                            <label className="text-xs text-white/45">Label<input value={item.label} onChange={(e) => patch(item.id, { label: e.target.value })} className={input} /></label>
                            <label className="text-xs text-white/45 xl:col-span-2">URL<input value={item.href === '#' ? '' : item.href} onChange={(e) => patch(item.id, { href: e.target.value })} placeholder={item.itemType === 'dropdown' ? 'Optional' : '/projects'} className={input} /></label>
                            <label className="text-xs text-white/45">Parent
                                <select value={item.parentId ?? ''} disabled={item.itemType === 'dropdown' || hasChildren} onChange={(e) => patch(item.id, { parentId: e.target.value || null })} className={input}>
                                    <option value="">Top level</option>
                                    {dropdowns.filter((candidate) => candidate.id !== item.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
                                </select>
                            </label>
                            <label className="text-xs text-white/45">Dropdown style
                                <select value={item.dropdownStyle} disabled={item.itemType !== 'dropdown'} onChange={(e) => patch(item.id, { dropdownStyle: e.target.value })} className={input}>
                                    {dropdownStyles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </label>
                            <div className="flex items-end gap-5 pb-2 md:col-span-2">
                                <label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={item.isVisible} onChange={(e) => patch(item.id, { isVisible: e.target.checked })} /> Visible</label>
                                <label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={item.isExternal} disabled={item.itemType === 'dropdown'} onChange={(e) => patch(item.id, { isExternal: e.target.checked })} /> External</label>
                                <button type="button" onClick={() => remove(item.id)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/[0.06]"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {message && <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-500/20 bg-red-500/[0.05] text-red-200' : 'border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200'}`}>{message.text}</div>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/35">Structure</p>
                    <h2 className="mt-2 text-4xl font-semibold">Navigation</h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/40">Drag items to reorder them instantly. Open Edit only when you need the full menu settings.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowAdd((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.05]"><Plus className="h-4 w-4" /> Add item</button>
                    <button type="button" onClick={saveAll} disabled={!dirty || isPending} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" /> {isPending ? 'Saving...' : 'Save changes'}</button>
                </div>
            </div>

            {showAdd && (
                <form action={createItem} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-medium">New menu item</h3><button type="button" onClick={() => setShowAdd(false)} className="text-white/35 hover:text-white"><X className="h-4 w-4" /></button></div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs text-white/45">Type<select name="itemType" defaultValue="link" className={input}><option value="link">Link</option><option value="dropdown">Dropdown menu</option></select></label>
                        <label className="text-xs text-white/45">Label<input name="label" required className={input} /></label>
                        <label className="text-xs text-white/45 xl:col-span-2">URL<input name="href" placeholder="/projects" className={input} /></label>
                        <label className="text-xs text-white/45">Parent<select name="parentId" className={input}><option value="">Top level</option>{dropdowns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                        <label className="text-xs text-white/45">Dropdown style<select name="dropdownStyle" defaultValue="auto" className={input}>{dropdownStyles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <div className="flex items-end gap-5 pb-2"><label className="flex items-center gap-2 text-xs text-white/55"><input name="isVisible" type="checkbox" defaultChecked /> Visible</label><label className="flex items-center gap-2 text-xs text-white/55"><input name="isExternal" type="checkbox" /> External</label></div>
                        <button disabled={isPending} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Create item</button>
                    </div>
                </form>
            )}

            {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><p className="text-sm text-white/40">No navigation items yet.</p><button type="button" onClick={seed} disabled={isPending} className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">Create default navigation</button></div>
            ) : (
                <div className="space-y-3">
                    {topLevel.map((item, index) => (
                        <div key={item.id} className="space-y-2">
                            {renderRow(item, index + 1, topLevel.length)}
                            {childrenFor(item.id).map((child, childIndex, children) => renderRow(child, childIndex + 1, children.length, 1))}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-white/30">
                <span>Order changes are saved automatically.</span>
                <span>{dirty ? 'Unsaved menu edits' : 'All changes saved'}</span>
            </div>
        </div>
    );
}
