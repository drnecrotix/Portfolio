import { StatusToast } from '@/components/admin/StatusToast';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';
import { saveGallerySettings } from './actions';

export const dynamic = 'force-dynamic';
const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30';
const area = `${input} min-h-28 resize-y`;

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function GalleryAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const [record, params] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }).catch(() => null),
    searchParams,
  ]);
  const settings = normalizeGallerySettings(record?.galleryContent);

  return (
    <div className="mx-auto max-w-6xl">
      <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Gallery content saved and applied.' : undefined)} />
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-white/35">Content</p>
        <h2 className="mt-2 text-4xl font-semibold">Gallery</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Edit the text shown on the public Gallery page. Layout, motion, GLSL background, grid, lightbox and visual styling remain protected.</p>
      </div>

      <form action={saveGallerySettings} className="space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">Manifesto hero</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="text-sm text-white/60">Italic eyebrow<input name="heroEyebrow" defaultValue={settings.heroEyebrow} className={input} /></label>
            <label className="text-sm text-white/60">Optional title prefix<input name="heroTitlePrefix" defaultValue={settings.heroTitlePrefix} className={input} /></label>
            <label className="text-sm text-white/60">First title<input name="heroTitleMain" defaultValue={settings.heroTitleMain} className={input} /></label>
            <label className="text-sm text-white/60">Bridge text<input name="heroBridge" defaultValue={settings.heroBridge} className={input} /></label>
            <label className="text-sm text-white/60">Second title<input name="heroSecondTitle" defaultValue={settings.heroSecondTitle} className={input} /></label>
            <label className="text-sm text-white/60">Second title accent<input name="heroSecondAccent" defaultValue={settings.heroSecondAccent} className={input} /></label>
            <label className="text-sm text-white/60 md:col-span-2">Manifesto / quote<textarea name="heroQuote" defaultValue={settings.heroQuote} className={area} /></label>
            <label className="text-sm text-white/60">Scroll prompt<input name="scrollPrompt" defaultValue={settings.scrollPrompt} className={input} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">Gallery grid</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-white/60">Section eyebrow<input name="sectionEyebrow" defaultValue={settings.sectionEyebrow} className={input} /></label>
            <label className="text-sm text-white/60">Section title<input name="sectionTitle" defaultValue={settings.sectionTitle} className={input} /></label>
            <label className="text-sm text-white/60">Collections label<input name="collectionsLabel" defaultValue={settings.collectionsLabel} className={input} /></label>
            <label className="text-sm text-white/60">All filter<input name="filterAll" defaultValue={settings.filterAll} className={input} /></label>
            <label className="text-sm text-white/60">Photos filter<input name="filterPhotos" defaultValue={settings.filterPhotos} className={input} /></label>
            <label className="text-sm text-white/60">Videos filter<input name="filterVideos" defaultValue={settings.filterVideos} className={input} /></label>
            <label className="text-sm text-white/60">View label<input name="viewLabel" defaultValue={settings.viewLabel} className={input} /></label>
            <label className="text-sm text-white/60">Load more label<input name="loadMoreLabel" defaultValue={settings.loadMoreLabel} className={input} /></label>
            <label className="text-sm text-white/60">Default collection name<input name="galleryCategoryLabel" defaultValue={settings.galleryCategoryLabel} className={input} /></label>
            <label className="text-sm text-white/60 md:col-span-2">Empty-state text<input name="emptyLabel" defaultValue={settings.emptyLabel} className={input} /></label>
            <label className="text-sm text-white/60">Default image description<input name="defaultImageDescription" defaultValue={settings.defaultImageDescription} className={input} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">Interface labels</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-white/60">Rows view tooltip<input name="rowsViewTitle" defaultValue={settings.rowsViewTitle} className={input} /></label>
            <label className="text-sm text-white/60">Grid view tooltip<input name="gridViewTitle" defaultValue={settings.gridViewTitle} className={input} /></label>
            <label className="text-sm text-white/60">Infinite view tooltip<input name="infiniteViewTitle" defaultValue={settings.infiniteViewTitle} className={input} /></label>
            <label className="text-sm text-white/60">Minimize tooltip<input name="minimizeTitle" defaultValue={settings.minimizeTitle} className={input} /></label>
            <label className="text-sm text-white/60">Maximize tooltip<input name="maximizeTitle" defaultValue={settings.maximizeTitle} className={input} /></label>
          </div>
        </section>

        <div className="flex justify-end">
          <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Save Gallery content</button>
        </div>
      </form>
    </div>
  );
}
