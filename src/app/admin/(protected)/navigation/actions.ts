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

function read(form: FormData) {
    return {
        label: String(form.get('label') || '').trim(),
        href: String(form.get('href') || '').trim(),
        location: String(form.get('location') || 'primary').trim().toLowerCase(),
        sortOrder: Number(form.get('sortOrder') || 0),
        isVisible: form.get('isVisible') === 'on',
        isExternal: form.get('isExternal') === 'on',
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
    await prisma.navigationItem.update({ where: { id }, data: read(form) });
    revalidatePath('/admin/navigation');
    revalidatePath('/');
}

export async function deleteNavigationItem(id: string) {
    await requireAdmin();
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
