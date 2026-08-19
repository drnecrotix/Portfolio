'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        throw new Error('Forbidden');
    }
    return session.user;
}

function normalizeSource(value: FormDataEntryValue | null) {
    let source = String(value ?? '').trim();
    if (!source.startsWith('/')) source = `/${source}`;
    source = source.replace(/\/+/g, '/');
    if (source.length > 1 && source.endsWith('/')) source = source.slice(0, -1);

    if (
        !source ||
        source.startsWith('/admin') ||
        source.startsWith('/api') ||
        source.startsWith('/_next') ||
        source === '/site-status'
    ) {
        throw new Error('This source path cannot be redirected.');
    }
    return source;
}

function normalizeTarget(value: FormDataEntryValue | null) {
    const target = String(value ?? '').trim();
    if (!target) throw new Error('Redirect target is required.');

    if (target.startsWith('/')) return target;

    const parsed = new URL(target);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only internal paths and http/https targets are allowed.');
    }
    return parsed.toString();
}

function fields(formData: FormData) {
    const source = normalizeSource(formData.get('source'));
    const target = normalizeTarget(formData.get('target'));
    if (source === target) throw new Error('Source and target cannot be identical.');

    return {
        source,
        target,
        permanent: formData.get('permanent') === 'on',
    };
}

export async function createRedirect(formData: FormData) {
    await requireAdmin();
    await prisma.redirect.create({ data: fields(formData) });
    revalidatePath('/admin/redirects');
}

export async function updateRedirect(id: string, formData: FormData) {
    await requireAdmin();
    await prisma.redirect.update({ where: { id }, data: fields(formData) });
    revalidatePath('/admin/redirects');
}

export async function deleteRedirect(id: string) {
    await requireAdmin();
    await prisma.redirect.delete({ where: { id } });
    revalidatePath('/admin/redirects');
}
