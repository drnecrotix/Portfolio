'use client';

import { useMemo, useState } from 'react';
import { Copy, File, Grid3X3, Image as ImageIcon, List, Search, Trash2, Upload, X } from 'lucide-react';
import { updateMediaAsset, deleteMediaAsset } from '@/app/admin/(protected)/media/actions';
import { bulkDeleteMediaAssets, uploadMediaAssets } from '@/app/admin/(protected)/media/bulk-actions';

type Asset = {
  id: string;
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  url: string;
  createdAt: string;
  managed: boolean;
  storage: string;
};

const field = 'mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-white/30';

function bytes(size: number) {
  if (!size) return '—';
  const units = ['B','KB','MB','GB']; let value = size; let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function MediaLibraryWorkspace({ assets }: { assets: Asset[] }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all'|'image'|'file'>('all');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(assets[0]?.id ?? null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => assets.filter((asset) => {
    const q = query.trim().toLowerCase();
    const kindOk = kind === 'all' || (kind === 'image' ? asset.mimeType.startsWith('image/') : !asset.mimeType.startsWith('image/'));
    const textOk = !q || [asset.fileName, asset.altText, asset.caption, asset.mimeType].some((value) => value?.toLowerCase().includes(q));
    return kindOk && textOk;
  }), [assets, kind, query]);
  const active = assets.find((asset) => asset.id === activeId) ?? null;
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setUploadOpen((v) => !v)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"><Upload className="size-4" /> Add media</button>
          {(['all','image','file'] as const).map((value) => <button key={value} type="button" onClick={() => setKind(value)} className={`rounded-xl border px-3 py-2 text-sm ${kind === value ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/45'}`}>{value === 'all' ? 'All media' : value === 'image' ? 'Images' : 'Files'}</button>)}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:max-w-xl">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media..." className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-white/30" /></div>
          <button type="button" onClick={() => setView('grid')} className={`rounded-lg border p-2 ${view === 'grid' ? 'border-white/30 bg-white/10' : 'border-white/10 text-white/40'}`}><Grid3X3 className="size-4" /></button>
          <button type="button" onClick={() => setView('list')} className={`rounded-lg border p-2 ${view === 'list' ? 'border-white/30 bg-white/10' : 'border-white/10 text-white/40'}`}><List className="size-4" /></button>
        </div>
      </div>

      {uploadOpen && <form action={uploadMediaAssets} className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6">
        <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Upload media</h3><p className="mt-1 text-xs text-white/35">Select up to 30 files. Maximum 10 MB each.</p></div><button type="button" onClick={() => setUploadOpen(false)} className="text-white/40"><X className="size-5" /></button></div>
        <input type="file" name="files" multiple required className="mt-5 block w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm" />
        <button className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black">Upload selected files</button>
      </form>}

      {selected.length > 0 && <form action={bulkDeleteMediaAssets} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3">
        <input type="hidden" name="ids" value={selected.join(',')} />
        <span className="text-sm text-white/65">{selected.length} selected</span>
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-white/45"><input type="checkbox" name="deleteStoredObject" /> Delete physical managed files too</label><button className="flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300"><Trash2 className="size-3.5" /> Bulk remove</button><button type="button" onClick={() => setSelected([])} className="text-xs text-white/40">Clear selection</button></div>
      </form>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center text-sm text-white/35">No matching media.</div> : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((asset) => {
                const isImage = asset.mimeType.startsWith('image/'); const checked = selected.includes(asset.id); const activeNow = activeId === asset.id;
                return <button key={asset.id} type="button" onClick={() => setActiveId(asset.id)} className={`group relative overflow-hidden rounded-xl border text-left transition ${activeNow ? 'border-white/50 ring-1 ring-white/20' : 'border-white/10 hover:border-white/25'}`}>
                  <span onClick={(e) => { e.stopPropagation(); toggle(asset.id); }} className={`absolute left-2 top-2 z-20 flex size-5 items-center justify-center rounded border text-[10px] ${checked ? 'border-white bg-white text-black' : 'border-white/30 bg-black/50 text-transparent'}`}>✓</span>
                  <div className="aspect-square bg-black/20">{isImage ? <img src={asset.url} alt={asset.altText || asset.fileName} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30"><File className="size-8" /><span className="px-2 text-center text-[10px] uppercase">{asset.mimeType.split('/').pop()}</span></div>}</div>
                  <div className="p-2.5"><p className="truncate text-xs text-white/70">{asset.fileName}</p><p className="mt-1 text-[10px] text-white/30">{bytes(asset.size)}</p></div>
                </button>;
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {filtered.map((asset) => <button key={asset.id} type="button" onClick={() => setActiveId(asset.id)} className={`grid w-full grid-cols-[32px_48px_minmax(0,1fr)_110px_90px] items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left last:border-0 ${activeId === asset.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                <span onClick={(e) => { e.stopPropagation(); toggle(asset.id); }} className={`flex size-5 items-center justify-center rounded border text-[10px] ${selected.includes(asset.id) ? 'border-white bg-white text-black' : 'border-white/20 text-transparent'}`}>✓</span>
                <div className="size-10 overflow-hidden rounded bg-white/5">{asset.mimeType.startsWith('image/') ? <img src={asset.url} alt="" className="h-full w-full object-cover" /> : <File className="m-2 size-6 text-white/25" />}</div>
                <div className="min-w-0"><p className="truncate text-sm text-white/70">{asset.fileName}</p><p className="truncate text-[10px] text-white/30">{asset.mimeType}</p></div><span className="text-xs text-white/35">{bytes(asset.size)}</span><span className="text-[10px] text-white/30">{asset.storage}</span>
              </button>)}
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-6 xl:h-fit">
          {active ? <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="flex min-h-52 items-center justify-center bg-black/25 p-4">{active.mimeType.startsWith('image/') ? <img src={active.url} alt={active.altText || active.fileName} className="max-h-72 max-w-full object-contain" /> : <div className="text-center text-white/30"><File className="mx-auto size-10" /><p className="mt-2 text-xs">{active.mimeType}</p></div>}</div>
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">Attachment details</p><p className="mt-1 truncate text-xs text-white/35">{active.fileName}</p></div><a href={active.url} target="_blank" rel="noreferrer" className="text-xs text-white/45 hover:text-white">Open</a></div>
              <div className="mb-4 grid grid-cols-2 gap-2 text-[10px] text-white/35"><span>{bytes(active.size)}</span><span>{active.width && active.height ? `${active.width}×${active.height}` : 'Dimensions —'}</span><span>{active.storage}</span><span>{new Date(active.createdAt).toLocaleDateString()}</span></div>
              <button type="button" onClick={() => navigator.clipboard.writeText(active.url)} className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 hover:text-white"><Copy className="size-3.5" /> Copy URL</button>
              <form action={updateMediaAsset.bind(null, active.id)} className="space-y-3">
                <label className="block text-xs text-white/45">File name<input name="fileName" defaultValue={active.fileName} className={field} /></label>
                <label className="block text-xs text-white/45">Alt text<input name="altText" defaultValue={active.altText ?? ''} className={field} /></label>
                <label className="block text-xs text-white/45">Caption<textarea name="caption" rows={3} defaultValue={active.caption ?? ''} className={field} /></label>
                <input type="hidden" name="mimeType" value={active.mimeType} /><input type="hidden" name="width" value={active.width ?? ''} /><input type="hidden" name="height" value={active.height ?? ''} />
                <button className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">Save attachment details</button>
              </form>
              <form action={deleteMediaAsset.bind(null, active.id)} className="mt-4 border-t border-white/10 pt-4">{active.managed && <label className="mb-3 flex items-center gap-2 text-xs text-white/40"><input type="checkbox" name="deleteStoredObject" /> Delete stored file too</label>}<button className="flex items-center gap-2 text-xs text-red-300"><Trash2 className="size-3.5" /> Remove permanently</button></form>
            </div>
          </div> : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30"><ImageIcon className="mx-auto mb-3 size-8" />Select an attachment to view details.</div>}
        </aside>
      </div>
    </div>
  );
}
