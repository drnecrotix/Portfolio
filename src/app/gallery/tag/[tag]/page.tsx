import type { Metadata } from 'next';
import { GalleryPageClient } from '@/components/sections/gallery/GalleryPageClient';
import { prisma } from '@/lib/prisma';
import { CONTENT_WATERMARK_CONFIG_SLUG, normalizeContentWatermarkSettings } from '@/lib/content-watermark';
import { normalizeGallerySettings } from '@/lib/gallery-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

function decodeTag(value: string) {
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeTag(value: string) {
  return decodeTag(value)
    .normalize('NFKC')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

function comparableTag(value: string) {
  return normalizeTag(value).toLocaleLowerCase('en');
}

async function loadTaggedGallery(tag: string) {
  const [settings, watermarkPage] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { siteName: true, galleryContent: true },
    }).catch(() => null),
    prisma.page.findUnique({
      where: { slug: CONTENT_WATERMARK_CONFIG_SLUG },
      select: { content: true },
    }).catch(() => null),
  ]);

  const normalizedTag = normalizeTag(tag);
  const needle = comparableTag(normalizedTag);
  const content = normalizeGallerySettings(settings?.galleryContent);
  const items = content.items.filter((item) => item.tags.some((itemTag) => comparableTag(itemTag) === needle));

  return {
    siteName: settings?.siteName || 'NecrotixLab',
    tag: normalizedTag,
    watermark: normalizeContentWatermarkSettings(watermarkPage?.content),
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
  const { tag: rawTag } = await params;
  const { content, watermark, tag } = await loadTaggedGallery(rawTag);
  return <GalleryPageClient content={content} watermark={watermark} activeTag={tag} />;
}
