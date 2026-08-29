'use server';

import { Prisma } from '@prisma/client';
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

export type ProjectSaveResult =
    | {
        ok: true;
        id: string;
        created: boolean;
        savedAt: string;
    }
    | {
        ok: false;
        error: string;
        field?: string;
    };

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

function readCategory(formData: FormData) {
    const selected = text(formData.get('category'), 120, 'Category');
    if (selected !== '__new__') return selected || null;
    return text(formData.get('newCategory'), 120, 'New category', true);
}

function revalidateProjectDiscovery() {
    revalidatePath('/projects');
    revalidatePath('/sitemap.xml');
    revalidatePath('/rss.xml');
}

function readProjectForm(formData: FormData) {
    const title = text(formData.get('title'), 160, 'Title', true);
    const slug = text(formData.get('slug'), 120, 'Slug', true).toLowerCase();
    const description = text(formData.get('description'), 500, 'Description', true);
    const longDescription = text(formData.get('longDescription'), 50_000, 'Long description') || null;
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

    const downloadUrl = normalizeProjectUrl(formData.get('downloadUrl'));
    if (downloadUrl) content.downloadUrl = downloadUrl;
    else delete content.downloadUrl;

    const rawSortOrder = Number(formData.get('sortOrder') ?? 0);
    const sortOrder = Number.isFinite(rawSortOrder) ? Math.max(-10_000, Math.min(10_000, Math.trunc(rawSortOrder))) : 0;

    return {
        title,
        slug,
        description,
        longDescription,
        status,
        category: readCategory(formData),
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

function safeSaveError(error: unknown): ProjectSaveResult {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta?.target) ? error.meta?.target.map(String) : [];
            if (target.includes('slug')) {
                return { ok: false, field: 'slug', error: 'A project with this slug already exists. Choose a different slug.' };
            }
            return { ok: false, error: 'A project with the same unique value already exists.' };
        }
    }

    if (error instanceof SyntaxError) {
        return { ok: false, field: 'content', error: 'Advanced content JSON is invalid. Check the JSON syntax and try again.' };
    }

    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        return { ok: false, error: 'One of the project URLs is invalid. Use a complete http:// or https:// URL.' };
    }

    if (error instanceof Error) {
        const safeMessages = [
            / is required\.$/,
            / is too long\.$/,
            /^Slug must use /,
            /^Invalid project status\.$/,
            /^Project URL is too long\.$/,
            /^Project URLs must use /,
            /^Project content JSON is too large\.$/,
            /^Project content must be a JSON object\.$/,
            /^Gallery images must be an array\.$/,
            /^Project not found\.$/,
            /^Unauthorized$/,
            /^Forbidden$/,
        ];
        if (safeMessages.some((pattern) => pattern.test(error.message))) {
            return { ok: false, error: error.message };
        }
    }

    console.error('[Projects] Save failed:', error);
    return { ok: false, error: 'Project could not be saved. Please try again. If the problem continues, check the server logs for the detailed error.' };
}

export async function createProject(formData: FormData): Promise<ProjectSaveResult> {
    try {
        await requireEditor();
        const data = readProjectForm(formData);
        const project = await prisma.project.create({ data });
        revalidatePath('/admin/projects');
        revalidateProjectDiscovery();
        return { ok: true, id: project.id, created: true, savedAt: new Date().toISOString() };
    } catch (error) {
        return safeSaveError(error);
    }
}

export async function updateProject(projectId: string, formData: FormData): Promise<ProjectSaveResult> {
    try {
        const user = await requireEditor();
        const current = await prisma.project.findUnique({ where: { id: projectId } });
        if (!current) throw new Error('Project not found.');
        const nextData = readProjectForm(formData);

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
            await tx.project.update({ where: { id: projectId }, data: nextData });
        });

        revalidatePath('/admin/projects');
        revalidatePath(`/admin/projects/${projectId}`);
        revalidateProjectDiscovery();
        revalidatePath(`/projects/${current.slug}`);
        if (current.slug !== nextData.slug) revalidatePath(`/projects/${nextData.slug}`);
        return { ok: true, id: projectId, created: false, savedAt: new Date().toISOString() };
    } catch (error) {
        return safeSaveError(error);
    }
}

export async function deleteProject(projectId: string) {
    const user = await requireEditor();
    if (user.role === 'EDITOR') throw new Error('Editors cannot delete projects.');

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath('/admin/projects');
    revalidateProjectDiscovery();
    redirect('/admin/projects');
}
