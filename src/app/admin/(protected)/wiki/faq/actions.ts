'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';

export type WikiFaqSaveResult = {
    ok: boolean;
    message: string;
    savedAt?: string;
};

async function requireEditor() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function value(form: FormData, key: string, max: number) {
    return String(form.get(key) ?? '').trim().slice(0, max);
}

function json(form: FormData, key: string, fallback: unknown) {
    try { return JSON.parse(String(form.get(key) ?? '')) as unknown; } catch { return fallback; }
}

export async function saveWikiFaq(form: FormData): Promise<WikiFaqSaveResult> {
    try {
        await requireEditor();
        const content = normalizeWikiFaqContent({
            enabled: form.get('enabled') === 'on',
            indexable: form.get('indexable') === 'on',
            eyebrow: value(form, 'eyebrow', 120),
            title: value(form, 'title', 180),
            subtitle: value(form, 'subtitle', 1200),
            introHtml: value(form, 'introHtml', 16_000),
            showSearch: form.get('showSearch') === 'on',
            showCategories: form.get('showCategories') === 'on',
            featuredFirst: form.get('featuredFirst') === 'on',
            defaultExpanded: form.get('defaultExpanded') === 'on',
            items: json(form, 'itemsJson', []),
        });
        const seoTitle = value(form, 'seoTitle', 180) || null;
        const seoDescription = value(form, 'seoDescription', 320) || null;

        const saved = await prisma.page.upsert({
            where: { slug: WIKI_FAQ_CONFIG_SLUG },
            update: { title: content.title, status: 'DRAFT', content, seoTitle, seoDescription },
            create: { slug: WIKI_FAQ_CONFIG_SLUG, title: content.title, status: 'DRAFT', content, seoTitle, seoDescription },
            select: { updatedAt: true },
        });

        revalidatePath('/admin/wiki');
        revalidatePath('/admin/wiki/faq');
        revalidatePath('/wiki');
        revalidatePath('/wiki/articles');
        revalidatePath('/wiki/faq');
        revalidatePath('/sitemap.xml');

        return {
            ok: true,
            message: `FAQ saved successfully. ${content.items.filter((item) => item.enabled).length} visible questions are ready for the public Wiki.`,
            savedAt: saved.updatedAt.toISOString(),
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'FAQ could not be saved.',
        };
    }
}
