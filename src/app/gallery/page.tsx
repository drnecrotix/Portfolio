import type { Metadata } from 'next';
import { GalleryPageClient } from '@/components/sections/gallery/GalleryPageClient';
import { prisma } from '@/lib/prisma';
import { galleryItemHref, galleryItemImages, normalizeGallerySettings } from '@/lib/gallery-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

function absoluteMediaUrl(value: string) {
  if (!value) return '';
  if (value.startsWith('/')) return `${siteUrl}${value}`;
  return value;
}

async function loadGallery() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { siteName: true, siteDescription: true, galleryContent: true },
  }).catch(() => null);

  return {
    siteName: settings?.siteName || 'NecrotixLab',
    siteDescription: settings?.siteDescription || '',
    content: normalizeGallerySettings(settings?.galleryContent),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription, content } = await loadGallery();
  const firstImage = content.items
    .filter((item) => item.isVisible && item.type === 'image')
    .map((item) => item.socialImageUrl || item.mediaUrl)
    .find(Boolean);
  const description = siteDescription || content.heroQuote || 'Creative work, photography, drawings, paintings and visual experiments.';
  const title = `Gallery - ${siteName}`;
  const canonical = `${siteUrl}/gallery`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      images: firstImage ? [{ url: absoluteMediaUrl(firstImage) }] : undefined,
    },
    twitter: {
      card: firstImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: firstImage ? [absoluteMediaUrl(firstImage)] : undefined,
    },
  };
}

export default async function GalleryPage() {
  const { siteName, content } = await loadGallery();
  const visibleItems = content.items.filter((item) => item.isVisible && item.mediaUrl);
  const indexableItems = visibleItems.filter((item) => item.isIndexable && item.slug);
  const gallerySchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${siteName} Gallery`,
    url: `${siteUrl}/gallery`,
    description: content.heroQuote,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: indexableItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}${galleryItemHref(item.slug)}`,
        name: item.title,
        image: galleryItemImages(item).map(absoluteMediaUrl),
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gallerySchema).replace(/</g, '\\u003c') }} />
      <GalleryPageClient content={content} />
    </>
  );
}
