'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ContentStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formToPageContent } from '@/lib/cms-pages';

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    return session.user;
}

function fields(form: FormData) {
    return {
        slug: String(form.get('slug') ?? '').trim(),
        title: String(form.get('title') ?? '').trim(),
        status: String(form.get('status') ?? 'DRAFT') as ContentStatus,
        content: formToPageContent(form.get('content')),
        seoTitle: String(form.get('seoTitle') ?? '').trim() || null,
        seoDescription: String(form.get('seoDescription') ?? '').trim() || null,
    };
}

export async function createPage(form: FormData) {
    await requireEditor();
    const page = await prisma.page.create({ data: fields(form) });
    revalidatePath(`/pages/${page.slug}`);
    redirect(`/admin/pages/${page.id}`);
}

export async function updatePage(id: string, form: FormData) {
    const user = await requireEditor();
    const current = await prisma.page.findUnique({ where: { id } });
    if (!current) throw new Error('Page not found');

    await prisma.revision.create({
        data: {
            entityType: 'page',
            entityId: current.id,
            pageId: current.id,
            snapshot: current as never,
            createdBy: user.id,
        },
    });

    const data = fields(form);
    await prisma.page.update({ where: { id }, data });
    revalidatePath(`/pages/${current.slug}`);
    revalidatePath(`/pages/${data.slug}`);
    revalidatePath('/admin/pages');
}

export async function deletePage(id: string) {
    const user = await requireEditor();
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw new Error('Insufficient permissions');
    await prisma.page.delete({ where: { id } });
    redirect('/admin/pages');
}
