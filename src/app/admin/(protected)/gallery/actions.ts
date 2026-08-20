'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { defaultGallerySettings, normalizeGallerySettings } from '@/lib/gallery-settings';

async function requireEditor() {
  const session = await auth();
  if (!session?.user || !['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Insufficient permissions');
}

function value(form: FormData, key: keyof typeof defaultGallerySettings, max = 700) {
  return String(form.get(String(key)) ?? '').trim().slice(0, max);
}

function parseJson(value: FormDataEntryValue | null, fallback: unknown) {
  try { return JSON.parse(String(value ?? '')) as unknown; } catch { return fallback; }
}

function done(error?: unknown): never {
  const query = error ? `error=${encodeURIComponent(error instanceof Error ? error.message : 'Gallery settings could not be saved.')}` : 'saved=1';
  redirect(`/admin/gallery?${query}`);
}

export async function saveGallerySettings(form: FormData) {
  try {
    await requireEditor();
    const galleryContent = normalizeGallerySettings({
      heroEyebrow: value(form, 'heroEyebrow', 40),
      heroTitlePrefix: value(form, 'heroTitlePrefix', 60),
      heroTitleMain: value(form, 'heroTitleMain', 80),
      heroBridge: value(form, 'heroBridge', 120),
      heroSecondTitle: value(form, 'heroSecondTitle', 80),
      heroSecondAccent: value(form, 'heroSecondAccent', 80),
      heroQuote: value(form, 'heroQuote', 700),
      scrollPrompt: value(form, 'scrollPrompt', 60),
      sectionEyebrow: value(form, 'sectionEyebrow', 80),
      sectionTitle: value(form, 'sectionTitle', 120),
      filterAll: value(form, 'filterAll', 40),
      filterPhotos: value(form, 'filterPhotos', 40),
      filterVideos: value(form, 'filterVideos', 40),
      collectionsLabel: value(form, 'collectionsLabel', 60),
      viewLabel: value(form, 'viewLabel', 40),
      loadMoreLabel: value(form, 'loadMoreLabel', 60),
      emptyLabel: value(form, 'emptyLabel', 180),
      galleryCategoryLabel: value(form, 'galleryCategoryLabel', 80),
      defaultImageDescription: value(form, 'defaultImageDescription', 180),
      rowsViewTitle: value(form, 'rowsViewTitle', 60),
      gridViewTitle: value(form, 'gridViewTitle', 60),
      infiniteViewTitle: value(form, 'infiniteViewTitle', 60),
      minimizeTitle: value(form, 'minimizeTitle', 60),
      maximizeTitle: value(form, 'maximizeTitle', 60),
      items: parseJson(form.get('galleryItems'), []),
    });

    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', galleryContent },
      update: { galleryContent },
    });
    revalidatePath('/admin/gallery');
    revalidatePath('/gallery');
  } catch (error) {
    done(error);
  }
  done();
}
