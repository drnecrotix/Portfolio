import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MapPin, Palette, Tag } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GalleryZoomViewer } from '@/components/sections/gallery/GalleryZoomViewer';
import {
  galleryCreativeTypeLabel,
  galleryItemHref,
  galleryItemImages,
  normalizeGallerySettings,
  type GalleryItemSetting,
} from '@/lib/gallery-settings';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

function absoluteMediaUrl(value: string) {
  if (!value) return '';
  if (value.startsWith('/')) return `${siteUrl}${value}`;
  return value;
}

function descriptionFor(item: GalleryItemSetting) {
  return (item.seoDescription || item.description || item.story || `${item.title} - ${galleryCreativeTypeLabel(item.creativeType)}`).trim().slice(0, 320);
}

async function loadItem(slug: string) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { siteName: true, galleryContent: true, updatedAt: true },
  }).catch(() => null);
  const content = normalizeGallerySettings(settings?.galleryContent);
  const item = content.items.find((candidate) => candidate.slug === slug && candidate.isVisible && candidate.mediaUrl);
  if (!item) return null;
  return { item, siteName: settings?.siteName || 'NecrotixLab', updatedAt: settings?.updatedAt || new Date() };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadItem(slug);
  if (!loaded) return { robots: { index: false, follow: false } };

  const { item, siteName } = loaded;
  const canonical = `${siteUrl}${galleryItemHref(item.slug)}`;
  const title = item.seoTitle || `${item.title} - ${siteName} Gallery`;
  const description = descriptionFor(item);
  const socialImage = item.socialImageUrl || (item.type === 'image' ? item.mediaUrl : item.thumbnailUrl);
  const socialImageAbsolute = socialImage ? absoluteMediaUrl(socialImage) : '';

  return {
    title,
    description,
    keywords: item.tags.length ? item.tags : undefined,
    alternates: { canonical },
    robots: { index: item.isIndexable, follow: true },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      images: socialImageAbsolute ? [{ url: socialImageAbsolute, alt: item.altText || item.title }] : undefined,
    },
    twitter: {
      card: socialImageAbsolute ? 'summary_large_image' : 'summary',
      title,
      description,
      images: socialImageAbsolute ? [socialImageAbsolute] : undefined,
    },
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 border-b border-foreground/10 py-3 sm:grid-cols-[150px_1fr] sm:gap-6">
      <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-foreground/80">{value}</dd>
    </div>
  );
}

export default async function GalleryWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadItem(slug);
  if (!loaded) notFound();

  const { item, siteName, updatedAt } = loaded;
  const canonical = `${siteUrl}${galleryItemHref(item.slug)}`;
  const images = galleryItemImages(item);
  const creator = item.artist || item.photographer || siteName;
  const copyrightHolder = item.copyrightHolder || creator;
  const description = descriptionFor(item);
  const creativeType = galleryCreativeTypeLabel(item.creativeType);
  const schemaType = item.type === 'image'
    ? ['drawing', 'painting', 'digital-art', 'mixed-media'].includes(item.creativeType)
      ? 'VisualArtwork'
      : 'Photograph'
    : 'CreativeWork';

  const imageObjects = images.map((image, index) => ({
    '@type': 'ImageObject',
    contentUrl: absoluteMediaUrl(image),
    url: absoluteMediaUrl(image),
    name: index === 0 ? item.title : `${item.title} - ${index + 1}`,
    caption: item.description || item.title,
    representativeOfPage: index === 0,
    creator: creator ? { '@type': 'Person', name: creator } : undefined,
    copyrightNotice: copyrightHolder ? `© ${copyrightHolder}` : undefined,
    creditText: creator || undefined,
  }));

  const workSchema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: item.title,
    headline: item.title,
    description,
    url: canonical,
    image: imageObjects.length ? imageObjects : undefined,
    creator: creator ? { '@type': 'Person', name: creator } : undefined,
    author: creator ? { '@type': 'Person', name: creator } : undefined,
    contributor: item.model ? { '@type': 'Person', name: item.model } : undefined,
    dateCreated: item.dateCreated || undefined,
    dateModified: updatedAt.toISOString(),
    artMedium: item.medium || item.software || undefined,
    genre: item.category || creativeType,
    keywords: item.tags.length ? item.tags.join(', ') : undefined,
    locationCreated: item.location ? { '@type': 'Place', name: item.location } : undefined,
    copyrightHolder: copyrightHolder ? { '@type': 'Person', name: copyrightHolder } : undefined,
    license: item.license || undefined,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(workSchema).replace(/</g, '\\u003c') }} />

      <div className="mx-auto max-w-[1380px] px-5 pb-20 pt-24 sm:px-8 lg:px-10 lg:pt-28">
        <Link href="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Link>

        <header className="mt-7 grid gap-6 border-b border-foreground/10 pb-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{creativeType}</span>
              {item.category && item.category !== creativeType && <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{item.category}</span>}
              {images.length > 1 && <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{images.length} images</span>}
            </div>
            <h1 className="max-w-5xl font-serif text-4xl leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">{item.title}</h1>
            {item.description && <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{item.description}</p>}
          </div>
          <div className="space-y-2 text-sm text-muted-foreground lg:text-right">
            {(item.artist || item.photographer) && <p>{item.photographer ? `Photography: ${item.photographer}` : `Artist: ${item.artist}`}</p>}
            {item.location && <p className="inline-flex items-center gap-2 lg:justify-end"><MapPin className="h-4 w-4" />{item.location}</p>}
            {item.dateCreated && <p>{item.dateCreated}</p>}
          </div>
        </header>

        <section className="mt-6">
          {item.type === 'video' ? (
            <div className="mx-auto aspect-video w-full max-w-[1180px] overflow-hidden rounded-[1.25rem] border border-foreground/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <iframe
                src={item.mediaUrl}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            </div>
          ) : (
            <GalleryZoomViewer
              images={images}
              alt={item.altText || item.title}
              title={item.title}
              copyrightHolder={copyrightHolder}
            />
          )}
        </section>

        <div className="mx-auto mt-12 grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {item.story && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-serif text-2xl sm:text-3xl">About this work</h2>
                </div>
                <div className="max-w-3xl space-y-5 text-sm leading-7 text-foreground/75 sm:text-base sm:leading-8">
                  {item.story.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
              </section>
            )}

            {item.tags.length > 0 && (
              <section className={item.story ? 'mt-10' : ''}>
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Tag className="h-4 w-4" />Tags</div>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/[0.025] px-3 py-1.5 text-xs text-foreground/70">{tag}</span>)}
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
            <h2 className="font-serif text-2xl">Work details</h2>
            <dl className="mt-4">
              <MetaRow label="Type" value={creativeType} />
              <MetaRow label="Category" value={item.category} />
              <MetaRow label="Artist" value={item.artist} />
              <MetaRow label="Photographer" value={item.photographer} />
              <MetaRow label="Model" value={item.model} />
              <MetaRow label="Location" value={item.location} />
              <MetaRow label="Created" value={item.dateCreated} />
              <MetaRow label="Medium" value={item.medium} />
              <MetaRow label="Dimensions" value={item.dimensions} />
              <MetaRow label="Software" value={item.software} />
              <MetaRow label="Camera" value={item.camera} />
              <MetaRow label="Lens" value={item.lens} />
              <MetaRow label="Copyright" value={item.copyrightHolder ? `© ${item.copyrightHolder}` : ''} />
              <MetaRow label="License" value={item.license} />
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
