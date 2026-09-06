'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { X } from 'lucide-react';
import CleanFilmGrid from '@/components/sections/gallery/CleanFilmGrid';
import ManifestoHero from '@/components/sections/gallery/ManifestoHero';
import { ContentWatermarkScope } from '@/components/ui/ContentWatermarkScope';
import { DeferredMount } from '@/components/ui/DeferredMount';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePerformance } from '@/hooks/usePerformance';
import type { ContentWatermarkSettings } from '@/lib/content-watermark';
import type { GallerySettings } from '@/lib/gallery-settings';

const GLSLHills = dynamic(() => import('@/components/ui/glsl-hills').then((mod) => mod.GLSLHills), {
  ssr: false,
});

export function GalleryPageClient({
  content,
  watermark,
  activeTag,
}: {
  content: GallerySettings;
  watermark: ContentWatermarkSettings;
  activeTag?: string | null;
}) {
  const { isLowPowerMode } = usePerformance();

  return (
    <main className="bg-background min-h-screen selection:bg-cyan-500/30 selection:text-cyan-500 overflow-x-hidden relative">
      {!isLowPowerMode && (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-50 mix-blend-multiply dark:mix-blend-screen">
          <DeferredMount>
            <GLSLHills />
          </DeferredMount>
        </div>
      )}
      <div className="relative z-10">
        <ManifestoHero isLowPowerMode={isLowPowerMode} content={content} />
        {activeTag ? (
          <div className="container mx-auto -mt-3 mb-4 px-4 sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-background/85 px-4 py-3 shadow-sm backdrop-blur-md">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Gallery filter</p>
                <p className="mt-1 truncate text-sm font-medium">Showing tag <span className="text-cyan-500">#{activeTag}</span></p>
              </div>
              <Link
                href="/gallery"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-3 py-2 text-xs font-medium transition hover:bg-foreground/[0.08]"
              >
                <X className="size-3.5" />
                Clear filter
              </Link>
            </div>
          </div>
        ) : null}
        <ErrorBoundary fallback={<div className="container mx-auto py-20 text-center">Gallery Grid Unavailable</div>}>
          <ContentWatermarkScope settings={watermark}>
            <CleanFilmGrid isLowPowerMode={isLowPowerMode} content={content} />
          </ContentWatermarkScope>
        </ErrorBoundary>
      </div>
    </main>
  );
}
