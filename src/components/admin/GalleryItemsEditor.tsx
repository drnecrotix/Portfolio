'use client';

import { useMemo, useState } from 'react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import type { GalleryItemSetting } from '@/lib/gallery-settings';

const input = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-white/30';

function nextId() {
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function GalleryItemsEditor({ initialItems }: { initialItems: GalleryItemSetting[] }) {
  const [items, setItems] = useState<GalleryItemSetting[]>(initialItems.map((item) => ({ ...item, type: 'image' })));
  const serialized = useMemo(() => JSON.stringify(items.map((item, index) => ({ ...item, type: 'image', order: index }))), [items]);

  const addItem = () => setItems((current) => [...current, {
    id: nextId(),
    mediaUrl: '',
    thumbnailUrl: '',
    title: 'New gallery item',
    description: '',
    category: 'Gallery',
    type: 'image',
    isVisible: true,
    order: current.length,
  }]);

  const update = (index: number, patch: Partial<GalleryItemSetting>) => {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch, type: 'image' } : item));
  };

  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <input type="hidden" name="galleryItems" value={serialized} readOnly />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/35">Gallery images</p>
          <h3 className="mt-2 text-xl font-semibold">Selected images</h3>
          <p className="mt-2 max-w-3xl text-sm text-white/40">Choose each image individually from Media Library. Every image can have its own title, description, collection, visibility and display order.</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">+ Add image</button>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-white/10 text-xs text-white/45">{index + 1}</span>
                <div><p className="text-sm font-medium">{item.title || 'Untitled image'}</p><p className="text-xs text-white/30">{item.category || 'Gallery'} · image</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-25">↑</button>
                <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs disabled:opacity-25">↓</button>
                <label className="flex items-center gap-2 px-2 text-xs text-white/50"><input type="checkbox" checked={item.isVisible} onChange={(e) => update(index, { isVisible: e.target.checked })} /> Visible</label>
                <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300">Remove</button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <MediaPicker value={item.mediaUrl} onChange={(url) => update(index, { mediaUrl: url, thumbnailUrl: item.thumbnailUrl || url })} label="Gallery image" initialKind="image" lockKind />
                <MediaPicker value={item.thumbnailUrl} onChange={(url) => update(index, { thumbnailUrl: url })} label="Thumbnail override (optional)" initialKind="image" lockKind />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <label className="text-xs text-white/45">Title<input value={item.title} onChange={(e) => update(index, { title: e.target.value })} className={input} /></label>
                <label className="text-xs text-white/45">Collection / category<input value={item.category} onChange={(e) => update(index, { category: e.target.value })} className={input} /></label>
                <label className="text-xs text-white/45 md:col-span-2 lg:col-span-1">Description<textarea rows={5} value={item.description} onChange={(e) => update(index, { description: e.target.value })} className={input} /></label>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-white/10 py-14 text-center text-sm text-white/35">No manually selected gallery images yet. Add one to start building the gallery from Media Library.</div>}
      </div>
    </section>
  );
}
