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
      <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Gallery saved.' : undefined)} />

      <div className="mb-8 sm:mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Gallery</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Manage gallery media like a media library: add an item, choose Photo or Video, select the file, then edit only the metadata you need.</p>
      </div>

      <form action={saveGallerySettings} className="space-y-6">
        <section className={section}>
          <GalleryItemsEditor initialItems={settings.items} />
        </section>

        <details className={section}>
          <summary className={summary}>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Optional</p>
              <h3 className="mt-1 text-lg font-semibold">Page text</h3>
              <p className="mt-1 text-xs text-muted-foreground">Hero and gallery headings.</p>
            </div>
            <span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Edit</span>
          </summary>
          <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2">
            <label className={label}>Italic eyebrow<input name="heroEyebrow" defaultValue={settings.heroEyebrow} className={input} /></label>
            <label className={label}>Optional title prefix<input name="heroTitlePrefix" defaultValue={settings.heroTitlePrefix} className={input} /></label>
            <label className={label}>First title<input name="heroTitleMain" defaultValue={settings.heroTitleMain} className={input} /></label>
            <label className={label}>Bridge text<input name="heroBridge" defaultValue={settings.heroBridge} className={input} /></label>
            <label className={label}>Second title<input name="heroSecondTitle" defaultValue={settings.heroSecondTitle} className={input} /></label>
            <label className={label}>Second title accent<input name="heroSecondAccent" defaultValue={settings.heroSecondAccent} className={input} /></label>
            <label className={`${label} md:col-span-2`}>Manifesto / quote<textarea name="heroQuote" defaultValue={settings.heroQuote} className={area} /></label>
            <label className={label}>Scroll prompt<input name="scrollPrompt" defaultValue={settings.scrollPrompt} className={input} /></label>
            <label className={label}>Gallery eyebrow<input name="sectionEyebrow" defaultValue={settings.sectionEyebrow} className={input} /></label>
            <label className={`${label} md:col-span-2`}>Gallery title<input name="sectionTitle" defaultValue={settings.sectionTitle} className={input} /></label>
          </div>
        </details>

        <details className={section}>
          <summary className={summary}>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Optional</p>
              <h3 className="mt-1 text-lg font-semibold">Display labels</h3>
              <p className="mt-1 text-xs text-muted-foreground">Public filter and action labels.</p>
            </div>
            <span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">Edit</span>
          </summary>
          <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 md:grid-cols-2 lg:grid-cols-3">
            <label className={label}>All<input name="filterAll" defaultValue={settings.filterAll} className={input} /></label>
            <label className={label}>Photos<input name="filterPhotos" defaultValue={settings.filterPhotos} className={input} /></label>
            <label className={label}>Videos<input name="filterVideos" defaultValue={settings.filterVideos} className={input} /></label>
            <label className={label}>Collections<input name="collectionsLabel" defaultValue={settings.collectionsLabel} className={input} /></label>
            <label className={label}>View<input name="viewLabel" defaultValue={settings.viewLabel} className={input} /></label>
            <label className={label}>Load more<input name="loadMoreLabel" defaultValue={settings.loadMoreLabel} className={input} /></label>
            <label className={`${label} md:col-span-2 lg:col-span-3`}>Empty state<input name="emptyLabel" defaultValue={settings.emptyLabel} className={input} /></label>
          </div>
        </details>

        <input type="hidden" name="galleryCategoryLabel" value={settings.galleryCategoryLabel} readOnly />
        <input type="hidden" name="defaultImageDescription" value={settings.defaultImageDescription} readOnly />
        <input type="hidden" name="rowsViewTitle" value={settings.rowsViewTitle} readOnly />
        <input type="hidden" name="gridViewTitle" value={settings.gridViewTitle} readOnly />
        <input type="hidden" name="infiniteViewTitle" value={settings.infiniteViewTitle} readOnly />
        <input type="hidden" name="minimizeTitle" value={settings.minimizeTitle} readOnly />
        <input type="hidden" name="maximizeTitle" value={settings.maximizeTitle} readOnly />

        <div className="sticky bottom-3 z-20 flex justify-end rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5">
          <button className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background sm:w-auto">Save Gallery</button>
        </div>
      </form>
    </div>
  );
}
