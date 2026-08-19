'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ContentStatus, PostType } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { csvToList, parsePostContent } from '@/lib/cms-posts';

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    return session.user;
}

function parseDate(value: FormDataEntryValue | null) {
    const raw = String(value ?? '').trim();
    return raw ? new Date(raw) : null;
}

function fields(form: FormData) {
    const type = String(form.get('type') || 'ARTICLE') as PostType;
    const status = String(form.get('status') || 'DRAFT') as ContentStatus;
    return {
        slug: String(form.get('slug') || '').trim(),
        title: String(form.get('title') || '').trim(),
        excerpt: String(form.get('excerpt') || '').trim() || null,
        type,
        status,
        category: String(form.get('category') || '').trim() || null,
        tags: csvToList(form.get('tags')),
        authorName: String(form.get('authorName') || '').trim(),
        seoTitle: String(form.get('seoTitle') || '').trim() || null,
        seoDescription: String(form.get('seoDescription') || '').trim() || null,
        publishedAt: parseDate(form.get('publishedAt')),
        scheduledAt: parseDate(form.get('scheduledAt')),
        content: parsePostContent(type, form.get('content'), form.get('featuredImage')),
    };
}

export async function createPost(form: FormData) {
    await requireEditor();
    const post = await prisma.post.create({ data: fields(form) });
    revalidatePath('/blog');
    redirect(`/admin/blog/${post.id}`);
}

export async function updatePost(id: string, form: FormData) {
    const user = await requireEditor();
    const current = await prisma.post.findUnique({ where: { id } });
    if (!current) throw new Error('Post not found');

    const snapshot = JSON.parse(JSON.stringify(current));
    await prisma.revision.create({
        data: {
            entityType: 'post',
            entityId: current.id,
            postId: current.id,
            snapshot,
            createdBy: user.id,
        },
    });

    await prisma.post.update({ where: { id }, data: fields(form) });
    revalidatePath('/blog');
    revalidatePath(`/blog/${current.slug}`);
    revalidatePath(`/admin/blog/${id}`);
}

export async function deletePost(id: string) {
    const user = await requireEditor();
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw new Error('Insufficient permissions');
    await prisma.post.delete({ where: { id } });
    revalidatePath('/blog');
    redirect('/admin/blog');
}
