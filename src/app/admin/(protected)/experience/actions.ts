'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultExperienceContent, normalizeExperienceContent, type ExperienceContent, type ExperienceTabId, type PartnerLogo } from '@/lib/experience-content';

const CONFIG_SLUG = '__experience-config';

export type ExperienceSaveResult =
    | { ok: true; savedAt: string }
    | { ok: false; error: string; field?: string };

function readString(form: FormData, key: string, fallback: string, max = 600) {
    const value = String(form.get(key) ?? '').trim();
    return (value || fallback).slice(0, max);
}

function readBoolean(form: FormData, key: string) {
    return form.get(key) === 'on';
}

function readUrl(form: FormData, key: string, fallback: string) {
    const value = readString(form, key, fallback, 2048);
    if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) return value;
    try {
        const parsed = new URL(value);
        if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.toString();
    } catch {}
    return fallback;
}

function parseJsonField(form: FormData, key: string): unknown {
    const raw = String(form.get(key) ?? '').trim();
    if (!raw) return [];
    return JSON.parse(raw) as unknown;
}

function isSvgSource(value: string) {
    const clean = value.trim().split(/[?#]/, 1)[0].toLowerCase();
    if (!clean.endsWith('.svg')) return false;
    if (clean.startsWith('/') && !clean.startsWith('//')) return true;
    try {
        const parsed = new URL(value);
        return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
    } catch {
        return false;
    }
}

function validatePartnerLogos(raw: unknown, existing: PartnerLogo[]): ExperienceSaveResult | null {
    if (!Array.isArray(raw)) return { ok: false, error: 'Partners & Sponsors data is invalid.', field: 'partnerLogosJson' };
    const existingById = new Map(existing.map((item) => [item.id, item]));

    for (const item of raw) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const candidate = item as Partial<PartnerLogo>;
        const id = String(candidate.id ?? '').trim();
        const src = String(candidate.src ?? '').trim();
        if (!src) continue;
        const previous = existingById.get(id);
        const unchangedLegacy = Boolean(previous && previous.src === src);
        if (!unchangedLegacy && !isSvgSource(src)) {
            return {
                ok: false,
                error: `Partner logo “${String(candidate.name ?? id || 'Untitled')}” must use an .svg image. Existing legacy logos can remain until they are replaced.`,
                field: 'partnerLogosJson',
            };
        }
    }
    return null;
}

export async function updateExperiencePage(form: FormData): Promise<ExperienceSaveResult> {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        return { ok: false, error: 'You do not have permission to edit the Experience page.' };
    }

    try {
        const existingPage = await prisma.page.findUnique({ where: { slug: CONFIG_SLUG } });
        const existing = normalizeExperienceContent(existingPage?.content);
        const requestedDefault = String(form.get('defaultTab') ?? existing.defaultTab) as ExperienceTabId;
        const defaultTab: ExperienceTabId = ['education', 'journey', 'experience'].includes(requestedDefault) ? requestedDefault : defaultExperienceContent.defaultTab;

        let educationEntries: unknown;
        let journeyEntries: unknown;
        let experienceEntries: unknown;
        let partnerLogos: unknown;
        try {
            educationEntries = parseJsonField(form, 'educationEntriesJson');
            journeyEntries = parseJsonField(form, 'journeyEntriesJson');
            experienceEntries = parseJsonField(form, 'experienceEntriesJson');
            partnerLogos = parseJsonField(form, 'partnerLogosJson');
        } catch {
            return { ok: false, error: 'One of the editable Experience datasets contains invalid JSON. Reload the editor and try again.' };
        }

        const partnerError = validatePartnerLogos(partnerLogos, existing.partnerLogos);
        if (partnerError) return partnerError;

        const candidate: ExperienceContent = normalizeExperienceContent({
            ...existing,
            pageEnabled: readBoolean(form, 'pageEnabled'),
            showHero: readBoolean(form, 'showHero'),
            showDecorations: readBoolean(form, 'showDecorations'),
            showMarquee: readBoolean(form, 'showMarquee'),
            showTabs: readBoolean(form, 'showTabs'),
            showEducation: readBoolean(form, 'showEducation'),
            showJourney: readBoolean(form, 'showJourney'),
            showExperience: readBoolean(form, 'showExperience'),
            showHighlights: readBoolean(form, 'showHighlights'),
            showSkills: readBoolean(form, 'showSkills'),
            showResponsibilities: readBoolean(form, 'showResponsibilities'),
            showImpact: readBoolean(form, 'showImpact'),
            showKeyLearnings: readBoolean(form, 'showKeyLearnings'),
            defaultTab,
            heroEyebrow: readString(form, 'heroEyebrow', existing.heroEyebrow, 120),
            heroTitle: readString(form, 'heroTitle', existing.heroTitle, 160),
            heroHighlight: readString(form, 'heroHighlight', existing.heroHighlight, 120),
            heroDescription: readString(form, 'heroDescription', existing.heroDescription, 600),
            heroPrimaryLabel: readString(form, 'heroPrimaryLabel', existing.heroPrimaryLabel, 80),
            heroPrimaryUrl: readUrl(form, 'heroPrimaryUrl', existing.heroPrimaryUrl),
            heroSecondaryLabel: readString(form, 'heroSecondaryLabel', existing.heroSecondaryLabel, 80),
            heroSecondaryUrl: readUrl(form, 'heroSecondaryUrl', existing.heroSecondaryUrl),
            marqueeTitle: readString(form, 'marqueeTitle', existing.marqueeTitle, 120),
            tabIntro: readString(form, 'tabIntro', existing.tabIntro, 240),
            educationLabel: readString(form, 'educationLabel', existing.educationLabel, 80),
            educationDescription: readString(form, 'educationDescription', existing.educationDescription, 240),
            journeyLabel: readString(form, 'journeyLabel', existing.journeyLabel, 80),
            journeyDescription: readString(form, 'journeyDescription', existing.journeyDescription, 240),
            experienceLabel: readString(form, 'experienceLabel', existing.experienceLabel, 80),
            experienceDescription: readString(form, 'experienceDescription', existing.experienceDescription, 240),
            archiveEyebrow: readString(form, 'archiveEyebrow', existing.archiveEyebrow, 100),
            archiveTitle: readString(form, 'archiveTitle', existing.archiveTitle, 160),
            archiveDescription: readString(form, 'archiveDescription', existing.archiveDescription, 360),
            emptyState: readString(form, 'emptyState', existing.emptyState, 240),
            categories: existing.categories.map((category, index) => ({
                id: category.id,
                label: readString(form, `category_${index}_label`, category.label, 120),
                description: readString(form, `category_${index}_description`, category.description, 240),
                prefix: readString(form, `category_${index}_prefix`, category.prefix, 40),
                enabled: readBoolean(form, `category_${index}_enabled`),
            })),
            highlights: {
                education: {
                    title: readString(form, 'educationHighlightTitle', existing.highlights.education.title, 120),
                    highlight: readString(form, 'educationHighlightText', existing.highlights.education.highlight, 120),
                    description: readString(form, 'educationHighlightDescription', existing.highlights.education.description, 500),
                    enabled: readBoolean(form, 'educationHighlightEnabled'),
                },
                journey: {
                    title: readString(form, 'journeyHighlightTitle', existing.highlights.journey.title, 120),
                    highlight: readString(form, 'journeyHighlightText', existing.highlights.journey.highlight, 120),
                    description: readString(form, 'journeyHighlightDescription', existing.highlights.journey.description, 500),
                    enabled: readBoolean(form, 'journeyHighlightEnabled'),
                },
                experience: {
                    title: readString(form, 'experienceHighlightTitle', existing.highlights.experience.title, 120),
                    highlight: readString(form, 'experienceHighlightText', existing.highlights.experience.highlight, 120),
                    description: readString(form, 'experienceHighlightDescription', existing.highlights.experience.description, 500),
                    enabled: readBoolean(form, 'experienceHighlightEnabled'),
                },
            },
            educationEntries,
            journeyEntries,
            experienceEntries,
            partnerLogos,
        });

        const jsonContent = candidate as unknown as Prisma.InputJsonValue;
        await prisma.page.upsert({
            where: { slug: CONFIG_SLUG },
            create: {
                slug: CONFIG_SLUG,
                title: 'Experience page configuration',
                status: 'PUBLISHED',
                content: jsonContent,
            },
            update: {
                title: 'Experience page configuration',
                status: 'PUBLISHED',
                content: jsonContent,
            },
        });

        revalidatePath('/experience');
        revalidatePath('/admin/experience');
        return { ok: true, savedAt: new Date().toISOString() };
    } catch (error) {
        console.error('Failed to save Experience page', error);
        return { ok: false, error: 'The Experience settings could not be saved. Please retry. If the problem continues, check the server logs.' };
    }
}
