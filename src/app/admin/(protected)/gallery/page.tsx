import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { StatusToast } from '@/components/admin/StatusToast';
import { GalleryItemsEditor } from '@/components/admin/GalleryItemsEditor';
import { GalleryAdminTabs } from '@/components/admin/GalleryAdminTabs';
import { prisma } from '@/lib/prisma';
import { galleryCreativeTypeLabel, normalizeGallerySettings } from '@/lib/gallery-settings';
import { saveGallerySettings } from './actions';

export const dynamic = 'force-dynamic';
const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${input} min-h-28 resize-y`;
const section = 'rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-6';
const label = 'text-sm text-muted-foreground';

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function GalleryAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const [record, params] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }).catch(() => null),
    searchParams,
  ]);
  const settings = normalizeGallerySettings(record?.galleryContent);
  const publishedItems = settings.items.filter((item) => item.isVisible && item.mediaUrl);

  const published = (
    <section className={section}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground/10 pb-4">
        <div><h3 className="text-lg font-semibold">Published works</h3><p className="mt-1 text-xs text-muted-foreground">Everything currently visible on the public Gallery.</p></div>
        <span className="rounded-full border border-foreground/10 px-3 py-1 text-xs text-muted-foreground">{publishedItems.length} public</span>
      </div>
      <div className="mt-4 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
        {publishedItems.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="size-12 shrink-0 overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.03]">
                {(item.thumbnailUrl || item.mediaUrl) && item.type === 'image' ? <img src={item.thumbnailUrl || item.mediaUrl} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{galleryCreativeTypeLabel(item.creativeType)} · /gallery/{item.slug}</p></div>
            </div>
            <Link href={`/gallery/${encodeURIComponent(item.slug)}`} target="_blank" className="inline-flex items-center gap-2 self-start rounded-lg border border-foreground/10 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground sm:self-auto">View <ExternalLink className="size-3.5" /></Link>
          </div>
        ))}
        {publishedItems.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No public works yet.</div>}
      </div>
    </section>
  );

  const pagePanel = (
    <section className={section}>
      <div className="border-b border-foreground/10 pb-4"><h3 className="text-lg font-semibold">Page text</h3><p className="mt-1 text-xs text-muted-foreground">Hero and Gallery headings only. Media is managed in Works.</p></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
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
    </section>
  );

  const interfacePanel = (
    <section className={section}>
      <div className="border-b border-foreground/10 pb-4"><h3 className="text-lg font-semibold">Gallery interface</h3><p className="mt-1 text-xs text-muted-foreground">Labels used by the Creative Type filter and viewing controls.</p></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <label className={label}>All types<input name="filterAll" defaultValue={settings.filterAll} className={input} /></label>
        <label className={label}>Creative Types label<input name="collectionsLabel" defaultValue={settings.collectionsLabel} className={input} /></label>
        <label className={label}>View<input name="viewLabel" defaultValue={settings.viewLabel} className={input} /></label>
        <label className={label}>Load more<input name="loadMoreLabel" defaultValue={settings.loadMoreLabel} className={input} /></label>
        <label className={`${label} md:col-span-2 lg:col-span-2`}>Empty state<input name="emptyLabel" defaultValue={settings.emptyLabel} className={input} /></label>
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <StatusToast type={params.error ? 'error' : params.saved ? 'success' : undefined} message={params.error || (params.saved ? 'Gallery saved.' : undefined)} />

      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Gallery</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A compact visual portfolio manager. Creative Type is the only public taxonomy; optional technical and creative metadata is shown only when filled in.</p>
      </div>

      <form action={saveGallerySettings}>
        <GalleryAdminTabs
          works={<section className={section}><GalleryItemsEditor initialItems={settings.items} /></section>}
          published={published}
          page={pagePanel}
          interfacePanel={interfacePanel}
        />

        <input type="hidden" name="galleryCategoryLabel" value={settings.galleryCategoryLabel} readOnly />
        <input type="hidden" name="defaultImageDescription" value={settings.defaultImageDescription} readOnly />
        <input type="hidden" name="rowsViewTitle" value={settings.rowsViewTitle} readOnly />
        <input type="hidden" name="gridViewTitle" value={settings.gridViewTitle} readOnly />
        <input type="hidden" name="infiniteViewTitle" value={settings.infiniteViewTitle} readOnly />
        <input type="hidden" name="minimizeTitle" value={settings.minimizeTitle} readOnly />
        <input type="hidden" name="maximizeTitle" value={settings.maximizeTitle} readOnly />

        <div className="sticky bottom-3 z-20 mt-5 flex justify-end rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5">
          <button className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background sm:w-auto">Save Gallery</button>
        </div>
      </form>
    </div>
  );
}
