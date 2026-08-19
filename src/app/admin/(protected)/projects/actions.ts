'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    csvToList,
    normalizeProjectMediaUrl,
    normalizeProjectUrl,
    safeProjectContent,
} from '@/lib/cms-projects';

const PROJECT_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED', 'ARCHIVED'] as const;
type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

function text(value: FormDataEntryValue | null, max: number, field: string, required = false) {
    const result = String(value ?? '').trim();
    if (required && !result) throw new Error(`${field} is required.`);
    if (result.length > max) throw new Error(`${field} is too long.`);
    return result;
}

function readProjectForm(formData: FormData) {
    const title = text(formData.get('title'), 160, 'Title', true);
    const slug = text(formData.get('slug'), 120, 'Slug', true).toLowerCase();
    const description = text(formData.get('description'), 500, 'Description', true);
    const longDescription = text(formData.get('longDescription'), 10_000, 'Long description') || null;
    const rawStatus = String(formData.get('status') ?? 'PLANNED');
    if (!PROJECT_STATUSES.includes(rawStatus as ProjectStatusValue)) throw new Error('Invalid project status.');
    const status = rawStatus as ProjectStatusValue;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error('Slug must use kebab-case letters, numbers and hyphens only.');
    }

    const content = safeProjectContent(formData.get('content'));
    const imageUrl = normalizeProjectMediaUrl(formData.get('imageUrl'));
    if (imageUrl) content.image = imageUrl;
    else delete content.image;

    const rawSortOrder = Number(formData.get('sortOrder') ?? 0);
    const sortOrder = Number.isFinite(rawSortOrder) ? Math.max(-10_000, Math.min(10_000, Math.trunc(rawSortOrder))) : 0;

    return {
        title,
        slug,
        description,
        longDescription,
        status,
        category: text(formData.get('category'), 120, 'Category') || null,
        technologies: csvToList(formData.get('technologies')),
        tools: csvToList(formData.get('tools')),
        highlights: csvToList(formData.get('highlights')),
        repoUrl: normalizeProjectUrl(formData.get('repoUrl')),
        demoUrl: normalizeProjectUrl(formData.get('demoUrl')),
        role: text(formData.get('role'), 160, 'Role') || null,
        timeline: text(formData.get('timeline'), 240, 'Timeline') || null,
        team: text(formData.get('team'), 240, 'Team') || null,
        sortOrder,
        seoTitle: text(formData.get('seoTitle'), 180, 'SEO title') || null,
        seoDescription: text(formData.get('seoDescription'), 320, 'SEO description') || null,
        content,
        publishedAt: status === 'COMPLETED' || status === 'ONGOING' ? new Date() : null,
    };
}

export async function createProject(formData: FormData) {
    await requireEditor();
    const data = readProjectForm(formData);
    const project = await prisma.project.create({ data });
    revalidatePath('/admin/projects');
    revalidatePath('/projects');
    redirect(`/admin/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
    const user = await requireEditor();
    const current = await prisma.project.findUnique({ where: { id: projectId } });
    if (!current) throw new Error('Project not found.');

    await prisma.$transaction(async (tx) => {
        await tx.revision.create({
            data: {
                entityType: 'project',
                entityId: current.id,
                projectId: current.id,
                createdBy: user.id,
                snapshot: JSON.parse(JSON.stringify(current)),
                note: 'Snapshot before project update',
            },
        });
        await tx.project.update({ where: { id: projectId }, data: readProjectForm(formData) });
    });

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath('/projects');
    revalidatePath(`/projects/${current.slug}`);
}

export async function deleteProject(projectId: string) {
    const user = await requireEditor();
    if (user.role === 'EDITOR') throw new Error('Editors cannot delete projects.');

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath('/admin/projects');
    revalidatePath('/projects');
    redirect('/admin/projects');
}
