export type GalleryItemSetting = {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  category: string;
  type: 'image' | 'video';
  isVisible: boolean;
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
  filterPhotos: string;
  filterVideos: string;
  collectionsLabel: string;
  viewLabel: string;
  loadMoreLabel: string;
  emptyLabel: string;
  galleryCategoryLabel: string;
  defaultImageDescription: string;
  rowsViewTitle: string;
  gridViewTitle: string;
  infiniteViewTitle: string;
  minimizeTitle: string;
  maximizeTitle: string;
  items: GalleryItemSetting[];
};

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
  filterPhotos: 'Photos',
  filterVideos: 'Videos',
  collectionsLabel: 'Collections',
  viewLabel: 'View',
  loadMoreLabel: 'Load More',
  emptyLabel: 'No items found matching filter.',
  galleryCategoryLabel: 'Gallery',
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

function safeId(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return normalized || fallback;
}

function normalizeUrl(value: unknown) {
  const url = String(value ?? '').trim().slice(0, 1200);
  if (!url) return '';
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function normalizeItems(value: unknown, fallbackCategory: string, fallbackDescription: string): GalleryItemSetting[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 250).map((entry, index) => {
    const raw = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
    const mediaUrl = normalizeUrl(raw.mediaUrl ?? raw.url);
    const thumbnailUrl = normalizeUrl(raw.thumbnailUrl ?? raw.thumbnail) || mediaUrl;
    return {
      id: safeId(raw.id, `gallery-item-${index + 1}`),
      mediaUrl,
      thumbnailUrl,
      title: text(raw.title, `Gallery item ${index + 1}`, 160),
      description: text(raw.description, fallbackDescription, 1200),
      category: text(raw.category, fallbackCategory, 120),
      type: raw.type === 'video' ? 'video' : 'image',
      isVisible: raw.isVisible !== false,
      order: Number.isFinite(Number(raw.order)) ? Math.max(0, Math.min(100000, Number(raw.order))) : index,
    };
  }).filter((item) => item.mediaUrl).sort((a, b) => a.order - b.order);
}

export function normalizeGallerySettings(value: unknown): GallerySettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const galleryCategoryLabel = text(source.galleryCategoryLabel, defaultGallerySettings.galleryCategoryLabel, 80);
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
    filterPhotos: text(source.filterPhotos, defaultGallerySettings.filterPhotos, 40),
    filterVideos: text(source.filterVideos, defaultGallerySettings.filterVideos, 40),
    collectionsLabel: text(source.collectionsLabel, defaultGallerySettings.collectionsLabel, 60),
    viewLabel: text(source.viewLabel, defaultGallerySettings.viewLabel, 40),
    loadMoreLabel: text(source.loadMoreLabel, defaultGallerySettings.loadMoreLabel, 60),
    emptyLabel: text(source.emptyLabel, defaultGallerySettings.emptyLabel, 180),
    galleryCategoryLabel,
    defaultImageDescription,
    rowsViewTitle: text(source.rowsViewTitle, defaultGallerySettings.rowsViewTitle, 60),
    gridViewTitle: text(source.gridViewTitle, defaultGallerySettings.gridViewTitle, 60),
    infiniteViewTitle: text(source.infiniteViewTitle, defaultGallerySettings.infiniteViewTitle, 60),
    minimizeTitle: text(source.minimizeTitle, defaultGallerySettings.minimizeTitle, 60),
    maximizeTitle: text(source.maximizeTitle, defaultGallerySettings.maximizeTitle, 60),
    items: normalizeItems(source.items, galleryCategoryLabel, defaultImageDescription),
  };
}
