'use client';

import { useMemo, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Link2, Loader2, Palette, RefreshCw, Search, Video } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import {
  galleryCreativeTypeLabel,
  galleryCreativeTypeOptions,
  gallerySlug,
  type GalleryCreativeType,
  type GalleryItemSetting,
} from '@/lib/gallery-settings';

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${input} min-h-28 resize-y`;
const detailsClass = 'rounded-xl border border-foreground/10 bg-background/50 p-4';
type ThumbnailState = 'idle' | 'loading' | 'found' | 'missing' | 'error';

function nextId() {
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeItem(item: GalleryItemSetting): GalleryItemSetting {
  const type = item.type === 'video' ? 'video' : 'image';
  return {
    ...item,
    type,
    creativeType: type === 'video' ? 'video' : item.creativeType,
    category: item.category || (type === 'video' ? 'Video' : galleryCreativeTypeLabel(item.creativeType)),
    thumbnailUrl: type === 'image' ? (item.thumbnailUrl || item.mediaUrl) : item.thumbnailUrl,
    additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

function emptyItem(order: number): GalleryItemSetting {
  const id = nextId();
  return {
    id,
    mediaUrl: '',
    thumbnailUrl: '',
    additionalImages: [],
    socialImageUrl: '',
    title: 'New gallery item',
    slug: gallerySlug('New gallery item', id),
    description: '',
    story: '',
    altText: '',
    category: 'Photography',
    creativeType: 'photography',
    tags: [],
    type: 'image',
    artist: '',
    photographer: '',
    model: '',
    location: '',
    dateCreated: '',
    medium: '',
    dimensions: '',
    software: '',
    camera: '',
    lens: '',
    copyrightHolder: '',
    license: '',
    seoTitle: '',
    seoDescription: '',
    isVisible: true,
    isIndexable: true,
    order,
  };
}

export function GalleryItemsEditor({ initialItems }: { initialItems: GalleryItemSetting[] }) {
  const [items, setItems] = useState<GalleryItemSetting[]>(initialItems.map(normalizeItem));
  const [thumbnailStates, setThumbnailStates] = useState<Record<string, ThumbnailState>>({});
  const thumbnailTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const serialized = useMemo(() => JSON.stringify(items.map((item, index) => ({ ...item, order: index }))), [items]);

  const addItem = () => setItems((current) => [...current, emptyItem(current.length)]);

  const update = (index: number, patch: Partial<GalleryItemSetting>) => {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const updateById = (id: string, patch: Partial<GalleryItemSetting>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const updateTitle = (index: number, title: string) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      const oldAutoSlug = gallerySlug(item.title, item.id);
      const shouldUpdateSlug = !item.slug || item.slug === oldAutoSlug;
      return { ...item, title, slug: shouldUpdateSlug ? gallerySlug(title, item.id) : item.slug };
    }));
  };

  const setType = (index: number, type: GalleryItemSetting['type']) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      if (type === 'video') {
        return { ...item, type, creativeType: 'video', category: item.category === 'Photography' ? 'Video' : item.category, additionalImages: [] };
      }
      return {
        ...item,
        type,
        creativeType: item.creativeType === 'video' ? 'photography' : item.creativeType,
        category: item.category === 'Video' ? 'Photography' : item.category,
        thumbnailUrl: item.mediaUrl || item.thumbnailUrl,
      };
    }));
  };

  const setCreativeType = (index: number, creativeType: GalleryCreativeType) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      const nextType = creativeType === 'video' ? 'video' : item.type === 'video' ? 'image' : item.type;
      const oldDefaultCategory = galleryCreativeTypeLabel(item.creativeType);
      const category = !item.category || item.category === oldDefaultCategory || item.category === 'Photo' || item.category === 'Video'
        ? galleryCreativeTypeLabel(creativeType)
        : item.category;
      return { ...item, creativeType, type: nextType, category };
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

  const addSeriesImage = (index: number) => update(index, { additionalImages: [...items[index].additionalImages, ''] });
  const updateSeriesImage = (index: number, imageIndex: number, url: string) => {
    const next = [...items[index].additionalImages];
    next[imageIndex] = url;
    update(index, { additionalImages: next });
  };
  const removeSeriesImage = (index: number, imageIndex: number) => update(index, { additionalImages: items[index].additionalImages.filter((_, i) => i !== imageIndex) });

  const resolveThumbnail = async (id: string, url: string) => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('https://')) {
      setThumbnailStates((current) => ({ ...current, [id]: 'idle' }));
      return;
    }

    setThumbnailStates((current) => ({ ...current, [id]: 'loading' }));
    try {
      const response = await fetch('/api/gallery-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await response.json().catch(() => ({})) as { thumbnailUrl?: string };
      if (response.ok && data.thumbnailUrl) {
        updateById(id, { thumbnailUrl: data.thumbnailUrl });
        setThumbnailStates((current) => ({ ...current, [id]: 'found' }));
      } else {
        updateById(id, { thumbnailUrl: '' });
        setThumbnailStates((current) => ({ ...current, [id]: 'missing' }));
      }
    } catch {
      updateById(id, { thumbnailUrl: '' });
      setThumbnailStates((current) => ({ ...current, [id]: 'error' }));
    }
  };

  const scheduleThumbnail = (id: string, url: string) => {
    if (thumbnailTimers.current[id]) clearTimeout(thumbnailTimers.current[id]);
    setThumbnailStates((current) => ({ ...current, [id]: url.trim() ? 'loading' : 'idle' }));
    thumbnailTimers.current[id] = setTimeout(() => void resolveThumbnail(id, url), 700);
  };

  return (
    <section>
      <input type="hidden" name="galleryItems" value={serialized} readOnly />
      <div className="flex flex-col gap-4 border-b border-foreground/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Visual portfolio</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Add photography, photoshoots, drawings, paintings, digital art or video. Every visible item gets a dedicated public URL; indexable items are also added to the sitemap.</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">+ Add work</button>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => {
          const thumbnailState = thumbnailStates[item.id] ?? (item.thumbnailUrl ? 'found' : 'idle');
          const automaticFailed = thumbnailState === 'missing' || thumbnailState === 'error';

          return (
            <article key={item.id} className="rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-xs text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title || 'Untitled work'}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">{item.type === 'video' ? <Video className="h-3.5 w-3.5" /> : item.creativeType === 'photography' || item.creativeType === 'photoshoot' ? <Camera className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}{galleryCreativeTypeLabel(item.creativeType)} · {item.category}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↑</button>
                  <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↓</button>
                  <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><input type="checkbox" checked={item.isVisible} onChange={(event) => update(index, { isVisible: event.target.checked })} /> Public</label>
                  <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground"><input type="checkbox" checked={item.isIndexable} disabled={!item.isVisible} onChange={(event) => update(index, { isIndexable: event.target.checked })} /> Index</label>
                  <button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-500">Remove</button>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-muted-foreground">Media type<select value={item.type} onChange={(event) => setType(index, event.target.value === 'video' ? 'video' : 'image')} className={input}><option value="image">Image</option><option value="video">Video</option></select></label>
                    <label className="block text-xs text-muted-foreground">Creative type<select value={item.creativeType} onChange={(event) => setCreativeType(index, event.target.value as GalleryCreativeType)} className={input}>{galleryCreativeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  </div>

                  <MediaPicker
                    value={item.mediaUrl}
                    onChange={(url) => update(index, { mediaUrl: url, thumbnailUrl: item.type === 'image' ? url : item.thumbnailUrl })}
                    label={item.type === 'video' ? 'Video file from Media Library' : 'Cover / primary image'}
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
                          onChange={(event) => {
                            const url = event.target.value.trim();
                            update(index, { mediaUrl: url, thumbnailUrl: '' });
                            scheduleThumbnail(item.id, url);
                          }}
                          onBlur={(event) => void resolveThumbnail(item.id, event.target.value)}
                          placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/watch?v=..."
                          className={input}
                        />
                      </label>
                      {thumbnailState === 'loading' && <div className="flex items-center gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-xs text-sky-300"><Loader2 className="h-4 w-4 animate-spin" />Looking for a thumbnail automatically…</div>}
                      {item.thumbnailUrl && thumbnailState === 'found' && (
                        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-3">
                          <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-emerald-300">Thumbnail detected</p><button type="button" onClick={() => void resolveThumbnail(item.id, item.mediaUrl)} className="flex items-center gap-1.5 text-[11px] text-emerald-300/70 hover:text-emerald-300"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.thumbnailUrl} alt="Detected social thumbnail" className="mt-3 max-h-48 w-full rounded-lg object-cover" onError={() => { updateById(item.id, { thumbnailUrl: '' }); setThumbnailStates((current) => ({ ...current, [item.id]: 'missing' })); }} />
                        </div>
                      )}
                      {automaticFailed && <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-4"><p className="text-xs font-medium text-amber-300">Automatic thumbnail unavailable</p><div className="mt-4"><MediaPicker value={item.thumbnailUrl} onChange={(url) => { update(index, { thumbnailUrl: url }); if (url) setThumbnailStates((current) => ({ ...current, [item.id]: 'found' })); }} label="Custom thumbnail" initialKind="image" lockKind /></div></div>}
                      {!item.mediaUrl.startsWith('http') && !item.thumbnailUrl && <MediaPicker value={item.thumbnailUrl} onChange={(url) => update(index, { thumbnailUrl: url })} label="Video thumbnail" initialKind="image" lockKind />}
                    </>
                  )}
                </div>

                <div className="grid content-start gap-4">
                  <label className="text-xs text-muted-foreground">Title<input value={item.title} onChange={(event) => updateTitle(index, event.target.value)} className={input} /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs text-muted-foreground">Slug<input value={item.slug} onChange={(event) => update(index, { slug: gallerySlug(event.target.value, item.id) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground/60">/gallery/{item.slug || 'work'}</span></label>
                    <label className="text-xs text-muted-foreground">Category<input value={item.category} onChange={(event) => update(index, { category: event.target.value })} placeholder="Dark Art, Portrait, Urban..." className={input} /></label>
                  </div>
                  <label className="text-xs text-muted-foreground">Short description<textarea rows={5} value={item.description} onChange={(event) => update(index, { description: event.target.value })} className={area} /></label>
                </div>
              </div>

              {item.type === 'image' && (
                <details className={`${detailsClass} mt-5`}>
                  <summary className="cursor-pointer text-sm font-semibold">Series / photoshoot images <span className="ml-2 text-xs font-normal text-muted-foreground">{item.additionalImages.filter(Boolean).length} extra</span></summary>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Use this for a complete photoshoot, artwork details or a visual series. The primary image above remains the cover.</p>
                  <div className="mt-4 space-y-4">
                    {item.additionalImages.map((image, imageIndex) => (
                      <div key={`${item.id}-series-${imageIndex}`} className="rounded-xl border border-foreground/10 p-3">
                        <div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Image {imageIndex + 2}</span><button type="button" onClick={() => removeSeriesImage(index, imageIndex)} className="text-xs text-red-400">Remove</button></div>
                        <MediaPicker value={image} onChange={(url) => updateSeriesImage(index, imageIndex, url)} label="Series image" initialKind="image" lockKind />
                      </div>
                    ))}
                    <button type="button" onClick={() => addSeriesImage(index)} className="rounded-lg border border-foreground/10 px-3 py-2 text-xs hover:bg-foreground/[0.04]">+ Add image to series</button>
                  </div>
                </details>
              )}

              <details className={`${detailsClass} mt-5`}>
                <summary className="cursor-pointer text-sm font-semibold">Creative metadata</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground md:col-span-2">Alt text<input value={item.altText} onChange={(event) => update(index, { altText: event.target.value })} placeholder="Describe the image naturally for accessibility and image search" className={input} /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">Story / about this work<textarea rows={7} value={item.story} onChange={(event) => update(index, { story: event.target.value })} className={area} /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">Tags<input value={item.tags.join(', ')} onChange={(event) => update(index, { tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="dark art, portrait, Sofia, digital painting" className={input} /></label>
                  <label className="text-xs text-muted-foreground">Artist<input value={item.artist} onChange={(event) => update(index, { artist: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Photographer<input value={item.photographer} onChange={(event) => update(index, { photographer: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Model / subject<input value={item.model} onChange={(event) => update(index, { model: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Location<input value={item.location} onChange={(event) => update(index, { location: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Created / session date<input value={item.dateCreated} onChange={(event) => update(index, { dateCreated: event.target.value })} placeholder="2026 or 2026-09-03" className={input} /></label>
                  <label className="text-xs text-muted-foreground">Medium<input value={item.medium} onChange={(event) => update(index, { medium: event.target.value })} placeholder="Digital painting, acrylic on canvas..." className={input} /></label>
                  <label className="text-xs text-muted-foreground">Dimensions<input value={item.dimensions} onChange={(event) => update(index, { dimensions: event.target.value })} placeholder="50 × 70 cm" className={input} /></label>
                  <label className="text-xs text-muted-foreground">Software<input value={item.software} onChange={(event) => update(index, { software: event.target.value })} placeholder="Affinity Photo, Sketchbook..." className={input} /></label>
                  <label className="text-xs text-muted-foreground">Camera<input value={item.camera} onChange={(event) => update(index, { camera: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Lens<input value={item.lens} onChange={(event) => update(index, { lens: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">Copyright holder<input value={item.copyrightHolder} onChange={(event) => update(index, { copyrightHolder: event.target.value })} className={input} /></label>
                  <label className="text-xs text-muted-foreground">License<input value={item.license} onChange={(event) => update(index, { license: event.target.value })} placeholder="All Rights Reserved" className={input} /></label>
                </div>
              </details>

              <details className={`${detailsClass} mt-5`}>
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4" />Search & social preview</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground md:col-span-2">SEO title<input value={item.seoTitle} onChange={(event) => update(index, { seoTitle: event.target.value })} placeholder="Leave blank to use the work title" className={input} /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">SEO description<textarea rows={4} value={item.seoDescription} onChange={(event) => update(index, { seoDescription: event.target.value })} placeholder="Leave blank to use the short description" className={area} /></label>
                  <div className="md:col-span-2"><MediaPicker value={item.socialImageUrl} onChange={(url) => update(index, { socialImageUrl: url })} label="Optional social / OpenGraph image" initialKind="image" lockKind /></div>
                  <div className="md:col-span-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 text-xs leading-5 text-muted-foreground">
                    <p><strong className="text-foreground/80">Public URL:</strong> /gallery/{item.slug || 'work'}</p>
                    <p className="mt-1"><strong className="text-foreground/80">Search engines:</strong> {item.isVisible && item.isIndexable ? 'index/follow + sitemap' : item.isVisible ? 'noindex/follow' : 'not publicly available'}</p>
                    <p className="mt-1">Image alt text, structured data, OpenGraph and image sitemap data are generated automatically from these fields.</p>
                  </div>
                </div>
              </details>
            </article>
          );
        })}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-foreground/10 py-12 text-center text-sm text-muted-foreground">No gallery works yet. Use “Add work” to add photography, artwork or a photoshoot.</div>}
      </div>
    </section>
  );
}
