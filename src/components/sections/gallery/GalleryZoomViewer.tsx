'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));
}

export function GalleryZoomViewer({
  images,
  alt,
  title,
  copyrightHolder,
}: {
  images: string[];
  alt: string;
  title: string;
  copyrightHolder?: string;
}) {
  const safeImages = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const dragOrigin = useRef<Point | null>(null);
  const pointerOrigin = useRef<Point | null>(null);

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    dragOrigin.current = null;
    pointerOrigin.current = null;
  }, []);

  const selectImage = useCallback((index: number) => {
    if (!safeImages.length) return;
    const next = (index + safeImages.length) % safeImages.length;
    setActiveIndex(next);
    resetView();
  }, [resetView, safeImages.length]);

  const setZoomLevel = (nextZoom: number) => {
    const next = clampZoom(nextZoom);
    setZoom(next);
    if (next === MIN_ZOOM) setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && safeImages.length > 1) selectImage(activeIndex - 1);
      if (event.key === 'ArrowRight' && safeImages.length > 1) selectImage(activeIndex + 1);
      if (event.key === 'Escape') resetView();
      if (event.key === '+' || event.key === '=') setZoomLevel(zoom + ZOOM_STEP);
      if (event.key === '-') setZoomLevel(zoom - ZOOM_STEP);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, resetView, safeImages.length, selectImage, zoom]);

  if (!safeImages.length) return null;
  const activeImage = safeImages[Math.min(activeIndex, safeImages.length - 1)];

  return (
    <div className="mx-auto w-full max-w-[1180px] select-none" onContextMenu={(event) => event.preventDefault()}>
      <div
        className={cn(
          'relative h-[clamp(360px,66vh,720px)] overflow-hidden rounded-[1.25rem] border border-foreground/10 bg-black/95 shadow-[0_24px_80px_rgba(0,0,0,0.22)]',
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
        )}
        onWheel={(event) => {
          event.preventDefault();
          setZoomLevel(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
        }}
        onDoubleClick={() => setZoomLevel(zoom > 1 ? MIN_ZOOM : 2)}
        onPointerDown={(event) => {
          if (zoom <= 1) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerOrigin.current = { x: event.clientX, y: event.clientY };
          dragOrigin.current = offset;
        }}
        onPointerMove={(event) => {
          if (zoom <= 1 || !pointerOrigin.current || !dragOrigin.current) return;
          setOffset({
            x: dragOrigin.current.x + event.clientX - pointerOrigin.current.x,
            y: dragOrigin.current.y + event.clientY - pointerOrigin.current.y,
          });
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          pointerOrigin.current = null;
          dragOrigin.current = null;
        }}
        onPointerCancel={() => {
          pointerOrigin.current = null;
          dragOrigin.current = null;
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-150 ease-out will-change-transform"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}
        >
          <Image
            src={activeImage}
            alt={activeIndex === 0 ? alt : `${alt} - ${activeIndex + 1}`}
            fill
            priority={activeIndex === 0}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="pointer-events-none object-contain [-webkit-user-drag:none] [-webkit-touch-callout:none]"
            sizes="(max-width: 768px) 100vw, 1180px"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />

        <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 text-white shadow-lg backdrop-blur-md sm:left-4 sm:top-4">
          <button type="button" onClick={() => setZoomLevel(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} className="rounded-full p-2 transition hover:bg-white/10 disabled:opacity-30" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className="min-w-14 rounded-full px-2 py-2 font-mono text-[10px] tracking-wider transition hover:bg-white/10" aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => setZoomLevel(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} className="rounded-full p-2 transition hover:bg-white/10 disabled:opacity-30" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className="rounded-full p-2 transition hover:bg-white/10" aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
        </div>

        {safeImages.length > 1 && (
          <>
            <button type="button" onClick={() => selectImage(activeIndex - 1)} className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2.5 text-white backdrop-blur-md transition hover:bg-black/75" aria-label="Previous image"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => selectImage(activeIndex + 1)} className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2.5 text-white backdrop-blur-md transition hover:bg-black/75" aria-label="Next image"><ChevronRight className="h-5 w-5" /></button>
            <div className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/55 px-3 py-2 font-mono text-[10px] tracking-widest text-white/80 backdrop-blur-md sm:right-4 sm:top-4">{activeIndex + 1} / {safeImages.length}</div>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-4 pb-3 pt-14 text-[10px] uppercase tracking-[0.14em] text-white/55 sm:px-5 sm:pb-4">
          <span>Protected preview · wheel / double-click to zoom</span>
          {copyrightHolder ? <span className="text-right">© {copyrightHolder}</span> : <span>{title}</span>}
        </div>
      </div>

      {safeImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Image series">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => selectImage(index)}
              onContextMenu={(event) => event.preventDefault()}
              className={cn('relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border bg-black transition sm:h-20 sm:w-28', activeIndex === index ? 'border-foreground/70 ring-1 ring-foreground/20' : 'border-foreground/10 opacity-60 hover:opacity-100')}
              aria-label={`View image ${index + 1}`}
            >
              <Image src={image} alt="" fill draggable={false} className="pointer-events-none object-cover [-webkit-user-drag:none]" sizes="112px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
