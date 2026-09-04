'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const DROPDOWN_STYLES = new Set(['auto', 'compact', 'standard', 'mega']);

type EditableNavigationItem = {
    id: string;
    label: string;
    href: string;
    parentId: string | null;
    itemType: 'link' | 'dropdown';
    dropdownStyle: string;
    isVisible: boolean;
    isExternal: boolean;
};

type NewNavigationItem = Omit<EditableNavigationItem, 'id'>;

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function bounded(value: unknown, max: number, label: string) {
    const result = String(value ?? '').trim();
    if (result.length > max) throw new Error(`${label} is too long.`);
    return result;
}

function normalizeHref(value: unknown, isExternal: boolean, isDropdown: boolean) {
    const href = bounded(value, 2048, 'Navigation URL');
    if (isDropdown && !href) return '#';
    if (!href || /[\u0000-\u001f\u007f]/.test(href)) throw new Error('A valid navigation URL is required.');
    if (isExternal) {
        const parsed = new URL(href);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
            throw new Error('External navigation URLs must use HTTP or HTTPS.');
        }
        return parsed.toString();
    }
    if (!href.startsWith('/') || href.startsWith('//')) throw new Error('Internal navigation URLs must start with a single /.');
    return href;
}

function normalizeEditable(input: EditableNavigationItem | NewNavigationItem) {
    const label = bounded(input.label, 80, 'Label');
    if (!label) throw new Error('Navigation label is required.');
    const isDropdown = input.itemType === 'dropdown';
    const isExternal = !isDropdown && Boolean(input.isExternal);
    const requestedStyle = String(input.dropdownStyle || 'auto').trim().toLowerCase();
    return {
        label,
        href: normalizeHref(input.href, isExternal, isDropdown),
        parentId: input.parentId || null,
        location: 'primary',
        isVisible: Boolean(input.isVisible),
        isExternal,
        isDropdown,
        dropdownStyle: isDropdown && DROPDOWN_STYLES.has(requestedStyle) ? requestedStyle : 'auto',
    };
}

function refreshNavigation() {
    revalidatePath('/admin/navigation');
    revalidatePath('/', 'layout');
}

function resultError(error: unknown) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Navigation operation failed.' };
}

function serializeItem(item: {
    id: string;
    label: string;
    href: string;
    parentId: string | null;
    sortOrder: number;
    isVisible: boolean;
    isExternal: boolean;
    isDropdown: boolean;
    dropdownStyle: string;
}) {
    return {
        id: item.id,
        label: item.label,
        href: item.href,
        parentId: item.parentId,
        sortOrder: item.sortOrder,
        isVisible: item.isVisible,
        isExternal: item.isExternal,
        isDropdown: item.isDropdown,
        dropdownStyle: item.dropdownStyle,
    };
}

export async function saveNavigationItems(updates: EditableNavigationItem[]) {
    try {
        await requireAdmin();
        if (!Array.isArray(updates) || updates.length > 100) throw new Error('Invalid navigation update payload.');

        const current = await prisma.navigationItem.findMany();
        const currentMap = new Map(current.map((item) => [item.id, item]));
        const proposed = new Map(current.map((item) => [item.id, {
            ...item,
            itemType: item.isDropdown ? 'dropdown' as const : 'link' as const,
        }]));

        for (const update of updates) {
            if (!currentMap.has(update.id)) throw new Error('A navigation item no longer exists. Refresh and try again.');
            const normalized = normalizeEditable(update);
            proposed.set(update.id, {
                ...proposed.get(update.id)!,
                ...normalized,
                itemType: normalized.isDropdown ? 'dropdown' : 'link',
            });
        }

        for (const item of proposed.values()) {
            if (item.parentId === item.id) throw new Error('A menu item cannot be its own parent.');
            if (item.parentId) {
                const parent = proposed.get(item.parentId);
                if (!parent) throw new Error('Selected parent menu no longer exists.');
                if (parent.parentId) throw new Error('Only one submenu level is supported.');
                if (!parent.isDropdown) throw new Error(`Submenu items can only be attached to a dropdown menu (${parent.label}).`);
                if (item.isDropdown) throw new Error('Dropdown menus must be top-level.');
            }
        }

        const childCounts = new Map<string, number>();
        for (const item of proposed.values()) {
            if (item.parentId) childCounts.set(item.parentId, (childCounts.get(item.parentId) || 0) + 1);
        }
        for (const [id, count] of childCounts) {
            const parent = proposed.get(id);
            if (count > 0 && parent && (!parent.isDropdown || parent.parentId)) {
                throw new Error(`Menu ${parent.label} must remain a top-level dropdown while it has submenu items.`);
            }
        }

        await prisma.$transaction(updates.map((update) => {
            const normalized = normalizeEditable(update);
            return prisma.navigationItem.update({ where: { id: update.id }, data: normalized });
        }));
        refreshNavigation();
        return { ok: true as const };
    } catch (error) {
        return resultError(error);
    }
}

