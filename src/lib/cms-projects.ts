import type { Project as PrismaProject } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import type { Project, ProjectContentBlock } from '@/types';

type ProjectContent = {
    image?: string;
    downloadUrl?: string;
    galleryImages?: string[];
    features?: { title: string; items: string[] }[];
    installation?: { title: string; cmd?: string; code?: string; type: 'code' | 'text' }[];
    challengesAndSolutions?: { problem: string; solution: string }[];
};

const MAX_LIST_ITEMS = 50;
const MAX_LIST_ITEM_LENGTH = 120;
const PROJECT_BLOCKS: ProjectContentBlock[] = ['mission', 'features', 'chronicles', 'installation'];
const BLOCK_PATTERN = /\[\[(mission|features|chronicles|installation)\]\]/gi;

function sanitizeProjectDescription(value?: string | null) {
    if (!value) return undefined;
    return sanitizeHtml(value, {
        allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a'],
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
        },
    }).trim();
}

function normalizeProjectBlockMarkers(value?: string) {
    if (!value) return undefined;
    return value
        .replace(/&lbrack;&lbrack;(mission|features|chronicles|installation)&rbrack;&rbrack;/gi, '[[$1]]')
        .replace(
            /<p[^>]*>\s*(?:<(?:strong|em|s)[^>]*>\s*)*\[\[(mission|features|chronicles|installation)\]\](?:\s*<\/(?:strong|em|s)>)*\s*<\/p>/gi,
            '[[$1]]',
        );
}

function extractProjectBlocks(value?: string | null): ProjectContentBlock[] {
    if (!value) return [];
    const found = new Set<ProjectContentBlock>();
    for (const match of value.matchAll(BLOCK_PATTERN)) {
        const block = match[1]?.toLowerCase() as ProjectContentBlock;
        if (PROJECT_BLOCKS.includes(block)) found.add(block);
    }
    return [...found];
}

function projectDescriptionText(value?: string | null) {
    const sanitized = normalizeProjectBlockMarkers(sanitizeProjectDescription(value));
    if (!sanitized) return undefined;
    const withoutBlocks = sanitized.replace(BLOCK_PATTERN, '');
    return sanitizeHtml(withoutBlocks, {
        allowedTags: [],
        allowedAttributes: {},
    }).replace(/\s+/g, ' ').trim() || undefined;
}

export function cmsProjectToPortfolioProject(project: PrismaProject): Project {
    const content = (project.content ?? {}) as unknown as ProjectContent;
    const contentLayout = normalizeProjectBlockMarkers(sanitizeProjectDescription(project.longDescription));
    const contentBlocks = extractProjectBlocks(contentLayout);

    return {
        id: project.id,
        slug: project.slug,
        title: project.title,
        description: project.description,
        longDescription: projectDescriptionText(project.longDescription),
        contentLayout,
        contentBlocks,
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
        downloadUrl: content.downloadUrl,
        repoUrl: project.repoUrl ?? undefined,
        startDate: (project.publishedAt ?? project.createdAt).toISOString().slice(0, 10),
        highlights: project.highlights,
        category: project.category ?? undefined,
        features: contentBlocks.includes('features') ? content.features : undefined,
        installation: contentBlocks.includes('installation') ? content.installation : undefined,
        challengesAndSolutions: contentBlocks.includes('chronicles') ? content.challengesAndSolutions : undefined,
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
    if (parsed.downloadUrl) parsed.downloadUrl = normalizeProjectUrl(parsed.downloadUrl) ?? undefined;
    return parsed;
}
