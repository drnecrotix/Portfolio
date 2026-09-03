import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, MapPin, Palette, Tag } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GalleryZoomViewer } from '@/components/sections/gallery/GalleryZoomViewer';
import { GalleryWorkEngagement } from '@/components/sections/gallery/GalleryWorkEngagement';
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
const GALLERY_LIKE_COOKIE = 'necrotix_gallery_like_id';

type WorkDetail = { label: string; value: string };

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

function MetaRow({ label, value }: WorkDetail) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-baseline gap-4 border-b border-foreground/10 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-5">
      <dt className="min-w-0 font-sans text-[10px] font-medium uppercase leading-5 tracking-[0.2em] text-muted-foreground sm:text-[11px]">{label}</dt>
      <dd className="min-w-0 break-words text-left font-sans text-[13px] font-medium leading-5 text-foreground/90 sm:text-sm sm:leading-6">{value}</dd>
    </div>
  );
}

function typeSpecificDetails(item: GalleryItemSetting): WorkDetail[] {
  switch (item.creativeType) {
    case 'photography':
      return [
        { label: 'Photographer', value: item.photographer },
        { label: 'Model / Subject', value: item.model },
        { label: 'Location', value: item.location },
        { label: 'Captured', value: item.dateCreated },
        { label: 'Device Type', value: item.deviceType },
        { label: 'Camera / Device', value: item.camera },
        { label: 'Lens', value: item.lens },
        { label: 'Film Stock', value: item.filmStock },
        { label: 'Sensor / Format', value: item.sensorFormat },
        { label: 'Focal Length', value: item.focalLength },
        { label: 'Aperture', value: item.aperture },
        { label: 'Shutter', value: item.shutterSpeed },
        { label: 'ISO', value: item.iso },
        { label: 'Lighting', value: item.lighting },
      ];
    case 'video':
      return [
        { label: 'Video / Direction', value: item.videoCredits },
        { label: 'Cinematography', value: item.cinematographyCredits },
        { label: 'Editing', value: item.editingCredits },
        { label: 'Audio / Sound', value: item.audioCredits },
        { label: 'Music', value: item.musicCredits },
        { label: 'Text / Script', value: item.textCredits },
        { label: 'Color Grading', value: item.colorGradingCredits },
        { label: 'Motion Graphics', value: item.motionGraphicsCredits },
        { label: 'Location', value: item.location },
        { label: 'Created / Released', value: item.dateCreated },
        { label: 'Duration', value: item.duration },
        { label: 'Resolution', value: item.resolution },
        { label: 'Frame Rate', value: item.frameRate },
        { label: 'Production Software', value: item.software },
      ];
    case 'painting':
      return [
        { label: 'Artist', value: item.artist },
        { label: 'Created', value: item.dateCreated },
        { label: 'Medium', value: item.medium },
        { label: 'Materials', value: item.materials },
        { label: 'Technique', value: item.technique },
        { label: 'Surface / Support', value: item.surface },
        { label: 'Dimensions', value: item.dimensions },
      ];
    case 'drawing':
      return [
        { label: 'Artist', value: item.artist },
        { label: 'Created', value: item.dateCreated },
        { label: 'Medium', value: item.medium },
        { label: 'Materials', value: item.materials },
        { label: 'Technique', value: item.technique },
        { label: 'Surface / Paper', value: item.surface },
        { label: 'Dimensions', value: item.dimensions },
      ];
    case 'digital-art':
      return [
        { label: 'Artist', value: item.artist },
        { label: 'Created', value: item.dateCreated },
        { label: 'Software', value: item.software },
        { label: 'Device / Tablet', value: item.deviceType },
        { label: 'Technique', value: item.technique },
        { label: 'Canvas Dimensions', value: item.dimensions },
        { label: 'Output Resolution', value: item.resolution },
      ];
    case 'mixed-media':
      return [
        { label: 'Artist', value: item.artist },
        { label: 'Created', value: item.dateCreated },
        { label: 'Medium', value: item.medium },
        { label: 'Materials', value: item.materials },
        { label: 'Technique', value: item.technique },
        { label: 'Surface / Support', value: item.surface },
        { label: 'Dimensions', value: item.dimensions },
        { label: 'Software', value: item.software },
      ];
    default:
      return [
        { label: 'Creator / Artist', value: item.artist },
        { label: 'Created', value: item.dateCreated },
        { label: 'Location', value: item.location },
        { label: 'Medium', value: item.medium },
        { label: 'Materials', value: item.materials },
        { label: 'Technique', value: item.technique },
        { label: 'Dimensions', value: item.dimensions },
        { label: 'Software', value: item.software },
      ];
  }
}

function primaryCreator(item: GalleryItemSetting, siteName: string) {
  if (item.creativeType === 'photography') return item.photographer || item.artist || siteName;
  if (item.creativeType === 'video') return item.videoCredits || item.artist || siteName;
  return item.artist || item.photographer || siteName;
}

function schemaProperty(name: string, value: string) {
  return value ? { '@type': 'PropertyValue', name, value } : null;
}

