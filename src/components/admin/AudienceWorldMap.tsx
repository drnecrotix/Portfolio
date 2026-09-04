'use client';

import dynamic from 'next/dynamic';
import type { AudienceCountry } from './AudienceWorldMapCanvas';

const AudienceWorldMapCanvas = dynamic(() => import('./AudienceWorldMapCanvas'), {
    ssr: false,
    loading: () => <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">Loading country map…</div>,
});

export function AudienceWorldMap({ countries }: { countries: AudienceCountry[] }) {
    if (!countries.some((country) => country.code !== 'XX' && country.pageViews > 0)) {
        return <div className="flex h-[330px] items-center justify-center px-6 text-center text-sm leading-6 text-muted-foreground">Country data will appear here after public visits are recorded with a supported country header.</div>;
    }

    return (
        <div className="relative h-[330px] overflow-hidden rounded-2xl border border-foreground/10 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.08),transparent_55%)]">
            <AudienceWorldMapCanvas countries={countries.filter((country) => country.code !== 'XX')} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
    );
}
