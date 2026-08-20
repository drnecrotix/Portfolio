'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function bounded(value: FormDataEntryValue | null, max: number, label: string) {
    const result = String(value ?? '').trim();
    if (result.length > max) throw new Error(`${label} is too long.`);
    return result;
}

function normalizeHref(value: FormDataEntryValue | null, isExternal: boolean) {
    const href = bounded(value, 2048, 'Navigation URL');
    if (!href || /[\u0000-\u001f\u007f]/.test(href)) throw new Error('A valid navigation URL is required.');
    if (isExternal) {
        const parsed = new URL(href);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('External navigation URLs must use HTTP or HTTPS.');
        return parsed.toString();
    }
    if (!href.startsWith('/') || href.startsWith('//')) throw new Error('Internal navigation URLs must start with a single /.');
    return href;
}

function readBase(form: FormData) {
    const label = bounded(form.get('label'), 80, 'Label');
    if (!label) throw new Error('Navigation label is required.');
    const sortOrder = Number(form.get('sortOrder') || 0);
    if (!Number.isInteger(sortOrder) || sortOrder < -10000 || sortOrder > 10000) throw new Error('Sort order must be an integer between -10000 and 10000.');
    const isExternal = form.get('isExternal') === 'on';
    return { label, href: normalizeHref(form.get('href'), isExternal), location: 'primary', sortOrder, isVisible: form.get('isVisible') === 'on', isExternal };
}

async function parentIdFrom(form: FormData, currentId?: string) {
    const parentId = String(form.get('parentId') || '').trim() || null;
    if (!parentId) return null;
    if (parentId === currentId) throw new Error('A menu item cannot be its own parent.');
    const parent = await prisma.navigationItem.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
    if (!parent) throw new Error('Selected parent menu no longer exists.');
    if (parent.parentId) throw new Error('Only one submenu level is supported. Choose a top-level parent.');
    return parent.id;
}

function done(kind: string, error?: unknown): never {
    const query = error ? `error=${encodeURIComponent(error instanceof Error ? error.message : 'Navigation operation failed.')}` : `saved=${kind}`;
    redirect(`/admin/navigation?${query}`);
}

export async function createNavigationItem(form: FormData) {
    try {
        await requireAdmin();
        const parentId = await parentIdFrom(form);
        await prisma.navigationItem.create({ data: { ...readBase(form), parentId } });
        revalidatePath('/admin/navigation'); revalidatePath('/', 'layout');
    } catch (error) { done('created', error); }
    done('created');
}

export async function updateNavigationItem(id: string, form: FormData) {
    try {
        await requireAdmin();
        const item = await prisma.navigationItem.findUnique({ where: { id }, include: { children: { select: { id: true } } } });
        if (!item) throw new Error('Navigation item not found.');
        const parentId = await parentIdFrom(form, id);
        if (parentId && item.children.length) throw new Error('A menu with submenu items cannot itself become a submenu item.');
        await prisma.navigationItem.update({ where: { id }, data: { ...readBase(form), parentId } });
        revalidatePath('/admin/navigation'); revalidatePath('/', 'layout');
    } catch (error) { done('updated', error); }
    done('updated');
}

export async function deleteNavigationItem(id: string) {
    try {
        await requireAdmin();
        await prisma.navigationItem.delete({ where: { id } });
        revalidatePath('/admin/navigation'); revalidatePath('/', 'layout');
    } catch (error) { done('removed', error); }
    done('removed');
}

export async function seedDefaultNavigation() {
    try {
        await requireAdmin();
        const count = await prisma.navigationItem.count();
        if (count === 0) {
            await prisma.$transaction(async (tx) => {
                await tx.navigationItem.create({ data: { label: 'Home', href: '/', sortOrder: 0 } });
                const about = await tx.navigationItem.create({ data: { label: 'About', href: '/about', sortOrder: 50 } });
                for (const [label, href, sortOrder] of [
                    ['Achievements', '/achievements', 10], ['Skills', '/skills', 20], ['Experience', '/experience', 30], ['Projects', '/projects', 40], ['Blog', '/blog', 50],
                ] as const) await tx.navigationItem.create({ data: { label, href, sortOrder, parentId: about.id } });
                await tx.navigationItem.create({ data: { label: 'Contact', href: '/contact', sortOrder: 100 } });
            });
            revalidatePath('/admin/navigation'); revalidatePath('/', 'layout');
        }
    } catch (error) { done('seeded', error); }
    done('seeded');
}
