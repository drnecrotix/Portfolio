'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Play } from 'lucide-react';

const STORAGE_KEY = 'necrotix:external-media:allow';

function providerName(src: string) {
    try {
        const host = new URL(src).hostname.replace(/^www\./, '');
        if (host.includes('youtube')) return 'YouTube';
        if (host.includes('vimeo')) return 'Vimeo';
        if (host.includes('tiktok')) return 'TikTok';
        if (host.includes('instagram')) return 'Instagram';
        if (host.includes('facebook')) return 'Facebook';
        if (host.includes('twitter') || host.includes('x.com')) return 'X / Twitter';
        if (host.includes('pinterest')) return 'Pinterest';
        if (host.includes('dailymotion')) return 'Dailymotion';
        return host;
    } catch {
        return 'external provider';
    }
}

export function ExternalMediaEmbed({ src, title }: { src: string; title: string }) {
    const [allowed, setAllowed] = useState(false);
    const provider = useMemo(() => providerName(src), [src]);

    useEffect(() => {
        try {
            if (window.sessionStorage.getItem(STORAGE_KEY) === '1') setAllowed(true);
        } catch {
            // Restricted browser storage simply means the visitor is asked again next time.
        }
    }, []);

    const allowForSession = () => {
        try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* continue without persistence */ }
        setAllowed(true);
    };

    if (allowed) {
        return (
            <iframe
                src={src}
                className="h-full w-full"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                title={title}
            />
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 px-6 text-center text-white">
            <div className="max-w-md">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]"><Play className="ml-0.5 size-5" /></span>
                <h2 className="mt-5 text-lg font-semibold">Load media from {provider}?</h2>
                <p className="mt-2 text-sm leading-6 text-white/55">Loading this content connects your browser to {provider}. Your IP address, browser information and provider cookies or storage may be processed under that provider&apos;s terms.</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={allowForSession} className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90">Load external media</button>
                    <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/65 transition hover:text-white">Open provider <ExternalLink className="size-3.5" /></a>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-white/40">Your choice is remembered only for this browser tab/session. <Link href="/cookies" className="underline underline-offset-4 hover:text-white/70">Cookie Policy</Link></p>
            </div>
        </div>
    );
}
