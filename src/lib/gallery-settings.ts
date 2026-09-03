export type GalleryCreativeType =
  | 'photography'
  | 'drawing'
  | 'painting'
  | 'digital-art'
  | 'mixed-media'
  | 'video'
  | 'other';

export type GalleryItemSetting = {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string;
  additionalImages: string[];
  socialImageUrl: string;
  title: string;
  slug: string;
  description: string;
  story: string;
  altText: string;
  creativeType: GalleryCreativeType;
  tags: string[];
  type: 'image' | 'video';
  artist: string;
  photographer: string;
  model: string;
  location: string;
  dateCreated: string;
  medium: string;
  dimensions: string;
  software: string;
  deviceType: string;
  camera: string;
  lens: string;
  filmStock: string;
  sensorFormat: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  lighting: string;
  surface: string;
  materials: string;
  technique: string;
  resolution: string;
  videoCredits: string;
  cinematographyCredits: string;
  editingCredits: string;
  audioCredits: string;
  musicCredits: string;
  textCredits: string;
  colorGradingCredits: string;
  motionGraphicsCredits: string;
  duration: string;
  frameRate: string;
  copyrightHolder: string;
  license: string;
  seoTitle: string;
  seoDescription: string;
  isVisible: boolean;
  isIndexable: boolean;
  order: number;
};

export type GallerySettings = {
  heroEyebrow: string;
  heroTitlePrefix: string;
  heroTitleMain: string;
  heroBridge: string;
  heroSecondTitle: string;
  heroSecondAccent: string;
  heroQuote: string;
  scrollPrompt: string;
  sectionEyebrow: string;
  sectionTitle: string;
  filterAll: string;
  collectionsLabel: string;
  viewLabel: string;
  loadMoreLabel: string;
  emptyLabel: string;
  defaultImageDescription: string;
  rowsViewTitle: string;
  gridViewTitle: string;
  infiniteViewTitle: string;
  minimizeTitle: string;
  maximizeTitle: string;
  items: GalleryItemSetting[];
};

export const galleryCreativeTypeOptions: Array<{ value: GalleryCreativeType; label: string }> = [
  { value: 'photography', label: 'Photography' },
  { value: 'painting', label: 'Traditional Art' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

export const defaultGallerySettings: GallerySettings = {
  heroEyebrow: 'The',
  heroTitlePrefix: '',
  heroTitleMain: 'Code',
  heroBridge: 'Is merely a vessel for',
  heroSecondTitle: 'Human',
  heroSecondAccent: 'Emotion.',
  heroQuote: 'We build systems not just to process data, but to feel something. This archive is a collection of moments where logic met beauty.',
  scrollPrompt: 'See More',
  sectionEyebrow: 'Exhibition Space',
  sectionTitle: 'Selected Works',
  filterAll: 'All',
  collectionsLabel: 'Creative Types',
  viewLabel: 'View',
  loadMoreLabel: 'Load More',
  emptyLabel: 'No items found matching this creative type.',
  defaultImageDescription: 'Gallery Image',
  rowsViewTitle: 'Rows View',
  gridViewTitle: 'Grid View',
  infiniteViewTitle: 'Infinite Preview',
  minimizeTitle: 'Minimize',
  maximizeTitle: 'Maximize',
  items: [],
};

function text(value: unknown, fallback: string, max = 500) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

function optionalText(value: unknown, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function safeId(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return normalized || fallback;
}

export function gallerySlug(value: unknown, fallback = 'work') {
  const normalized = String(value ?? '')
    .trim()
    .toLocaleLowerCase('en')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 120);
  return normalized || safeId(fallback, 'work').toLowerCase();
}

function normalizeUrl(value: unknown) {
  const url = String(value ?? '').trim().slice(0, 1200);
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function normalizeUrlList(value: unknown, max = 60) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeUrl).filter(Boolean))].slice(0, max);
}

function normalizeTags(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  return [...new Set(source
    .map((entry) => String(entry ?? '').trim().slice(0, 60))
    .filter(Boolean))].slice(0, 30);
}

function normalizeCreativeType(value: unknown, mediaType: GalleryItemSetting['type'], legacyCategory: unknown): GalleryCreativeType {
  if (value === 'photoshoot') return 'photography';
  if (value === 'drawing' || value === 'mixed-media') return 'painting';
  const accepted = new Set<GalleryCreativeType>(galleryCreativeTypeOptions.map((option) => option.value));
  if (typeof value === 'string' && accepted.has(value as GalleryCreativeType)) return value as GalleryCreativeType;
  if (mediaType === 'video') return 'video';

  const categoryValue = String(legacyCategory ?? '').trim().toLowerCase();
  if (categoryValue.includes('photoshoot') || categoryValue.includes('photo session')) return 'photography';
  if (categoryValue.includes('drawing') || categoryValue.includes('sketch')) return 'painting';
  if (categoryValue.includes('painting')) return 'painting';
  if (categoryValue.includes('digital')) return 'digital-art';
  if (categoryValue.includes('mixed')) return 'painting';
  if (categoryValue.includes('video')) return 'video';
  if (categoryValue.includes('other')) return 'other';
  return 'photography';
}