export default async function GalleryWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadItem(slug);
  if (!loaded) notFound();

  const { item, siteName, updatedAt } = loaded;
  const canonical = `${siteUrl}${galleryItemHref(item.slug)}`;
  const images = galleryItemImages(item);
  const creator = primaryCreator(item, siteName);
  const copyrightHolder = item.copyrightHolder || creator;
  const description = descriptionFor(item);
  const creativeType = galleryCreativeTypeLabel(item.creativeType);
  const detailRows = typeSpecificDetails(item);
  const publicDetails = [
    { label: 'Creative Type', value: creativeType },
    ...detailRows,
    { label: 'Copyright', value: item.copyrightHolder ? `© ${item.copyrightHolder}` : '' },
    { label: 'License', value: item.license },
  ];
  const schemaType = item.type === 'image'
    ? ['drawing', 'painting', 'digital-art', 'mixed-media'].includes(item.creativeType)
      ? 'VisualArtwork'
      : 'Photograph'
    : 'CreativeWork';

  const headlineCredit = item.creativeType === 'photography' && item.photographer
    ? `Photography: ${item.photographer}`
    : item.creativeType === 'video' && item.videoCredits
      ? `Video: ${item.videoCredits}`
      : item.artist
        ? `Artist: ${item.artist}`
        : '';

  const cookieStore = await cookies();
  const visitorId = cookieStore.get(GALLERY_LIKE_COOKIE)?.value || '';
  const validVisitorId = /^[a-zA-Z0-9-]{16,64}$/.test(visitorId) ? visitorId : '';
  const [engagement, existingLike] = await Promise.all([
    prisma.galleryWorkStats.findUnique({
      where: { slug: item.slug },
      select: { viewCount: true, _count: { select: { likes: true } } },
    }).catch(() => null),
    validVisitorId
      ? prisma.galleryWorkLike.findUnique({
          where: { slug_visitorId: { slug: item.slug, visitorId: validVisitorId } },
          select: { id: true },
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

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

  const additionalProperty = [
    schemaProperty('Creative Type', creativeType),
    ...detailRows.map((detail) => schemaProperty(detail.label, detail.value)),
  ].filter(Boolean);

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
    contributor: item.creativeType === 'photography' && item.model ? { '@type': 'Person', name: item.model } : undefined,
    dateCreated: item.dateCreated || undefined,
    dateModified: updatedAt.toISOString(),
    artMedium: ['drawing', 'painting', 'digital-art', 'mixed-media'].includes(item.creativeType) ? (item.medium || item.software || undefined) : undefined,
    genre: creativeType,
    keywords: item.tags.length ? item.tags.join(', ') : undefined,
    locationCreated: item.location ? { '@type': 'Place', name: item.location } : undefined,
    copyrightHolder: copyrightHolder ? { '@type': 'Person', name: copyrightHolder } : undefined,
    license: item.license || undefined,
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
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
              {images.length > 1 && <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{images.length} images</span>}
            </div>
            <h1 className="max-w-5xl font-serif text-4xl leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">{item.title}</h1>
            {item.description && <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{item.description}</p>}
          </div>
          <div className="space-y-2 text-sm text-muted-foreground lg:text-right">
            {headlineCredit && <p>{headlineCredit}</p>}
            {item.location && <p className="inline-flex items-center gap-2 lg:justify-end"><MapPin className="h-4 w-4" />{item.location}</p>}
            {item.dateCreated && <p>{item.dateCreated}</p>}
          </div>
        </header>

        <GalleryWorkEngagement
          slug={item.slug}
          title={item.title}
          description={description}
          initialLikeCount={engagement?._count.likes ?? 0}
          initialViewCount={engagement?.viewCount ?? 0}
          initiallyLiked={Boolean(existingLike)}
        />

        <section className="mt-5">
          {item.type === 'video' ? (
            <div className="mx-auto aspect-video w-full max-w-[1180px] overflow-hidden rounded-[1.25rem] border border-foreground/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <iframe src={item.mediaUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={item.title} />
            </div>
          ) : (
            <GalleryZoomViewer images={images} alt={item.altText || item.title} title={item.title} copyrightHolder={copyrightHolder} />
          )}
        </section>

        <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div>
            {item.story && (
              <section>
                <div className="mb-4 flex items-center gap-3"><Palette className="h-5 w-5 text-muted-foreground" /><h2 className="font-serif text-2xl sm:text-3xl">About this work</h2></div>
                <div className="max-w-3xl space-y-5 text-sm leading-7 text-foreground/75 sm:text-base sm:leading-8">{item.story.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
              </section>
            )}

            {item.tags.length > 0 && (
              <section className={item.story ? 'mt-10' : ''}>
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Tag className="h-4 w-4" />Tags</div>
                <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/[0.025] px-3 py-1.5 text-xs text-foreground/70">{tag}</span>)}</div>
              </section>
            )}
          </div>

          <aside className="h-fit overflow-hidden rounded-[1.25rem] border border-foreground/10 bg-foreground/[0.018] shadow-[0_12px_36px_rgba(0,0,0,0.05)]">
            <div className="border-b border-foreground/10 px-5 py-4 sm:px-6 sm:py-5">
              <h2 className="font-sans text-lg font-semibold leading-none tracking-[-0.02em] text-foreground sm:text-xl">Work details</h2>
              <p className="mt-2 max-w-sm font-sans text-[11px] leading-5 text-muted-foreground">Details tailored to {creativeType}. Empty fields remain hidden.</p>
            </div>
            <dl className="px-5 pb-1 sm:px-6">
              {publicDetails.map((detail) => <MetaRow key={detail.label} label={detail.label} value={detail.value} />)}
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}