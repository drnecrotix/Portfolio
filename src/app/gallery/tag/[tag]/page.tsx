import type { Metadata } from 'next';
import { GalleryPageClient } from '@/components/sections/gallery/GalleryPageClient';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, '').slice(0, 60);
}

async function loadTaggedGallery(tag: string) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { siteName: true, galleryContent: true },
  }).catch(() => null);

  const normalizedTag = normalizeTag(tag);
  const needle = normalizedTag.toLocaleLowerCase('en');
  const content = normalizeGallerySettings(settings?.galleryContent);
  const items = content.items.filter((item) => item.tags.some((itemTag) => itemTag.toLocaleLowerCase('en') === needle));

  return {
    siteName: settings?.siteName || 'NecrotixLab',
    tag: normalizedTag,
    content: {
      ...content,
      sectionEyebrow: 'Filtered by tag',
      sectionTitle: normalizedTag ? `#${normalizedTag}` : 'Tag',
      emptyLabel: normalizedTag ? `No Gallery works tagged #${normalizedTag}.` : 'No Gallery works found for this tag.',
      items,
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const { siteName, tag } = await loadTaggedGallery(rawTag);
  const title = tag ? `#${tag} - ${siteName} Gallery` : `${siteName} Gallery`;
  const description = tag ? `Gallery works tagged #${tag}.` : 'Filtered Gallery works.';
  const canonical = `${siteUrl}/gallery/tag/${encodeURIComponent(tag)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export default async function GalleryTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const { content } = await loadTaggedGallery(tag);
  return <GalleryPageClient content={content} />;
}