export function galleryCreativeTypeLabel(value: GalleryCreativeType) {
  return galleryCreativeTypeOptions.find((option) => option.value === value)?.label || 'Other';
}

export function galleryItemHref(slug: string) {
  return `/gallery/${encodeURIComponent(slug)}`;
}

export function galleryItemImages(item: GalleryItemSetting) {
  if (item.type !== 'image') return item.thumbnailUrl ? [item.thumbnailUrl] : [];
  return [...new Set([item.mediaUrl, ...item.additionalImages].filter(Boolean))];
}

export function socialVideoEmbedUrl(value: unknown) {
  const normalized = normalizeUrl(value);
  if (!normalized || normalized.startsWith('/')) return normalized;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be' && parts[0]) return `https://www.youtube.com/embed/${encodeURIComponent(parts[0])}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0] || '') ? parts[1] : '');
      if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
      return '';
    }

    if ((host === 'vimeo.com' || host === 'player.vimeo.com') && parts.length) {
      const id = [...parts].reverse().find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }

    if (host === 'tiktok.com' || host === 'm.tiktok.com') {
      const videoIndex = parts.indexOf('video');
      const id = videoIndex >= 0 ? parts[videoIndex + 1] : '';
      return id && /^\d+$/.test(id) ? `https://www.tiktok.com/player/v1/${id}` : '';
    }

    if (host === 'instagram.com' || host === 'm.instagram.com') {
      const kind = parts[0];
      const shortcode = parts[1];
      if (shortcode && ['p', 'reel', 'reels', 'tv'].includes(kind || '')) {
        const embedKind = kind === 'reels' ? 'reel' : kind;
        return `https://www.instagram.com/${embedKind}/${encodeURIComponent(shortcode)}/embed/`;
      }
      return '';
    }

    if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.watch') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&show_text=false&width=1280`;
    }

    if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com') {
      const statusIndex = parts.indexOf('status');
      const id = statusIndex >= 0 ? parts[statusIndex + 1] : '';
      return id && /^\d+$/.test(id) ? `https://platform.twitter.com/embed/Tweet.html?id=${id}` : '';
    }

    const isPinterest = /^([a-z0-9-]+\.)?pinterest\.[a-z.]+$/.test(host);
    if (isPinterest) {
      const pinIndex = parts.indexOf('pin');
      const id = pinIndex >= 0 ? parts[pinIndex + 1] : '';
      return id && /^\d+$/.test(id) ? `https://assets.pinterest.com/ext/embed.html?id=${id}` : '';
    }

    if (host === 'dailymotion.com' || host === 'dai.ly') {
      const id = host === 'dai.ly' ? parts[0] : parts[0] === 'video' ? parts[1] : '';
      return id ? `https://www.dailymotion.com/embed/video/${encodeURIComponent(id.split('_')[0])}` : '';
    }

    return '';
  } catch {
    return '';
  }
}

