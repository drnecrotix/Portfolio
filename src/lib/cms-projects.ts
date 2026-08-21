import type { Project as PrismaProject } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import type { Project } from '@/types';

type ProjectContent = {
    image?: string;
    galleryImages?: string[];
    features?: { title: string; items: string[] }[];
    installation?: { title: string; cmd?: string; code?: string; type: 'code' | 'text' }[];
    challengesAndSolutions?: { problem: string; solution: string }[];
};

const MAX_LIST_ITEMS = 50;
const MAX_LIST_ITEM_LENGTH = 120;

function projectDescriptionText(value?: string | null) {
    if (!value) return undefined;
    if (!/<[a-z][\s\S]*>/i.test(value)) return value;
    return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    }).replace(/\s+/g, ' ').trim();
}

export function cmsProjectToPortfolioProject(project: PrismaProject): Project {
    const content = (project.content ?? {}) as unknown as ProjectContent;

    return {
        id: project.id,
        slug: project.slug,
        title: project.title,
        description: project.description,
        longDescription: projectDescriptionText(project.longDescription),
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
        .filter(Boolean)
        .slice(0, MAX_LIST_ITEMS)
        .map((item) => item.slice(0, MAX_LIST_ITEM_LENGTH));
}

export function normalizeProjectUrl(value: FormDataEntryValue | null) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (raw.length > 2048) throw new Error('Project URL is too long.');

    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Project URLs must use http or https.');
    }
    return parsed.toString();
}

export function normalizeProjectMediaUrl(value: FormDataEntryValue | null) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (raw.startsWith('/')) return raw.slice(0, 2048);
    return normalizeProjectUrl(raw) ?? '';
}

export function safeProjectContent(value: FormDataEntryValue | null): ProjectContent {
    const raw = String(value ?? '').trim();
    if (!raw) return {};
    if (raw.length > 100_000) throw new Error('Project content JSON is too large.');

    const parsed = JSON.parse(raw) as ProjectContent;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Project content must be a JSON object.');
    }

    if (parsed.galleryImages) {
        if (!Array.isArray(parsed.galleryImages)) throw new Error('Gallery images must be an array.');
        parsed.galleryImages = parsed.galleryImages.slice(0, 30).map((item) => normalizeProjectMediaUrl(String(item)));
    }

    if (parsed.image) parsed.image = normalizeProjectMediaUrl(parsed.image);
    return parsed;
}
