'use client';

import { useMemo, useRef, useState } from 'react';
import { Link2, Loader2, Palette, RefreshCw, Search, Video } from 'lucide-react';
import { MediaPicker } from '@/components/admin/MediaPicker';
import {
  galleryCreativeTypeLabel,
  galleryCreativeTypeOptions,
  gallerySlug,
  type GalleryCreativeType,
  type GalleryItemSetting,
} from '@/lib/gallery-settings';

const input = 'mt-2 w-full rounded-xl border border-foreground/10 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground/30 focus:ring-2 focus:ring-foreground/5';
const area = `${input} min-h-24 resize-y`;
type ThumbnailState = 'idle' | 'loading' | 'found' | 'missing' | 'error';
type EditorTab = 'content' | 'details' | 'series' | 'seo';

function nextId() {
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseTags(value: string) {
  return Array.from(new Set(value
    .split(',')
    .map((tag) => tag.trim().replace(/^#+/, '').slice(0, 60))
    .filter(Boolean)))
    .slice(0, 30);
}

function normalizeItem(item: GalleryItemSetting): GalleryItemSetting {
  const type = item.creativeType === 'video' ? 'video' : 'image';
  return {
    ...item,
    type,
    sourceUrl: item.sourceUrl || '',
    isNsfw: item.isNsfw === true,
    thumbnailUrl: type === 'image' ? (item.thumbnailUrl || item.mediaUrl) : item.thumbnailUrl,
    additionalImages: Array.isArray(item.additionalImages) ? item.additionalImages : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    deviceType: item.deviceType || '',
    filmStock: item.filmStock || '',
    sensorFormat: item.sensorFormat || '',
    focalLength: item.focalLength || '',
    aperture: item.aperture || '',
    shutterSpeed: item.shutterSpeed || '',
    iso: item.iso || '',
    lighting: item.lighting || '',
    surface: item.surface || '',
    materials: item.materials || '',
    technique: item.technique || '',
    resolution: item.resolution || '',
    videoCredits: item.videoCredits || '',
    cinematographyCredits: item.cinematographyCredits || '',
    editingCredits: item.editingCredits || '',
    audioCredits: item.audioCredits || '',
    musicCredits: item.musicCredits || '',
    textCredits: item.textCredits || '',
    colorGradingCredits: item.colorGradingCredits || '',
    motionGraphicsCredits: item.motionGraphicsCredits || '',
    duration: item.duration || '',
    frameRate: item.frameRate || '',
  };
}

function emptyItem(order: number): GalleryItemSetting {
  const id = nextId();
  return {
    id,
    mediaUrl: '',
    sourceUrl: '',
    thumbnailUrl: '',
    additionalImages: [],
    socialImageUrl: '',
    title: 'New gallery item',
    slug: gallerySlug('New gallery item', id),
    description: '',
    story: '',
    altText: '',
    creativeType: 'photography',
    tags: [],
    type: 'image',
    isNsfw: false,
    artist: '',
    photographer: '',
    model: '',
    location: '',
    dateCreated: '',
    medium: '',
    dimensions: '',
    software: '',
    deviceType: '',
    camera: '',
    lens: '',
    filmStock: '',
    sensorFormat: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: '',
    lighting: '',
    surface: '',
    materials: '',
    technique: '',
    resolution: '',
    videoCredits: '',
    cinematographyCredits: '',
    editingCredits: '',
    audioCredits: '',
    musicCredits: '',
    textCredits: '',
    colorGradingCredits: '',
    motionGraphicsCredits: '',
    duration: '',
    frameRate: '',
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
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id || '');
  const [editorTab, setEditorTab] = useState<EditorTab>('content');
  const [query, setQuery] = useState('');
  const [thumbnailStates, setThumbnailStates] = useState<Record<string, ThumbnailState>>({});
  const thumbnailTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const serialized = useMemo(() => JSON.stringify(items.map((item, index) => ({ ...item, order: index }))), [items]);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const selected = items[selectedIndex];

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.title} ${item.slug} ${galleryCreativeTypeLabel(item.creativeType)} ${item.tags.join(' ')}`.toLowerCase().includes(needle));
  }, [items, query]);

  const addItem = () => {
    const item = emptyItem(items.length);
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
    setEditorTab('content');
  };

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

  const setCreativeType = (index: number, creativeType: GalleryCreativeType) => {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      const type: GalleryItemSetting['type'] = creativeType === 'video' ? 'video' : 'image';
      return {
        ...item,
        creativeType,
        type,
        sourceUrl: type === 'image' ? '' : item.sourceUrl,
        additionalImages: type === 'video' ? [] : item.additionalImages,
        thumbnailUrl: type === 'image' ? (item.thumbnailUrl || (item.mediaUrl.startsWith('/') ? item.mediaUrl : '')) : item.thumbnailUrl,
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

  const removeSelected = () => {
    if (!selected) return;
    setItems((current) => current.filter((item) => item.id !== selected.id));
    const next = items[selectedIndex + 1] || items[selectedIndex - 1];
    setSelectedId(next?.id || '');
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
      const response = await fetch('/api/gallery-thumbnail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: trimmed }) });
      const data = await response.json().catch(() => ({})) as { thumbnailUrl?: string; sourceUrl?: string; embedUrl?: string };
      if (response.ok) {
        updateById(id, {
          sourceUrl: data.sourceUrl || trimmed,
          mediaUrl: data.embedUrl || data.sourceUrl || trimmed,
          thumbnailUrl: data.thumbnailUrl || '',
        });
        setThumbnailStates((current) => ({ ...current, [id]: data.thumbnailUrl ? 'found' : 'missing' }));
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

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'content', label: 'Content' },
    { id: 'details', label: 'Work details' },
    { id: 'series', label: 'Series' },
    { id: 'seo', label: 'SEO' },
  ];

  const field = (label: string, key: keyof GalleryItemSetting, placeholder = '', className = '') => (
    <label className={`text-xs text-muted-foreground ${className}`}>
      {label}
      <input
        value={String(selected?.[key] ?? '')}
        onChange={(event) => update(selectedIndex, { [key]: event.target.value } as Partial<GalleryItemSetting>)}
        placeholder={placeholder}
        className={input}
      />
    </label>
  );

  const detailsFields = selected ? (() => {
    switch (selected.creativeType) {
      case 'photography':
        return (
          <>
            {field('Photographer', 'photographer', 'Photographer name')}
            {field('Model / subject', 'model', 'Person, product, place or subject')}
            {field('Location', 'location')}
            {field('Session / capture date', 'dateCreated')}
            {field('Device type', 'deviceType', 'DSLR, mirrorless, smartphone, film camera...')}
            {field('Camera / device', 'camera', 'Sony A7 IV, iPhone 17 Pro...')}
            {field('Lens', 'lens', 'Sony FE 50mm F1.8...')}
            {field('Film stock', 'filmStock', 'Kodak Portra 400...')}
            {field('Sensor / format', 'sensorFormat', 'Full frame, APS-C, 35mm...')}
            {field('Focal length', 'focalLength', '50 mm')}
            {field('Aperture', 'aperture', 'f/1.8')}
            {field('Shutter', 'shutterSpeed', '1/250 s')}
            {field('ISO', 'iso', 'ISO 400')}
            {field('Lighting', 'lighting', 'Natural light, softbox, flash...', 'sm:col-span-2')}
          </>
        );
      case 'video':
        return (
          <>
            {field('Video / direction credits', 'videoCredits', 'Director, creator, production...')}
            {field('Camera / cinematography credits', 'cinematographyCredits', 'Camera operator, cinematographer...')}
            {field('Editing credits', 'editingCredits', 'Editor / montage')}
            {field('Audio / sound credits', 'audioCredits', 'Recording, mix, sound design...')}
            {field('Music credits', 'musicCredits', 'Composer, artist, track...')}
            {field('Text / script credits', 'textCredits', 'Writer, script, narration...')}
            {field('Color grading credits', 'colorGradingCredits')}
            {field('Motion graphics / animation', 'motionGraphicsCredits')}
            {field('Location', 'location')}
            {field('Release / creation date', 'dateCreated')}
            {field('Duration', 'duration', '03:42')}
            {field('Resolution', 'resolution', '4K, 3840×2160')}
            {field('Frame rate', 'frameRate', '24 fps')}
            {field('Editing / production software', 'software', 'DaVinci Resolve, Premiere Pro...', 'sm:col-span-2')}
          </>
        );
      case 'painting':
        return (
          <>
            {field('Artist', 'artist')}
            {field('Created', 'dateCreated')}
            {field('Medium', 'medium', 'Graphite, charcoal, ink, watercolor, acrylic, oil...')}
            {field('Materials', 'materials', 'Pencil, pigment, ink, paint, mixed traditional media...')}
            {field('Technique', 'technique', 'Hatching, line work, glazing, impasto, wet-on-wet...')}
            {field('Surface / support', 'surface', 'Paper, canvas, wood panel...')}
            {field('Dimensions', 'dimensions', 'A4, 21 × 29.7 cm, 60 × 80 cm...')}
          </>
        );
      case 'drawing':
      case 'mixed-media':
        return (
          <>
            {field('Artist', 'artist')}
            {field('Created', 'dateCreated')}
            {field('Medium', 'medium', 'Graphite, charcoal, ink, watercolor, acrylic, oil...')}
            {field('Materials', 'materials')}
            {field('Technique', 'technique')}
            {field('Surface / support', 'surface', 'Paper, canvas, wood panel...')}
            {field('Dimensions', 'dimensions')}
          </>
        );
      case 'digital-art':
        return (
          <>
            {field('Artist', 'artist')}
            {field('Created', 'dateCreated')}
            {field('Software', 'software', 'Affinity, Photoshop, Procreate...')}
            {field('Device / tablet', 'deviceType', 'XPPen, iPad, display tablet...')}
            {field('Technique', 'technique', 'Digital painting, photobash, vector...')}
            {field('Canvas dimensions', 'dimensions', '4000 × 6000 px')}
            {field('Output resolution', 'resolution', '4K, 300 DPI...')}
          </>
        );
      default:
        return (
          <>
            {field('Creator / artist', 'artist')}
            {field('Created', 'dateCreated')}
            {field('Location', 'location')}
            {field('Medium', 'medium')}
            {field('Materials', 'materials')}
            {field('Technique', 'technique')}
            {field('Dimensions', 'dimensions')}
            {field('Software', 'software')}
          </>
        );
    }
  })() : null;

  return (
    <section>
      <input type="hidden" name="galleryItems" value={serialized} readOnly />
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-3">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div><h3 className="text-sm font-semibold">Gallery works</h3><p className="mt-1 text-[11px] text-muted-foreground">{items.length} total · {items.filter((item) => item.isVisible).length} public</p></div>
            <button type="button" onClick={addItem} className="rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background">+ Add</button>
          </div>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, type or tag…" className="w-full rounded-xl border border-foreground/10 bg-background py-2.5 pl-9 pr-3 text-xs outline-none" />
          </label>
          <div className="mt-3 max-h-[560px] space-y-1 overflow-y-auto pr-1">
            {visibleItems.map((item) => {
              const active = item.id === selected?.id;
              return (
                <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setEditorTab('content'); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${active ? 'border-foreground/20 bg-foreground/[0.07]' : 'border-transparent hover:bg-foreground/[0.035]'}`}>
                  <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.03]">
                    {item.thumbnailUrl || (item.type === 'image' && item.mediaUrl) ? <img src={item.thumbnailUrl || item.mediaUrl} alt="" className={`h-full w-full object-cover ${item.isNsfw ? 'scale-110 blur-md' : ''}`} /> : item.type === 'video' ? <Video className="size-4 text-muted-foreground" /> : <Palette className="size-4 text-muted-foreground" />}
                    {item.isNsfw && <span className="absolute inset-0 grid place-items-center bg-black/30 text-[7px] font-bold tracking-[0.16em] text-white">NSFW</span>}
                  </span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.title || 'Untitled work'}</span><span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span>{galleryCreativeTypeLabel(item.creativeType)}</span><span>·</span><span className={item.isVisible ? 'text-emerald-500' : ''}>{item.isVisible ? 'Public' : 'Hidden'}</span>{item.isNsfw && <><span>·</span><span className="text-amber-400">NSFW</span></>}</span></span>
                </button>
              );
            })}
            {visibleItems.length === 0 && <div className="py-10 text-center text-xs text-muted-foreground">No matching works.</div>}
          </div>
        </aside>

        <div className="min-w-0 rounded-2xl border border-foreground/10 bg-foreground/[0.015] p-4 sm:p-5">
          {!selected ? (
            <div className="grid min-h-[520px] place-items-center text-sm text-muted-foreground">Select a work or add a new one.</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-foreground/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Editing</p><h3 className="mt-1 truncate text-xl font-semibold">{selected.title || 'Untitled work'}</h3><p className="mt-1 text-xs text-muted-foreground">/gallery/{selected.slug || 'work'}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={selectedIndex === 0} onClick={() => move(selectedIndex, -1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↑</button>
                  <button type="button" disabled={selectedIndex === items.length - 1} onClick={() => move(selectedIndex, 1)} className="rounded-lg border border-foreground/10 px-3 py-1.5 text-xs disabled:opacity-25">↓</button>
                  <label className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={selected.isVisible} onChange={(event) => update(selectedIndex, { isVisible: event.target.checked })} /> Public</label>
                  <label className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={selected.isIndexable} disabled={!selected.isVisible} onChange={(event) => update(selectedIndex, { isIndexable: event.target.checked })} /> Index</label>
                  <button type="button" onClick={removeSelected} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-500">Remove</button>
                </div>
              </div>

              <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-foreground/[0.03] p-1 scrollbar-hide">
                {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setEditorTab(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${editorTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>)}
              </div>

              {editorTab === 'content' && (
                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <label className="block text-xs text-muted-foreground">Creative type<select value={selected.creativeType} onChange={(event) => setCreativeType(selectedIndex, event.target.value as GalleryCreativeType)} className={input}>{galleryCreativeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-1 block text-[10px] text-muted-foreground/60">The media kind and Work details are selected automatically from Creative Type.</span></label>
                    <label className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-xs text-muted-foreground"><input type="checkbox" checked={selected.isNsfw} onChange={(event) => update(selectedIndex, { isNsfw: event.target.checked })} className="mt-0.5" /><span><strong className="block font-semibold text-foreground/85">NSFW preview</strong><span className="mt-1 block leading-5">Blur the real Gallery thumbnail and show an NSFW overlay. The full media remains available from View full work.</span></span></label>
                    <MediaPicker value={selected.mediaUrl} onChange={(url) => update(selectedIndex, { mediaUrl: url, sourceUrl: '', thumbnailUrl: selected.type === 'image' ? url : selected.thumbnailUrl })} label={selected.type === 'video' ? 'Video file from Media Library' : 'Cover / primary image'} initialKind={selected.type} lockKind />
                    {selected.type === 'video' && (
                      <>
                        <label className="block text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Link2 className="size-3.5" />Social / external media URL</span><input type="url" value={selected.sourceUrl} onChange={(event) => { const url = event.target.value.trim(); update(selectedIndex, { sourceUrl: url, mediaUrl: url, thumbnailUrl: '' }); scheduleThumbnail(selected.id, url); }} onBlur={(event) => void resolveThumbnail(selected.id, event.target.value)} placeholder="YouTube, TikTok, Vimeo, Instagram, Facebook, X, Pinterest, Dailymotion…" className={input} /><span className="mt-1 block text-[10px] leading-4 text-muted-foreground/60">The original social URL is preserved separately from the embed URL so thumbnails can be refreshed after saving.</span></label>
                        {thumbnailStates[selected.id] === 'loading' && <div className="flex items-center gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3 text-xs text-sky-300"><Loader2 className="size-4 animate-spin" />Looking for thumbnail…</div>}
                        {(thumbnailStates[selected.id] === 'missing' || thumbnailStates[selected.id] === 'error') && <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-300">Automatic thumbnail was not available from this platform. Add a custom thumbnail below; the video/embed URL is still kept.</div>}
                        {selected.thumbnailUrl && <div className="rounded-xl border border-foreground/10 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Video thumbnail</span><button type="button" onClick={() => void resolveThumbnail(selected.id, selected.sourceUrl || selected.mediaUrl)} className="flex items-center gap-1 text-[11px] text-muted-foreground"><RefreshCw className="size-3" />Retry</button></div><div className="relative overflow-hidden rounded-lg"><img src={selected.thumbnailUrl} alt="Video thumbnail" className={`max-h-44 w-full object-cover ${selected.isNsfw ? 'scale-110 blur-xl' : ''}`} />{selected.isNsfw && <div className="absolute inset-0 grid place-items-center bg-black/25 text-sm font-bold tracking-[0.18em] text-white">NSFW</div>}</div></div>}
                        <MediaPicker value={selected.thumbnailUrl} onChange={(url) => { update(selectedIndex, { thumbnailUrl: url }); setThumbnailStates((current) => ({ ...current, [selected.id]: url ? 'found' : 'idle' })); }} label="Custom video thumbnail (optional override)" initialKind="image" lockKind />
                      </>
                    )}
                  </div>
                  <div className="grid content-start gap-4">
                    <label className="text-xs text-muted-foreground">Title<input value={selected.title} onChange={(event) => updateTitle(selectedIndex, event.target.value)} className={input} /></label>
                    <label className="text-xs text-muted-foreground">Slug<input value={selected.slug} onChange={(event) => update(selectedIndex, { slug: gallerySlug(event.target.value, selected.id) })} className={input} /><span className="mt-1 block text-[10px] text-muted-foreground/60">/gallery/{selected.slug || 'work'}</span></label>
                    <label className="text-xs text-muted-foreground">Short description<textarea rows={5} value={selected.description} onChange={(event) => update(selectedIndex, { description: event.target.value })} className={area} /></label>
                    <label className="text-xs text-muted-foreground">Alt text<input value={selected.altText} onChange={(event) => update(selectedIndex, { altText: event.target.value })} placeholder="Describe the image naturally" className={input} /></label>
                    <label className="text-xs text-muted-foreground">Tags<input value={selected.tags.join(', ')} onChange={(event) => update(selectedIndex, { tags: parseTags(event.target.value) })} placeholder="portrait, night, cinematic" className={input} /><span className="mt-1 block text-[10px] leading-4 text-muted-foreground/60">Comma-separated. Leading # is removed automatically. Public tags link to filtered Gallery views.</span></label>
                  </div>
                </div>
              )}

              {editorTab === 'details' && (
                <div className="mt-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3">
                    <div><p className="text-sm font-semibold">{galleryCreativeTypeLabel(selected.creativeType)} details</p><p className="mt-1 text-xs text-muted-foreground">Only fields relevant to this Creative Type are shown.</p></div>
                    <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Type-aware</span>
                  </div>
                  <label className="block text-xs text-muted-foreground">Story / about this work<textarea rows={7} value={selected.story} onChange={(event) => update(selectedIndex, { story: event.target.value })} className={area} /></label>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{detailsFields}</div>
                  <div className="grid gap-4 border-t border-foreground/10 pt-5 sm:grid-cols-2 xl:grid-cols-3">
                    {field('Copyright holder', 'copyrightHolder')}
                    {field('License', 'license', 'All Rights Reserved', 'sm:col-span-2')}
                  </div>
                  <p className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3 text-xs leading-5 text-muted-foreground">Work details are optional. Empty values are not rendered publicly. Changing Creative Type keeps previously entered metadata in the record, but only the relevant fields for the selected type are displayed.</p>
                </div>
              )}

              {editorTab === 'series' && (
                <div className="mt-5">
                  {selected.type !== 'image' ? <p className="rounded-xl border border-foreground/10 p-5 text-sm text-muted-foreground">Series images are available for image works only.</p> : <div className="space-y-4"><p className="text-xs leading-5 text-muted-foreground">Use this for a photography set, artwork details or a visual series. The primary image remains the cover.</p>{selected.additionalImages.map((image, imageIndex) => <div key={`${selected.id}-series-${imageIndex}`} className="rounded-xl border border-foreground/10 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Image {imageIndex + 2}</span><button type="button" onClick={() => removeSeriesImage(selectedIndex, imageIndex)} className="text-xs text-red-400">Remove</button></div><MediaPicker value={image} onChange={(url) => updateSeriesImage(selectedIndex, imageIndex, url)} label="Series image" initialKind="image" lockKind /></div>)}<button type="button" onClick={() => addSeriesImage(selectedIndex)} className="rounded-lg border border-foreground/10 px-3 py-2 text-xs hover:bg-foreground/[0.04]">+ Add image to series</button></div>}
                </div>
              )}

              {editorTab === 'seo' && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground md:col-span-2">SEO title<input value={selected.seoTitle} onChange={(event) => update(selectedIndex, { seoTitle: event.target.value })} placeholder="Leave blank to use the work title" className={input} /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">SEO description<textarea rows={4} value={selected.seoDescription} onChange={(event) => update(selectedIndex, { seoDescription: event.target.value })} placeholder="Leave blank to use the short description" className={area} /></label>
                  <div className="md:col-span-2"><MediaPicker value={selected.socialImageUrl} onChange={(url) => update(selectedIndex, { socialImageUrl: url })} label="Optional social / OpenGraph image" initialKind="image" lockKind /></div>
                  <div className="md:col-span-2 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 text-xs leading-5 text-muted-foreground"><p><strong className="text-foreground/80">Public URL:</strong> /gallery/{selected.slug || 'work'}</p><p className="mt-1"><strong className="text-foreground/80">Search engines:</strong> {selected.isVisible && selected.isIndexable ? 'index/follow + sitemap' : selected.isVisible ? 'noindex/follow' : 'not publicly available'}</p><p className="mt-1"><strong className="text-foreground/80">NSFW:</strong> {selected.isNsfw ? 'thumbnail blurred; full work remains available' : 'off'}</p></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
