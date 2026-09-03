'use client';

import dynamic from 'next/dynamic';
import CleanFilmGrid from '@/components/sections/gallery/CleanFilmGrid';
import ManifestoHero from '@/components/sections/gallery/ManifestoHero';
import { DeferredMount } from '@/components/ui/DeferredMount';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { usePerformance } from '@/hooks/usePerformance';
import type { GallerySettings } from '@/lib/gallery-settings';

const GLSLHills = dynamic(() => import('@/components/ui/glsl-hills').then((mod) => mod.GLSLHills), {
  ssr: false,
});

export function GalleryPageClient({ content, allowLibraryFallback = false }: { content: GallerySettings; allowLibraryFallback?: boolean }) {
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
        <ErrorBoundary fallback={<div className="container mx-auto py-20 text-center">Gallery Grid Unavailable</div>}>
          <CleanFilmGrid isLowPowerMode={isLowPowerMode} content={content} allowLibraryFallback={allowLibraryFallback} />
        </ErrorBoundary>
      </div>
    </main>
  );
}
