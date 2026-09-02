'use server';

import { ContentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { internalWikiSlug, normalizeWikiArticleContent, publicWikiSlug, WIKI_ARTICLE_PREFIX, wikiSlug } from '@/lib/wiki-articles';

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

function parseStatus(value: FormDataEntryValue | null): ContentStatus {
    const raw = String(value ?? 'DRAFT');
    return Object.values(ContentStatus).includes(raw as ContentStatus) ? raw as ContentStatus : ContentStatus.DRAFT;
}

function done(kind: 'saved' | 'deleted', error?: unknown): never {
    if (error) redirect(`/admin/wiki?error=${encodeURIComponent(error instanceof Error ? error.message : 'Wiki article operation failed.')}`);
    redirect(`/admin/wiki?${kind === 'saved' ? 'articleSaved' : 'deleted'}=1`);
}

export async function saveWikiArticle(form: FormData) {
    let oldPublicSlug = '';
    let newPublicSlug = '';
    try {
        await requireEditor();
        const articleId = value(form, 'articleId', 100);
        const title = value(form, 'title', 180);
        const requestedSlug = wikiSlug(value(form, 'slug', 120));
        if (!title) throw new Error('Article title is required.');
        if (!requestedSlug) throw new Error('A valid Wiki slug is required.');

        const content = normalizeWikiArticleContent({
            slug: requestedSlug,
            category: value(form, 'category', 40),
            summary: value(form, 'summary', 1200),
            bodyHtml: value(form, 'bodyHtml', 80_000),
            image: value(form, 'image', 2048),
            imageCaption: value(form, 'imageCaption', 180),
            infoboxTitle: value(form, 'infoboxTitle', 100),
            infoboxRows: json(form, 'infoboxRowsJson', []),
            relatedSlugs: json(form, 'relatedSlugsJson', []),
            faqItems: json(form, 'faqItemsJson', []),
            featured: form.get('featured') === 'on',
            indexable: form.get('indexable') === 'on',
        }, requestedSlug);
        const targetInternalSlug = internalWikiSlug(content.slug);
        const status = parseStatus(form.get('status'));
        const seoTitle = value(form, 'seoTitle', 180) || null;
        const seoDescription = value(form, 'seoDescription', 320) || null;
        newPublicSlug = content.slug;

        if (articleId) {
            const existing = await prisma.page.findUnique({ where: { id: articleId } });
            if (!existing || !existing.slug.startsWith(WIKI_ARTICLE_PREFIX)) throw new Error('Wiki article not found.');
            oldPublicSlug = publicWikiSlug(existing.slug);
            const conflict = await prisma.page.findUnique({ where: { slug: targetInternalSlug }, select: { id: true } });
            if (conflict && conflict.id !== articleId) throw new Error('Another Wiki article already uses this slug.');
            await prisma.page.update({
                where: { id: articleId },
                data: { slug: targetInternalSlug, title, status, content, seoTitle, seoDescription },
            });
        } else {
            const conflict = await prisma.page.findUnique({ where: { slug: targetInternalSlug }, select: { id: true } });
            if (conflict) throw new Error('Another Wiki article already uses this slug.');
            await prisma.page.create({
                data: { slug: targetInternalSlug, title, status, content, seoTitle, seoDescription },
            });
        }

        revalidatePath('/admin/wiki');
        revalidatePath('/wiki/articles');
        revalidatePath(`/wiki/${newPublicSlug}`);
        if (oldPublicSlug && oldPublicSlug !== newPublicSlug) revalidatePath(`/wiki/${oldPublicSlug}`);
        revalidatePath('/sitemap.xml');
    } catch (error) {
        done('saved', error);
    }
    done('saved');
}

export async function deleteWikiArticle(form: FormData) {
    try {
        await requireEditor();
        const articleId = value(form, 'articleId', 100);
        const existing = articleId ? await prisma.page.findUnique({ where: { id: articleId }, select: { id: true, slug: true } }) : null;
        if (!existing || !existing.slug.startsWith(WIKI_ARTICLE_PREFIX)) throw new Error('Wiki article not found.');
        const slug = publicWikiSlug(existing.slug);
        await prisma.page.delete({ where: { id: existing.id } });
        revalidatePath('/admin/wiki');
        revalidatePath('/wiki/articles');
        if (slug) revalidatePath(`/wiki/${slug}`);
        revalidatePath('/sitemap.xml');
    } catch (error) {
        done('deleted', error);
    }
    done('deleted');
}
