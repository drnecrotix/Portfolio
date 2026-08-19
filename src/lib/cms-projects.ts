import type { Project as PrismaProject } from '@prisma/client';
import type { Project } from '@/types';

type ProjectContent = {
    image?: string;
    galleryImages?: string[];
    features?: { title: string; items: string[] }[];
    installation?: { title: string; cmd?: string; code?: string; type: 'code' | 'text' }[];
    challengesAndSolutions?: { problem: string; solution: string }[];
};

export function cmsProjectToPortfolioProject(project: PrismaProject): Project {
    const content = (project.content ?? {}) as ProjectContent;

    return {
        id: project.id,
        slug: project.slug,
        title: project.title,
        description: project.description,
        longDescription: project.longDescription ?? undefined,
        image: content.image,
        techStack: project.technologies,
        tools: project.tools,
        status:
            project.status === 'ONGOING'
                ? 'ongoing'
                : project.status === 'COMPLETED'
                  ? 'completed'
                  : 'planned',
        demoUrl: project.demoUrl ?? undefined,
        repoUrl: project.repoUrl ?? undefined,
        startDate: (project.publishedAt ?? project.createdAt).toISOString().slice(0, 10),
        highlights: project.highlights,
        category: project.category ?? undefined,
        features: content.features,
        installation: content.installation,
        challengesAndSolutions: content.challengesAndSolutions,
        galleryImages: content.galleryImages,
        team: project.team ?? undefined,
        customTimeline: project.timeline ?? undefined,
        role: project.role ?? undefined,
    };
}

export function csvToList(value: FormDataEntryValue | null) {
    return String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function safeProjectContent(value: FormDataEntryValue | null): ProjectContent {
    const raw = String(value ?? '').trim();
    if (!raw) return {};

    const parsed = JSON.parse(raw) as ProjectContent;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Project content must be a JSON object.');
    }
    return parsed;
}