export async function reorderNavigationItems(parentId: string | null, orderedIds: string[]) {
    try {
        await requireAdmin();
        if (!Array.isArray(orderedIds) || orderedIds.length > 100 || new Set(orderedIds).size !== orderedIds.length) {
            throw new Error('Invalid navigation order.');
        }
        const siblings = await prisma.navigationItem.findMany({
            where: { parentId: parentId || null },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: { id: true },
        });
        const actualIds = siblings.map((item) => item.id);
        if (actualIds.length !== orderedIds.length || actualIds.some((id) => !orderedIds.includes(id))) {
            throw new Error('Navigation changed on the server. Refresh and try again.');
        }
        await prisma.$transaction(orderedIds.map((id, index) => prisma.navigationItem.update({
            where: { id },
            data: { sortOrder: (index + 1) * 10 },
        })));
        refreshNavigation();
        return { ok: true as const };
    } catch (error) {
        return resultError(error);
    }
}

export async function createNavigationItemAjax(input: NewNavigationItem) {
    try {
        await requireAdmin();
        const data = normalizeEditable(input);
        if (data.parentId) {
            const parent = await prisma.navigationItem.findUnique({ where: { id: data.parentId } });
            if (!parent || parent.parentId || !parent.isDropdown) throw new Error('Choose a valid top-level dropdown parent.');
            if (data.isDropdown) throw new Error('Dropdown menus must be top-level.');
        }
        const siblingMax = await prisma.navigationItem.aggregate({
            where: { parentId: data.parentId },
            _max: { sortOrder: true },
        });
        const created = await prisma.navigationItem.create({
            data: { ...data, sortOrder: (siblingMax._max.sortOrder || 0) + 10 },
        });
        refreshNavigation();
        return { ok: true as const, item: serializeItem(created) };
    } catch (error) {
        return resultError(error);
    }
}

export async function deleteNavigationItemAjax(id: string) {
    try {
        await requireAdmin();
        const item = await prisma.navigationItem.findUnique({ where: { id }, include: { children: { select: { id: true } } } });
        if (!item) throw new Error('Navigation item not found.');
        if (item.children.length) throw new Error('Delete or move submenu items before deleting this dropdown.');
        await prisma.navigationItem.delete({ where: { id } });
        refreshNavigation();
        return { ok: true as const };
    } catch (error) {
        return resultError(error);
    }
}

export async function seedDefaultNavigationAjax() {
    try {
        await requireAdmin();
        const count = await prisma.navigationItem.count();
        if (count !== 0) throw new Error('Navigation already contains items.');
        await prisma.$transaction(async (tx) => {
            await tx.navigationItem.create({ data: { label: 'Home', href: '/', sortOrder: 10 } });
            const about = await tx.navigationItem.create({ data: { label: 'About', href: '#', sortOrder: 20, isDropdown: true, dropdownStyle: 'auto' } });
            for (const [label, href, sortOrder] of [
                ['Lab', '/lab', 20],
                ['Journey', '/journey', 30],
                ['Projects', '/projects', 40],
                ['Blog', '/blog', 50],
            ] as const) {
                await tx.navigationItem.create({ data: { label, href, sortOrder, parentId: about.id } });
            }
            await tx.navigationItem.create({ data: { label: 'Store', href: '/store', sortOrder: 25 } });
            await tx.navigationItem.create({ data: { label: 'Contact', href: '/contact', sortOrder: 30 } });
        });
        refreshNavigation();
        const items = await prisma.navigationItem.findMany({ orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
        return { ok: true as const, items: items.map(serializeItem) };
    } catch (error) {
        return resultError(error);
    }
}
