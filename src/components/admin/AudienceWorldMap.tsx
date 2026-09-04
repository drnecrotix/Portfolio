'use client';

import dynamic from 'next/dynamic';
import type { AudienceCountry } from './AudienceWorldMapCanvas';

const AudienceWorldMapCanvas = dynamic(() => import('./AudienceWorldMapCanvas'), {
    ssr: false,
    loading: () => <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">Loading country map…</div>,
});

export function AudienceWorldMap({
    countries,
    selectedCode,
}: {
    countries: AudienceCountry[];
    selectedCode?: string | null;
}) {
    const knownCountries = countries.filter((country) => country.code !== 'XX' && country.pageViews > 0);
    if (!knownCountries.length) {
        const unknownViews = countries.find((country) => country.code === 'XX')?.pageViews || 0;
        return (
            <div className="flex h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.015] px-6 text-center">
                <p className="text-sm font-medium">Country attribution is not available yet.</p>
                <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                    {unknownViews > 0
                        ? `${unknownViews} page views were recorded without a supported country header from the edge or hosting proxy.`
                        : 'The map will populate after public visits are recorded with a supported country header from the edge or hosting proxy.'}
                </p>
            </div>
        );
    }

    return (
        <div className="relative h-[330px] overflow-hidden rounded-2xl border border-foreground/10 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.08),transparent_55%)]">
            <AudienceWorldMapCanvas countries={knownCountries} selectedCode={selectedCode} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-foreground/10 bg-background/75 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                Rotate to explore · select a country from the list
            </div>
        </div>
    );
}
