import { StatusToast } from '@/components/admin/StatusToast';
import { GalleryItemsEditor } from '@/components/admin/GalleryItemsEditor';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';
import { saveGallerySettings } from './actions';

export const dynamic = 'force-dynamic';
const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${input} min-h-28 resize-y`;
const section = 'rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-6';
const summary = 'flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden';
const label = 'text-sm text-muted-foreground';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function GalleryAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const [record, params] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }).catch(() => null),
    searchParams,
  ]);
  const settings = normalizeGallerySettings(record?.galleryContent);

  return (
    <div className="mx-auto max-w-7xl">
      <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Gallery content saved and applied.' : undefined)} />
      <div className="mb-8 sm:mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Gallery</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Manage gallery media first, then expand only the text section you want to edit. Public layout, motion, lightbox and visual effects remain protected.</p>
      </div>

      <form action={saveGallerySettings} className="space-y-6">
        <section className={section}>
          <div className="mb-5 flex flex-col gap-2 border-b border-foreground/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Media</p><h3 className="mt-1 text-xl font-semibold">Gallery items</h3></div>
            <p className="text-xs text-muted-foreground">Add, select and reorder the images shown publicly.</p>
          </div>
          <GalleryItemsEditor initialItems={settings.items} />
        </section>

        <details className={section} open>
          <summary className={summary}><div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Copy</p><h3 className="mt-1 text-lg font-semibold">Manifesto hero</h3></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Expand / collapse</span></summary>
          <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2">
            <label className={label}>Italic eyebrow<input name="heroEyebrow" defaultValue={settings.heroEyebrow} className={input} /></label>
            <label className={label}>Optional title prefix<input name="heroTitlePrefix" defaultValue={settings.heroTitlePrefix} className={input} /></label>
            <label className={label}>First title<input name="heroTitleMain" defaultValue={settings.heroTitleMain} className={input} /></label>
            <label className={label}>Bridge text<input name="heroBridge" defaultValue={settings.heroBridge} className={input} /></label>
            <label className={label}>Second title<input name="heroSecondTitle" defaultValue={settings.heroSecondTitle} className={input} /></label>
            <label className={label}>Second title accent<input name="heroSecondAccent" defaultValue={settings.heroSecondAccent} className={input} /></label>
            <label className={`${label} md:col-span-2`}>Manifesto / quote<textarea name="heroQuote" defaultValue={settings.heroQuote} className={area} /></label>
            <label className={label}>Scroll prompt<input name="scrollPrompt" defaultValue={settings.scrollPrompt} className={input} /></label>
          </div>
        </details>

        <details className={section}>
          <summary className={summary}><div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Labels</p><h3 className="mt-1 text-lg font-semibold">Gallery grid</h3></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Expand / collapse</span></summary>
          <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2 lg:grid-cols-3">
            <label className={label}>Section eyebrow<input name="sectionEyebrow" defaultValue={settings.sectionEyebrow} className={input} /></label>
            <label className={label}>Section title<input name="sectionTitle" defaultValue={settings.sectionTitle} className={input} /></label>
            <label className={label}>Collections label<input name="collectionsLabel" defaultValue={settings.collectionsLabel} className={input} /></label>
            <label className={label}>All filter<input name="filterAll" defaultValue={settings.filterAll} className={input} /></label>
            <label className={label}>Photos filter<input name="filterPhotos" defaultValue={settings.filterPhotos} className={input} /></label>
            <label className={label}>Videos filter<input name="filterVideos" defaultValue={settings.filterVideos} className={input} /></label>
            <label className={label}>View label<input name="viewLabel" defaultValue={settings.viewLabel} className={input} /></label>
            <label className={label}>Load more label<input name="loadMoreLabel" defaultValue={settings.loadMoreLabel} className={input} /></label>
            <label className={label}>Default collection name<input name="galleryCategoryLabel" defaultValue={settings.galleryCategoryLabel} className={input} /></label>
            <label className={`${label} md:col-span-2`}>Empty-state text<input name="emptyLabel" defaultValue={settings.emptyLabel} className={input} /></label>
            <label className={label}>Default image description<input name="defaultImageDescription" defaultValue={settings.defaultImageDescription} className={input} /></label>
          </div>
        </details>

        <details className={section}>
          <summary className={summary}><div><p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Advanced</p><h3 className="mt-1 text-lg font-semibold">Interface tooltips</h3></div><span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Expand / collapse</span></summary>
          <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2 lg:grid-cols-3">
            <label className={label}>Rows view tooltip<input name="rowsViewTitle" defaultValue={settings.rowsViewTitle} className={input} /></label>
            <label className={label}>Grid view tooltip<input name="gridViewTitle" defaultValue={settings.gridViewTitle} className={input} /></label>
            <label className={label}>Infinite view tooltip<input name="infiniteViewTitle" defaultValue={settings.infiniteViewTitle} className={input} /></label>
            <label className={label}>Minimize tooltip<input name="minimizeTitle" defaultValue={settings.minimizeTitle} className={input} /></label>
            <label className={label}>Maximize tooltip<input name="maximizeTitle" defaultValue={settings.maximizeTitle} className={input} /></label>
          </div>
        </details>

        <div className="sticky bottom-3 z-20 flex justify-end rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5">
          <button className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background sm:w-auto">Save Gallery</button>
        </div>
      </form>
    </div>
  );
}
