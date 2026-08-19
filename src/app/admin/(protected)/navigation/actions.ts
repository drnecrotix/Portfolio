'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
        throw new Error('Insufficient permissions');
    }
    return session.user;
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
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
            throw new Error('External navigation URLs must use HTTP or HTTPS without embedded credentials.');
        }
        return parsed.toString();
    }

    if (!href.startsWith('/') || href.startsWith('//')) {
        throw new Error('Internal navigation URLs must start with a single /.');
    }
    return href;
}

function read(form: FormData) {
    const label = bounded(form.get('label'), 80, 'Label');
    if (!label) throw new Error('Navigation label is required.');

    const location = bounded(form.get('location') || 'primary', 32, 'Location').toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(location)) throw new Error('Navigation location is invalid.');

    const rawSortOrder = Number(form.get('sortOrder') || 0);
    if (!Number.isInteger(rawSortOrder) || rawSortOrder < -10000 || rawSortOrder > 10000) {
        throw new Error('Sort order must be an integer between -10000 and 10000.');
    }

    const isExternal = form.get('isExternal') === 'on';
    return {
        label,
        href: normalizeHref(form.get('href'), isExternal),
        location,
        sortOrder: rawSortOrder,
        isVisible: form.get('isVisible') === 'on',
        isExternal,
    };
}

export async function createNavigationItem(form: FormData) {
    await requireAdmin();
    await prisma.navigationItem.create({ data: read(form) });
    revalidatePath('/admin/navigation');
    revalidatePath('/');
}

export async function updateNavigationItem(id: string, form: FormData) {
    await requireAdmin();
    const item = await prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new Error('Navigation item not found.');
    await prisma.navigationItem.update({ where: { id }, data: read(form) });
    revalidatePath('/admin/navigation');
    revalidatePath('/');
}

export async function deleteNavigationItem(id: string) {
    await requireAdmin();
    const item = await prisma.navigationItem.findUnique({ where: { id } });
    if (!item) return;
    await prisma.navigationItem.delete({ where: { id } });
    revalidatePath('/admin/navigation');
    revalidatePath('/');
}

export async function seedDefaultNavigation() {
    await requireAdmin();
    const defaults = [
        ['Home', '/', 'primary', 0],
        ['Achievements', '/achievements', 'about', 10],
        ['Skills', '/skills', 'about', 20],
        ['Experience', '/experience', 'about', 30],
        ['Projects', '/projects', 'about', 40],
        ['Blog', '/blog', 'about', 50],
        ['Contact', '/contact', 'primary', 100],
    ] as const;

    if (await prisma.navigationItem.count()) return;
    await prisma.navigationItem.createMany({
        data: defaults.map(([label, href, location, sortOrder]) => ({ label, href, location, sortOrder })),
    });
    revalidatePath('/admin/navigation');
    revalidatePath('/');
}
