'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ContentStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { formToPageContent } from '@/lib/cms-pages';

const contentStatuses = new Set<ContentStatus>(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

function boundedText(value: FormDataEntryValue | null, max: number, field: string, required = false) {
    const text = String(value ?? '').trim();
    if (required && !text) throw new Error(`${field} is required.`);
    if (text.length > max) throw new Error(`${field} is too long.`);
    return text;
}

function fields(form: FormData) {
    const rawStatus = String(form.get('status') ?? 'DRAFT');
    if (!contentStatuses.has(rawStatus as ContentStatus)) throw new Error('Invalid page status.');

    const slug = boundedText(form.get('slug'), 120, 'Slug', true).toLowerCase();
    if (!slugPattern.test(slug)) throw new Error('Slug must use lowercase kebab-case.');

    return {
        slug,
        title: boundedText(form.get('title'), 180, 'Title', true),
        status: rawStatus as ContentStatus,
        content: formToPageContent(form.get('content'), form.get('featuredImage')),
        seoTitle: boundedText(form.get('seoTitle'), 180, 'SEO title') || null,
        seoDescription: boundedText(form.get('seoDescription'), 500, 'SEO description') || null,
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

    const data = fields(form);
    await prisma.$transaction(async (tx) => {
        await tx.revision.create({
            data: {
                entityType: 'page',
                entityId: current.id,
                pageId: current.id,
                snapshot: JSON.parse(JSON.stringify(current)),
                createdBy: user.id,
            },
        });
        await tx.page.update({ where: { id }, data });
    });

    revalidatePath(`/pages/${current.slug}`);
    revalidatePath(`/pages/${data.slug}`);
    revalidatePath('/admin/pages');
}

export async function deletePage(id: string) {
    const user = await requireEditor();
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw new Error('Insufficient permissions');
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return;
    await prisma.page.delete({ where: { id } });
    revalidatePath(`/pages/${page.slug}`);
    redirect('/admin/pages');
}