function normalizeItems(value: unknown, fallbackDescription: string): GalleryItemSetting[] {
  if (!Array.isArray(value)) return [];

  const normalized = value.slice(0, 250).map((entry, index) => {
    const raw = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    const rawType: GalleryItemSetting['type'] = raw.type === 'video' ? 'video' : 'image';
    const creativeType = normalizeCreativeType(raw.creativeType, rawType, raw.category);
    const type: GalleryItemSetting['type'] = creativeType === 'video' ? 'video' : 'image';
    const title = text(raw.title, `Gallery item ${index + 1}`, 160);
    const mediaUrl = type === 'video' ? socialVideoEmbedUrl(raw.mediaUrl ?? raw.url) : normalizeUrl(raw.mediaUrl ?? raw.url);
    const rawThumbnail = normalizeUrl(raw.thumbnailUrl ?? raw.thumbnail);
    const thumbnailUrl = type === 'image' ? (rawThumbnail || mediaUrl) : rawThumbnail;

    return {
      id: safeId(raw.id, `gallery-item-${index + 1}`),
      mediaUrl,
      thumbnailUrl,
      additionalImages: type === 'image' ? normalizeUrlList(raw.additionalImages ?? raw.images) : [],
      socialImageUrl: normalizeUrl(raw.socialImageUrl ?? raw.ogImage),
      title,
      slug: gallerySlug(raw.slug || title, `gallery-item-${index + 1}`),
      description: text(raw.description, fallbackDescription, 1600),
      story: optionalText(raw.story ?? raw.about, 12000),
      altText: text(raw.altText, title, 280),
      creativeType,
      tags: normalizeTags(raw.tags),
      type,
      artist: optionalText(raw.artist, 160),
      photographer: optionalText(raw.photographer, 160),
      model: optionalText(raw.model, 240),
      location: optionalText(raw.location, 240),
      dateCreated: optionalText(raw.dateCreated ?? raw.date, 80),
      medium: optionalText(raw.medium, 240),
      dimensions: optionalText(raw.dimensions, 120),
      software: optionalText(raw.software, 240),
      deviceType: optionalText(raw.deviceType ?? raw.device, 160),
      camera: optionalText(raw.camera, 240),
      lens: optionalText(raw.lens, 240),
      filmStock: optionalText(raw.filmStock ?? raw.film, 200),
      sensorFormat: optionalText(raw.sensorFormat ?? raw.format, 160),
      focalLength: optionalText(raw.focalLength, 80),
      aperture: optionalText(raw.aperture, 80),
      shutterSpeed: optionalText(raw.shutterSpeed ?? raw.shutter, 80),
      iso: optionalText(raw.iso, 80),
      lighting: optionalText(raw.lighting, 240),
      surface: optionalText(raw.surface ?? raw.support, 200),
      materials: optionalText(raw.materials, 400),
      technique: optionalText(raw.technique, 300),
      resolution: optionalText(raw.resolution, 120),
      videoCredits: optionalText(raw.videoCredits ?? raw.directionCredits ?? raw.director, 400),
      cinematographyCredits: optionalText(raw.cinematographyCredits ?? raw.cameraCredits, 400),
      editingCredits: optionalText(raw.editingCredits ?? raw.editor, 400),
      audioCredits: optionalText(raw.audioCredits ?? raw.soundCredits, 400),
      musicCredits: optionalText(raw.musicCredits, 400),
      textCredits: optionalText(raw.textCredits ?? raw.scriptCredits ?? raw.writer, 400),
      colorGradingCredits: optionalText(raw.colorGradingCredits ?? raw.colorCredits, 400),
      motionGraphicsCredits: optionalText(raw.motionGraphicsCredits ?? raw.animationCredits, 400),
      duration: optionalText(raw.duration, 80),
      frameRate: optionalText(raw.frameRate ?? raw.fps, 80),
      copyrightHolder: optionalText(raw.copyrightHolder, 200),
      license: optionalText(raw.license, 240),
      seoTitle: optionalText(raw.seoTitle, 180),
      seoDescription: optionalText(raw.seoDescription, 320),
      isVisible: raw.isVisible !== false,
      isIndexable: raw.isIndexable !== false,
      order: Number.isFinite(Number(raw.order)) ? Math.max(0, Math.min(100000, Number(raw.order))) : index,
    };
  }).filter((item) => item.mediaUrl);

  const usedSlugs = new Set<string>();
  return normalized.map((item) => {
    let slug = item.slug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${item.slug}-${suffix++}`.slice(0, 120);
    usedSlugs.add(slug);
    return { ...item, slug };
  }).sort((a, b) => a.order - b.order);
}

export function normalizeGallerySettings(value: unknown): GallerySettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const defaultImageDescription = text(source.defaultImageDescription, defaultGallerySettings.defaultImageDescription, 180);
  return {
    heroEyebrow: text(source.heroEyebrow, defaultGallerySettings.heroEyebrow, 40),
    heroTitlePrefix: typeof source.heroTitlePrefix === 'string' ? source.heroTitlePrefix.trim().slice(0, 60) : defaultGallerySettings.heroTitlePrefix,
    heroTitleMain: text(source.heroTitleMain, defaultGallerySettings.heroTitleMain, 80),
    heroBridge: text(source.heroBridge, defaultGallerySettings.heroBridge, 120),
    heroSecondTitle: text(source.heroSecondTitle, defaultGallerySettings.heroSecondTitle, 80),
    heroSecondAccent: text(source.heroSecondAccent, defaultGallerySettings.heroSecondAccent, 80),
    heroQuote: text(source.heroQuote, defaultGallerySettings.heroQuote, 700),
    scrollPrompt: text(source.scrollPrompt, defaultGallerySettings.scrollPrompt, 60),
    sectionEyebrow: text(source.sectionEyebrow, defaultGallerySettings.sectionEyebrow, 80),
    sectionTitle: text(source.sectionTitle, defaultGallerySettings.sectionTitle, 120),
    filterAll: text(source.filterAll, defaultGallerySettings.filterAll, 40),
    collectionsLabel: text(source.collectionsLabel, defaultGallerySettings.collectionsLabel, 60),
    viewLabel: text(source.viewLabel, defaultGallerySettings.viewLabel, 40),
    loadMoreLabel: text(source.loadMoreLabel, defaultGallerySettings.loadMoreLabel, 60),
    emptyLabel: text(source.emptyLabel, defaultGallerySettings.emptyLabel, 180),
    defaultImageDescription,
    rowsViewTitle: text(source.rowsViewTitle, defaultGallerySettings.rowsViewTitle, 60),
    gridViewTitle: text(source.gridViewTitle, defaultGallerySettings.gridViewTitle, 60),
    infiniteViewTitle: text(source.infiniteViewTitle, defaultGallerySettings.infiniteViewTitle, 60),
    minimizeTitle: text(source.minimizeTitle, defaultGallerySettings.minimizeTitle, 60),
    maximizeTitle: text(source.maximizeTitle, defaultGallerySettings.maximizeTitle, 60),
    items: normalizeItems(source.items, defaultImageDescription),
  };
}