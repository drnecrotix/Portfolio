'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PostType } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const editorModes = new Set<PostType>(['ARTICLE', 'POETRY', 'THOUGHT', 'NOTE', 'PROJECT_LOG']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function bounded(value: FormDataEntryValue | null, max: number, label: string, required = false) {
    const text = String(value ?? '').trim();
    if (required && !text) throw new Error(`${label} is required.`);
    if (text.length > max) throw new Error(`${label} is too long.`);
    return text;
}

function slug(value: FormDataEntryValue | null) {
    const result = bounded(value, 80, 'Slug', true).toLowerCase();
    if (!slugPattern.test(result)) throw new Error('Slug must use lowercase kebab-case.');
    return result;
}

function order(value: FormDataEntryValue | null) {
    const result = Number(value || 0);
    if (!Number.isInteger(result) || result < -10000 || result > 10000) throw new Error('Order must be an integer between -10000 and 10000.');
    return result;
}

function done(kind: string, error?: unknown): never {
    const query = error ? `error=${encodeURIComponent(error instanceof Error ? error.message : 'Taxonomy operation failed.')}` : `saved=${kind}`;
    redirect(`/admin/blog/taxonomies?${query}`);
}

export async function createBlogType(form: FormData) {
    try {
        await requireAdmin();
        const editorMode = String(form.get('editorMode') || 'ARTICLE') as PostType;
        if (!editorModes.has(editorMode)) throw new Error('Invalid editor mode.');
        await prisma.blogPostType.create({ data: {
            name: bounded(form.get('name'), 80, 'Type name', true),
            slug: slug(form.get('slug')),
            description: bounded(form.get('description'), 500, 'Description') || null,
            editorMode,
            sortOrder: order(form.get('sortOrder')),
            isActive: form.get('isActive') === 'on',
        } });
        revalidatePath('/admin/blog'); revalidatePath('/admin/blog/new'); revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('type-created', error); }
    done('type-created');
}

export async function updateBlogType(id: string, form: FormData) {
    try {
        await requireAdmin();
        const editorMode = String(form.get('editorMode') || 'ARTICLE') as PostType;
        if (!editorModes.has(editorMode)) throw new Error('Invalid editor mode.');
        const current = await prisma.blogPostType.findUnique({ where: { id }, include: { _count: { select: { posts: true } } } });
        if (!current) throw new Error('Post type not found.');
        if (current.editorMode !== editorMode && current._count.posts > 0) {
            throw new Error(`Editor mode cannot be changed while this type is used by ${current._count.posts} post(s). Reassign those posts first.`);
        }
        const data = {
            name: bounded(form.get('name'), 80, 'Type name', true),
            slug: slug(form.get('slug')),
            description: bounded(form.get('description'), 500, 'Description') || null,
            editorMode,
            sortOrder: order(form.get('sortOrder')),
            isActive: form.get('isActive') === 'on',
        };
        await prisma.blogPostType.update({ where: { id }, data });
        revalidatePath('/blog'); revalidatePath('/admin/blog'); revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('type-updated', error); }
    done('type-updated');
}

export async function deleteBlogType(id: string) {
    try {
        await requireAdmin();
        const count = await prisma.post.count({ where: { postTypeId: id } });
        if (count) throw new Error(`This type is used by ${count} post(s). Reassign them before deleting it.`);
        await prisma.blogPostType.delete({ where: { id } });
        revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('type-removed', error); }
    done('type-removed');
}

export async function createBlogCategory(form: FormData) {
    try {
        await requireAdmin();
        await prisma.blogCategory.create({ data: {
            name: bounded(form.get('name'), 80, 'Category name', true),
            slug: slug(form.get('slug')),
            description: bounded(form.get('description'), 500, 'Description') || null,
            sortOrder: order(form.get('sortOrder')),
            isActive: form.get('isActive') === 'on',
        } });
        revalidatePath('/admin/blog'); revalidatePath('/admin/blog/new'); revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('category-created', error); }
    done('category-created');
}

export async function updateBlogCategory(id: string, form: FormData) {
    try {
        await requireAdmin();
        const data = {
            name: bounded(form.get('name'), 80, 'Category name', true),
            slug: slug(form.get('slug')),
            description: bounded(form.get('description'), 500, 'Description') || null,
            sortOrder: order(form.get('sortOrder')),
            isActive: form.get('isActive') === 'on',
        };
        await prisma.$transaction(async (tx) => {
            await tx.blogCategory.update({ where: { id }, data });
            await tx.post.updateMany({ where: { categoryId: id }, data: { category: data.name } });
        });
        revalidatePath('/blog'); revalidatePath('/admin/blog'); revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('category-updated', error); }
    done('category-updated');
}

export async function deleteBlogCategory(id: string) {
    try {
        await requireAdmin();
        const count = await prisma.post.count({ where: { categoryId: id } });
        if (count) throw new Error(`This category is used by ${count} post(s). Reassign them before deleting it.`);
        await prisma.blogCategory.delete({ where: { id } });
        revalidatePath('/admin/blog/taxonomies');
    } catch (error) { done('category-removed', error); }
    done('category-removed');
}
