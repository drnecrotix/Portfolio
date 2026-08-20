import { StatusToast } from '@/components/admin/StatusToast';
import { MediaLibraryWorkspace } from '@/components/admin/MediaLibraryWorkspace';
import { prisma } from '@/lib/prisma';
import { isManagedMediaKey, managedMediaBackend, mediaStorageBackend } from '@/lib/media-storage';
import { createMediaAsset } from './actions';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

type SearchParams = Promise<{ saved?: string; error?: string }>;
const savedMessages: Record<string, string> = {
  uploaded: 'Media uploaded and added to the library.',
  created: 'External media asset added.',
  updated: 'Attachment details saved.',
  removed: 'Media removed from the library.',
};

function formatBytes(size: number) {
  if (!size) return '0 B';
  const units = ['B','KB','MB','GB']; let value = size; let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default async function MediaLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [assets, totalAssets, imageCount, totalBytes] = await Promise.all([
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.mediaAsset.count(),
    prisma.mediaAsset.count({ where: { mimeType: { startsWith: 'image/' } } }),
    prisma.mediaAsset.aggregate({ _sum: { size: true } }),
  ]);
  const backend = mediaStorageBackend();
  const savedMessage = params.saved ? savedMessages[params.saved] || 'Changes saved and applied.' : undefined;
  const serialized = assets.map((asset) => ({
    id: asset.id,
    key: asset.key,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
    caption: asset.caption,
    url: asset.url,
    createdAt: asset.createdAt.toISOString(),
    managed: isManagedMediaKey(asset.key),
    storage: managedMediaBackend(asset.key),
  }));

  return (
    <div className="mx-auto max-w-[1600px]">
      <StatusToast type={params.error ? 'error' : savedMessage ? 'success' : undefined} message={params.error || savedMessage} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/35">Media</p>
          <h2 className="mt-2 text-4xl font-semibold">Media Library</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/45">A reusable attachment library for images and files across the CMS — with multi-upload, filtering, selection, attachment details and bulk actions.</p>
        </div>
        <span className="rounded-full border border-emerald-400/20 px-3 py-1 text-xs text-emerald-300">{backend === 'r2' ? 'Cloudflare R2' : 'Local storage'} active</span>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['All media', totalAssets], ['Images', imageCount], ['Other files', Math.max(0, totalAssets - imageCount)], ['Stored size', formatBytes(totalBytes._sum.size ?? 0)]].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>
        ))}
      </section>

      <MediaLibraryWorkspace assets={serialized} />

      <details className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <summary className="cursor-pointer text-sm font-semibold text-white/65">Add media from external URL</summary>
        <form action={createMediaAsset} className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-white/60">File name<input name="fileName" required placeholder="project-cover.webp" className={input} /></label>
          <label className="text-sm text-white/60 xl:col-span-2">Public HTTPS URL<input name="url" type="url" required placeholder="https://cdn.example.com/project-cover.webp" className={input} /></label>
          <label className="text-sm text-white/60">Storage key<input name="key" placeholder="external/project-cover.webp" className={input} /></label>
          <label className="text-sm text-white/60">MIME type<input name="mimeType" defaultValue="image/webp" className={input} /></label>
          <label className="text-sm text-white/60">Size in bytes<input name="size" type="number" min="0" defaultValue="0" className={input} /></label>
          <label className="text-sm text-white/60">Width<input name="width" type="number" min="0" className={input} /></label>
          <label className="text-sm text-white/60">Height<input name="height" type="number" min="0" className={input} /></label>
          <label className="text-sm text-white/60 xl:col-span-2">Alt text<input name="altText" className={input} /></label>
          <label className="text-sm text-white/60 xl:col-span-3">Caption<textarea name="caption" rows={2} className={input} /></label>
          <div className="xl:col-span-3"><button className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">Add external asset</button></div>
        </form>
      </details>
    </div>
  );
}
