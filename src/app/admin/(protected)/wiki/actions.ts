'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function value(form: FormData, key: string, max: number) {
    return String(form.get(key) ?? '').trim().slice(0, max);
}

function json(form: FormData, key: string, fallback: unknown) {
    try {
        return JSON.parse(String(form.get(key) ?? '')) as unknown;
    } catch {
        return fallback;
    }
}

function done(error?: unknown): never {
    const query = error
        ? `error=${encodeURIComponent(error instanceof Error ? error.message : 'Personal Wiki could not be saved.')}`
        : 'saved=1';
    redirect(`/admin/wiki?${query}`);
}

export async function savePersonalWiki(form: FormData) {
    try {
        await requireEditor();
        const content = normalizePersonalWikiContent({
            enabled: form.get('enabled') === 'on',
            showInNavigation: form.get('showInNavigation') === 'on',
            eyebrow: value(form, 'eyebrow', 80),
            title: value(form, 'title', 120),
            subtitle: value(form, 'subtitle', 200),
            lead: value(form, 'lead', 1800),
            portrait: value(form, 'portrait', 2048),
            portraitCaption: value(form, 'portraitCaption', 160),
            aliases: json(form, 'aliasesJson', []),
            showContents: form.get('showContents') === 'on',
            showInfobox: form.get('showInfobox') === 'on',
            infoboxTitle: value(form, 'infoboxTitle', 100),
            infoboxRows: json(form, 'infoboxRowsJson', []),
            sections: json(form, 'sectionsJson', []),
            showTimeline: form.get('showTimeline') === 'on',
            timelineTitle: value(form, 'timelineTitle', 120),
            timeline: json(form, 'timelineJson', []),
            showRelatedLinks: form.get('showRelatedLinks') === 'on',
            relatedTitle: value(form, 'relatedTitle', 120),
            relatedLinks: json(form, 'relatedLinksJson', []),
            footerNote: value(form, 'footerNote', 500),
        });

        await prisma.$transaction(async (tx) => {
            await tx.page.upsert({
                where: { slug: PERSONAL_WIKI_CONFIG_SLUG },
                create: {
                    slug: PERSONAL_WIKI_CONFIG_SLUG,
                    title: 'Personal Wiki configuration',
                    status: 'DRAFT',
                    content,
                },
                update: {
                    title: 'Personal Wiki configuration',
                    status: 'DRAFT',
                    content,
                },
            });

            const existingWikiNav = await tx.navigationItem.findFirst({
                where: { OR: [{ href: '/wiki' }, { id: 'wiki' }] },
            });
            const shouldShow = content.enabled && content.showInNavigation;

            if (existingWikiNav) {
                await tx.navigationItem.update({
                    where: { id: existingWikiNav.id },
                    data: { isVisible: shouldShow, href: '/wiki' },
                });
            } else if (shouldShow) {
                const about = await tx.navigationItem.findFirst({
                    where: { parentId: null, isDropdown: true, label: { equals: 'About', mode: 'insensitive' } },
                    orderBy: { sortOrder: 'asc' },
                });
                await tx.navigationItem.create({
                    data: {
                        label: 'Wiki',
                        href: '/wiki',
                        sortOrder: 25,
                        parentId: about?.id ?? null,
                    },
                });
            }
        });

        revalidatePath('/wiki');
        revalidatePath('/admin/wiki');
        revalidatePath('/admin/navigation');
        revalidatePath('/api/navigation');
        revalidatePath('/', 'layout');
    } catch (error) {
        done(error);
    }
    done();
}
