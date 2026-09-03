'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultGallerySettings, normalizeGallerySettings } from '@/lib/gallery-settings';

const galleryAdminTabs = new Set(['works', 'published', 'page', 'interface']);

async function requireEditor() {
  const session = await auth();
  if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function value(form: FormData, key: keyof typeof defaultGallerySettings, fallback: string, max = 700) {
  if (!form.has(String(key))) return fallback;
  return String(form.get(String(key)) ?? '').trim().slice(0, max);
}

function parseJson(value: FormDataEntryValue | null, fallback: unknown) {
  try { return JSON.parse(String(value ?? '')) as unknown; } catch { return fallback; }
}

function adminTab(value: FormDataEntryValue | null) {
  const tab = String(value ?? '').trim();
  return galleryAdminTabs.has(tab) ? tab : 'works';
}

function done(tab: string, error?: unknown): never {
  const query = new URLSearchParams({ tab });
  if (error) query.set('error', error instanceof Error ? error.message : 'Gallery settings could not be saved.');
  else query.set('saved', '1');
  redirect(`/admin/gallery?${query.toString()}`);
}

export async function saveGallerySettings(form: FormData) {
  const tab = adminTab(form.get('adminTab'));
  try {
    await requireEditor();
    const existing = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { galleryContent: true },
    }).catch(() => null);
    const current = normalizeGallerySettings(existing?.galleryContent);

    const pageFields = tab === 'page' ? {
      heroEyebrow: value(form, 'heroEyebrow', current.heroEyebrow, 40),
      heroTitlePrefix: value(form, 'heroTitlePrefix', current.heroTitlePrefix, 60),
      heroTitleMain: value(form, 'heroTitleMain', current.heroTitleMain, 80),
      heroBridge: value(form, 'heroBridge', current.heroBridge, 120),
      heroSecondTitle: value(form, 'heroSecondTitle', current.heroSecondTitle, 80),
      heroSecondAccent: value(form, 'heroSecondAccent', current.heroSecondAccent, 80),
      heroQuote: value(form, 'heroQuote', current.heroQuote, 700),
      scrollPrompt: value(form, 'scrollPrompt', current.scrollPrompt, 60),
      sectionEyebrow: value(form, 'sectionEyebrow', current.sectionEyebrow, 80),
      sectionTitle: value(form, 'sectionTitle', current.sectionTitle, 120),
    } : {};

    const interfaceFields = tab === 'interface' ? {
      filterAll: value(form, 'filterAll', current.filterAll, 40),
      collectionsLabel: value(form, 'collectionsLabel', current.collectionsLabel, 60),
      viewLabel: value(form, 'viewLabel', current.viewLabel, 40),
      loadMoreLabel: value(form, 'loadMoreLabel', current.loadMoreLabel, 60),
      emptyLabel: value(form, 'emptyLabel', current.emptyLabel, 180),
    } : {};

    const galleryContent = normalizeGallerySettings({
      ...current,
      ...pageFields,
      ...interfaceFields,
      items: tab === 'works' && form.has('galleryItems')
        ? parseJson(form.get('galleryItems'), current.items)
        : current.items,
    });

    await prisma.$transaction(async (tx) => {
      if (tab === 'works') {
        await tx.revision.create({
          data: {
            entityType: 'gallery',
            entityId: 'default',
            snapshot: JSON.parse(JSON.stringify(current)),
            note: 'Automatic Gallery snapshot before Works update',
          },
        });

        const olderSnapshots = await tx.revision.findMany({
          where: { entityType: 'gallery', entityId: 'default' },
          orderBy: { createdAt: 'desc' },
          skip: 10,
          select: { id: true },
        });
        if (olderSnapshots.length) {
          await tx.revision.deleteMany({ where: { id: { in: olderSnapshots.map((revision) => revision.id) } } });
        }
      }

      await tx.siteSettings.upsert({
        where: { id: 'default' },
        create: { id: 'default', galleryContent },
        update: { galleryContent },
      });
    });

    revalidatePath('/admin/gallery');
    revalidatePath('/gallery');
    revalidatePath('/gallery/[slug]', 'page');
    revalidatePath('/gallery/tag/[tag]', 'page');
    revalidatePath('/sitemap.xml');
  } catch (error) {
    done(tab, error);
  }
  done(tab);
}
