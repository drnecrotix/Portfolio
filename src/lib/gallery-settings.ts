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
};

function text(value: unknown, fallback: string, max = 500) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

export function normalizeGallerySettings(value: unknown): GallerySettings {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
    galleryCategoryLabel: text(source.galleryCategoryLabel, defaultGallerySettings.galleryCategoryLabel, 80),
    defaultImageDescription: text(source.defaultImageDescription, defaultGallerySettings.defaultImageDescription, 180),
    rowsViewTitle: text(source.rowsViewTitle, defaultGallerySettings.rowsViewTitle, 60),
    gridViewTitle: text(source.gridViewTitle, defaultGallerySettings.gridViewTitle, 60),
    infiniteViewTitle: text(source.infiniteViewTitle, defaultGallerySettings.infiniteViewTitle, 60),
    minimizeTitle: text(source.minimizeTitle, defaultGallerySettings.minimizeTitle, 60),
    maximizeTitle: text(source.maximizeTitle, defaultGallerySettings.maximizeTitle, 60),
  };
}
