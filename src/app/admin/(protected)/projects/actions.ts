'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { csvToList, safeProjectContent } from '@/lib/cms-projects';

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

function readProjectForm(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
    const description = String(formData.get('description') ?? '').trim();
    const longDescription = String(formData.get('longDescription') ?? '').trim() || null;
    const status = String(formData.get('status') ?? 'PLANNED') as 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';

    if (!title || !description || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error('Title, description and a valid kebab-case slug are required.');
    }

    return {
        title,
        slug,
        description,
        longDescription,
        status,
        category: String(formData.get('category') ?? '').trim() || null,
        technologies: csvToList(formData.get('technologies')),
        tools: csvToList(formData.get('tools')),
        highlights: csvToList(formData.get('highlights')),
        repoUrl: String(formData.get('repoUrl') ?? '').trim() || null,
        demoUrl: String(formData.get('demoUrl') ?? '').trim() || null,
        role: String(formData.get('role') ?? '').trim() || null,
        timeline: String(formData.get('timeline') ?? '').trim() || null,
        team: String(formData.get('team') ?? '').trim() || null,
        sortOrder: Number(formData.get('sortOrder') ?? 0) || 0,
        seoTitle: String(formData.get('seoTitle') ?? '').trim() || null,
        seoDescription: String(formData.get('seoDescription') ?? '').trim() || null,
        content: safeProjectContent(formData.get('content')),
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
