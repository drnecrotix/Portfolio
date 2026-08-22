'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ContentStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { csvToList, parsePostContent } from '@/lib/cms-posts';

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

function parseDate(value: FormDataEntryValue | null, field: string) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new Error(`${field} is invalid.`);
    return date;
}

function revalidateBlogDiscovery() {
    revalidatePath('/blog');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');
}

async function fields(form: FormData) {
    const rawStatus = String(form.get('status') || 'DRAFT');
    if (!contentStatuses.has(rawStatus as ContentStatus)) throw new Error('Invalid publication status.');
    const status = rawStatus as ContentStatus;

    const slug = boundedText(form.get('slug'), 120, 'Slug', true).toLowerCase();
    if (!slugPattern.test(slug)) throw new Error('Slug must use lowercase kebab-case.');

    const postTypeId = boundedText(form.get('postTypeId'), 191, 'Post type', true);
    const categoryId = boundedText(form.get('categoryId'), 191, 'Category') || null;
    const [postType, category] = await Promise.all([
        prisma.blogPostType.findUnique({ where: { id: postTypeId } }),
        categoryId ? prisma.blogCategory.findUnique({ where: { id: categoryId } }) : Promise.resolve(null),
    ]);
    if (!postType || !postType.isActive) throw new Error('Selected post type is unavailable.');
    if (categoryId && (!category || !category.isActive)) throw new Error('Selected category is unavailable.');

    const tags = csvToList(form.get('tags')).slice(0, 30).map((tag) => tag.slice(0, 50));
    const publishedAt = parseDate(form.get('publishedAt'), 'Published date');
    const scheduledAt = parseDate(form.get('scheduledAt'), 'Scheduled date');

    return {
        slug,
        title: boundedText(form.get('title'), 180, 'Title', true),
        excerpt: boundedText(form.get('excerpt'), 500, 'Excerpt') || null,
        type: postType.editorMode,
        postTypeId: postType.id,
        status,
        category: category?.name ?? null,
        categoryId: category?.id ?? null,
        tags,
        authorName: boundedText(form.get('authorName'), 120, 'Author name', true),
        seoTitle: boundedText(form.get('seoTitle'), 180, 'SEO title') || null,
        seoDescription: boundedText(form.get('seoDescription'), 500, 'SEO description') || null,
        publishedAt,
        scheduledAt,
        content: parsePostContent(postType.editorMode, form.get('content'), form.get('featuredImage')),
    };
}

export async function createPost(form: FormData) {
    await requireEditor();
    const post = await prisma.post.create({ data: await fields(form) });
    revalidateBlogDiscovery();
    revalidatePath('/admin/blog');
    return { ok: true as const, id: post.id, created: true as const, savedAt: new Date().toISOString() };
}

export async function updatePost(id: string, form: FormData) {
    const user = await requireEditor();
    const current = await prisma.post.findUnique({ where: { id } });
    if (!current) throw new Error('Post not found');

    const snapshot = JSON.parse(JSON.stringify(current));
    const nextFields = await fields(form);
    await prisma.$transaction(async (tx) => {
        await tx.revision.create({
            data: {
                entityType: 'post',
                entityId: current.id,
                postId: current.id,
                snapshot,
                createdBy: user.id,
            },
        });
        await tx.post.update({ where: { id }, data: nextFields });
    });

    revalidateBlogDiscovery();
    revalidatePath('/admin/blog');
    revalidatePath(`/blog/${current.slug}`);
    if (current.slug !== nextFields.slug) revalidatePath(`/blog/${nextFields.slug}`);

    return { ok: true as const, id, created: false as const, savedAt: new Date().toISOString() };
}

export async function deletePost(id: string) {
    const user = await requireEditor();
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') throw new Error('Insufficient permissions');
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return;
    await prisma.post.delete({ where: { id } });
    revalidateBlogDiscovery();
    redirect('/admin/blog');
}
