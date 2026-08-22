'use client';

import { useMemo, useState } from 'react';
import { Image as ImageIcon, Link2, Video } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import type { GalleryItemSetting } from '@/lib/gallery-settings';

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';

function nextId() {
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeItem(item: GalleryItemSetting): GalleryItemSetting {
  const type = item.type === 'video' ? 'video' : 'image';
  return {
    ...item,
    type,
    category: type === 'video' ? 'Video' : 'Photo',
    thumbnailUrl: type === 'image' ? (item.mediaUrl || item.thumbnailUrl) : item.thumbnailUrl,
  };
}

export function GalleryItemsEditor({ initialItems }: { initialItems: GalleryItemSetting[] }) {
  const [items, setItems] = useState<GalleryItemSetting[]>(initialItems.map(normalizeItem));
  const serialized = useMemo(() => JSON.stringify(items.map((item, index) => ({ ...item, order: index }))), [items]);

  const addItem = () => setItems((current) => [...current, {
    id: nextId(),
    mediaUrl: '',
    thumbnailUrl: '',
    title: 'New gallery item',
    description: '',
    category: 'Photo',
    type: 'image',
    isVisible: true,
    order: current.length,
  }]);

  const update = (index: number, patch: Partial<GalleryItemSetting>) => {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const setType = (index: number, type: GalleryItemSetting['type']) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        type,
        category: type === 'video' ? 'Video' : 'Photo',
        thumbnailUrl: type === 'image' ? item.mediaUrl : item.thumbnailUrl,
      };
    }));
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
    <section>
      <input type="hidden" name="galleryItems" value={serialized} readOnly />
      <div className="flex flex-col gap-4 border-b border-foreground/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Media library</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Add photos, uploaded videos or public social-media URLs. Video URLs from YouTube, Vimeo, TikTok, Instagram, Facebook, X/Twitter, Pinterest and Dailymotion are recognized automatically.</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">+ Add media</button>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-xs text-muted-foreground">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.title || 'Untitled media'}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">{item.type === 'video' ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}{item.category}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↑</button>
                <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↓</button>
                <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><input type="checkbox" checked={item.isVisible} onChange={(e) => update(index, { isVisible: e.target.checked })} /> Visible</label>
                <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-500">Remove</button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <label className="block text-xs text-muted-foreground">
                  Media type
                  <select value={item.type} onChange={(e) => setType(index, e.target.value === 'video' ? 'video' : 'image')} className={input}>
                    <option value="image">Photo</option>
                    <option value="video">Video</option>
                  </select>
                </label>

                <MediaPicker
                  value={item.mediaUrl}
                  onChange={(url) => update(index, { mediaUrl: url, thumbnailUrl: item.type === 'image' ? url : item.thumbnailUrl })}
                  label={item.type === 'video' ? 'Video file from Media Library' : 'Photo'}
                  initialKind={item.type}
                  lockKind
                />

                {item.type === 'video' && (
                  <>
                    <label className="block text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Social / external media URL</span>
                      <input
                        type="url"
                        value={item.mediaUrl.startsWith('http') ? item.mediaUrl : ''}
                        onChange={(e) => update(index, { mediaUrl: e.target.value.trim() })}
                        placeholder="https://www.instagram.com/reel/... or https://www.pinterest.com/pin/..."
                        className={input}
                      />
                      <span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground/70">Paste a normal public post/video URL. Supported: YouTube, Vimeo, TikTok, Instagram, Facebook, X/Twitter, Pinterest and Dailymotion. Pinterest short links from pin.it are accepted, but a full /pin/ URL is more reliable for embedding.</span>
                    </label>
                    <MediaPicker value={item.thumbnailUrl} onChange={(url) => update(index, { thumbnailUrl: url })} label="Thumbnail override (recommended for social URLs)" initialKind="image" lockKind />
                  </>
                )}
              </div>

              <div className="grid content-start gap-4">
                <label className="text-xs text-muted-foreground">Title<input value={item.title} onChange={(e) => update(index, { title: e.target.value })} className={input} /></label>
                <label className="text-xs text-muted-foreground">Description<textarea rows={5} value={item.description} onChange={(e) => update(index, { description: e.target.value })} className={input} /></label>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-foreground/10 py-12 text-center text-sm text-muted-foreground">No gallery media yet. Use “Add media” to add your first photo or video.</div>}
      </div>
    </section>
  );
}
