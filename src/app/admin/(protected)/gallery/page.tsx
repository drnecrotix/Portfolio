import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { StatusToast } from '@/components/admin/StatusToast';
import { GalleryItemsEditor } from '@/components/admin/GalleryItemsEditor';
import { GalleryAdminTabs, type GalleryAdminTabId } from '@/components/admin/GalleryAdminTabs';
import { prisma } from '@/lib/prisma';
import { galleryCreativeTypeLabel, normalizeGallerySettings } from '@/lib/gallery-settings';
import { saveGallerySettings } from './actions';

export const dynamic = 'force-dynamic';
const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${input} min-h-28 resize-y`;
const section = 'rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-6';
const label = 'text-sm text-muted-foreground';
const helper = 'mt-1.5 block text-[10px] leading-4 text-muted-foreground/60';
const galleryAdminTabs: GalleryAdminTabId[] = ['works', 'published', 'page', 'interface'];

type SearchParams = Promise<{ saved?: string; error?: string; tab?: string }>;

function galleryAdminTab(value?: string): GalleryAdminTabId {
  return galleryAdminTabs.includes(value as GalleryAdminTabId) ? value as GalleryAdminTabId : 'works';
}

export default async function GalleryAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const [record, params] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }).catch(() => null),
    searchParams,
  ]);
  const settings = normalizeGallerySettings(record?.galleryContent);
  const publishedItems = settings.items.filter((item) => item.isVisible && item.mediaUrl);
  const initialTab = galleryAdminTab(params.tab);
  const sliderViewTitle = settings.infiniteViewTitle === 'Infinite Preview' ? 'Slider View' : settings.infiniteViewTitle;

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
      <div className="border-b border-foreground/10 pb-4">
        <h3 className="text-lg font-semibold">Gallery interface</h3>
        <p className="mt-1 text-xs text-muted-foreground">Only labels that are actually visible or used as control tooltips on the public Gallery.</p>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <label className={label}>All filter label<input name="filterAll" defaultValue={settings.filterAll} className={input} /><span className={helper}>Text on the filter that shows every Creative Type.</span></label>
        <label className={label}>Rows sidebar heading<input name="collectionsLabel" defaultValue={settings.collectionsLabel} className={input} /><span className={helper}>Heading above the Creative Type list in Rows view.</span></label>
        <label className={label}>Grid load more button<input name="loadMoreLabel" defaultValue={settings.loadMoreLabel} className={input} /><span className={helper}>Button shown when the Grid contains more works than the initial batch.</span></label>
        <label className={`${label} md:col-span-2 lg:col-span-3`}>No results message<input name="emptyLabel" defaultValue={settings.emptyLabel} className={input} /><span className={helper}>Shown when the selected Creative Type has no matching public works.</span></label>
        <label className={label}>Rows view tooltip<input name="rowsViewTitle" defaultValue={settings.rowsViewTitle} className={input} /><span className={helper}>Accessible title for the Rows view button.</span></label>
        <label className={label}>Grid view tooltip<input name="gridViewTitle" defaultValue={settings.gridViewTitle} className={input} /><span className={helper}>Accessible title for the Grid view button.</span></label>
        <label className={label}>Slider view tooltip<input name="infiniteViewTitle" defaultValue={sliderViewTitle} className={input} /><span className={helper}>Accessible title for the Slider view button that replaces Infinite Preview.</span></label>
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
          initialTab={initialTab}
          works={<section className={`${section} gallery-editor-shell`}><GalleryItemsEditor initialItems={settings.items} /></section>}
          published={published}
          page={pagePanel}
          interfacePanel={interfacePanel}
        />

        <input type="hidden" name="defaultImageDescription" value={settings.defaultImageDescription} readOnly />

        <div className="sticky bottom-3 z-20 mt-5 flex justify-end rounded-2xl border border-foreground/10 bg-background/90 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5">
          <button className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background sm:w-auto">Save Gallery</button>
        </div>
      </form>

      <style>{`
        .gallery-editor-shell label[class*="border-amber-400"] {
          min-height: 58px;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          cursor: pointer;
          padding: 0.75rem 1rem;
          transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
        }
        .gallery-editor-shell label[class*="border-amber-400"] > span {
          min-width: 0;
          flex: 1;
        }
        .gallery-editor-shell label[class*="border-amber-400"] > span > span {
          display: none;
        }
        .gallery-editor-shell label[class*="border-amber-400"] strong {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          line-height: 1rem;
        }
        .gallery-editor-shell label[class*="border-amber-400"] strong::after {
          content: 'OFF';
          border: 1px solid rgb(255 255 255 / 0.1);
          border-radius: 9999px;
          padding: 0.1rem 0.38rem;
          font-size: 0.56rem;
          line-height: 0.8rem;
          letter-spacing: 0.12em;
          color: rgb(161 161 170);
        }
        .gallery-editor-shell label[class*="border-amber-400"] > input[type="checkbox"] {
          order: 2;
          width: 2.75rem;
          height: 1.5rem;
          flex: 0 0 auto;
          appearance: none;
          margin: 0;
          border: 1px solid rgb(255 255 255 / 0.12);
          border-radius: 9999px;
          background-color: rgb(255 255 255 / 0.07);
          background-image: radial-gradient(circle at 0.72rem 50%, rgb(255 255 255) 0 0.43rem, transparent 0.46rem);
          cursor: pointer;
          box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.28);
          transition: border-color 160ms ease, background-color 160ms ease, background-image 160ms ease, box-shadow 160ms ease;
        }
        .gallery-editor-shell label[class*="border-amber-400"] > input[type="checkbox"]:focus-visible {
          outline: 2px solid rgb(251 191 36 / 0.55);
          outline-offset: 2px;
        }
        .gallery-editor-shell label[class*="border-amber-400"]:has(> input[type="checkbox"]:checked) {
          border-color: rgb(251 191 36 / 0.34);
          background-color: rgb(251 191 36 / 0.07);
          box-shadow: inset 0 0 0 1px rgb(251 191 36 / 0.04);
        }
        .gallery-editor-shell label[class*="border-amber-400"]:has(> input[type="checkbox"]:checked) strong::after {
          content: 'ON';
          border-color: rgb(251 191 36 / 0.3);
          color: rgb(251 191 36);
          background-color: rgb(251 191 36 / 0.08);
        }
        .gallery-editor-shell label[class*="border-amber-400"] > input[type="checkbox"]:checked {
          border-color: rgb(251 191 36 / 0.42);
          background-color: rgb(251 191 36 / 0.28);
          background-image: radial-gradient(circle at 2rem 50%, rgb(255 255 255) 0 0.43rem, transparent 0.46rem);
          box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.22), 0 0 0 1px rgb(251 191 36 / 0.05);
        }
      `}</style>
    </div>
  );
}
