'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight, Video, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { isDirectVideoUrl } from '@/lib/gallery-settings';

export type GalleryLightboxItem = {
    id: string;
    title: string;
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
    description: string;
    isNsfw?: boolean;
    detailUrl?: string;
};

export function GalleryLightbox({
    item,
    currentIndex,
    total,
    onClose,
    onPrevious,
    onNext,
}: {
    item: GalleryLightboxItem | null;
    currentIndex: number;
    total: number;
    onClose: () => void;
    onPrevious: () => void;
    onNext: () => void;
}) {
    useEffect(() => {
        if (!item) return;

        const scrollY = window.scrollY;
        const html = document.documentElement;
        const body = document.body;
        const previous = {
            htmlOverflow: html.style.overflow,
            htmlOverscroll: html.style.overscrollBehavior,
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyWidth: body.style.width,
            bodyOverscroll: body.style.overscrollBehavior,
        };

        html.style.overflow = 'hidden';
        html.style.overscrollBehavior = 'none';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';
        body.style.overscrollBehavior = 'none';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowLeft') onPrevious();
            if (event.key === 'ArrowRight') onNext();
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            html.style.overflow = previous.htmlOverflow;
            html.style.overscrollBehavior = previous.htmlOverscroll;
            body.style.overflow = previous.bodyOverflow;
            body.style.position = previous.bodyPosition;
            body.style.top = previous.bodyTop;
            body.style.width = previous.bodyWidth;
            body.style.overscrollBehavior = previous.bodyOverscroll;
            window.scrollTo(0, scrollY);
        };
    }, [item, onClose, onNext, onPrevious]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {item && (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[2147483647] grid h-[100dvh] w-screen grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-black text-white"
                    role="dialog"
                    aria-modal="true"
                    aria-label={item.title || 'Gallery preview'}
                    onClick={onClose}
                >
                    <div className="relative z-20 flex min-h-16 items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-xl sm:px-6">
                        <div className="font-mono text-xs tracking-[0.18em] text-white/55 sm:text-sm">
                            {currentIndex + 1} / {total}
                        </div>
                        <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onClose(); }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/15"
                            aria-label="Close gallery preview"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="relative min-h-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>
                        {item.isNsfw ? (
                            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950 p-3 sm:p-6 lg:p-10">
                                {item.thumbnail ? (
                                    <div className="relative h-full w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-black">
                                        <Image src={item.thumbnail} alt="NSFW preview" fill sizes="100vw" className="scale-110 object-contain blur-3xl" priority />
                                    </div>
                                ) : (
                                    <div className="grid h-full w-full max-w-6xl place-items-center rounded-lg border border-white/10 bg-neutral-900"><Video className="h-12 w-12 text-white/25" /></div>
                                )}
                                <div className="absolute inset-0 grid place-items-center bg-black/30 text-center">
                                    <div className="rounded-2xl border border-white/15 bg-black/70 px-6 py-5 shadow-2xl backdrop-blur-xl">
                                        <div className="text-xl font-bold tracking-[0.24em]">NSFW</div>
                                        <p className="mt-2 max-w-xs text-xs leading-5 text-white/55">Sensitive media stays hidden in Gallery preview. Open the full work to view the original media.</p>
                                    </div>
                                </div>
                            </div>
                        ) : item.type === 'video' ? (
                            <div className="flex h-full w-full items-center justify-center p-3 sm:p-6 lg:p-10">
                                {isDirectVideoUrl(item.url) ? (
                                    <video src={item.url} controls autoPlay playsInline className="h-full max-h-full w-full max-w-6xl rounded-lg border border-white/10 bg-black object-contain" />
                                ) : (
                                    <iframe
                                        src={`${item.url}${item.url.includes('?') ? '&' : '?'}autoplay=1&rel=0`}
                                        className="h-full max-h-full w-full max-w-6xl rounded-lg border border-white/10 bg-black"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        title={item.title || 'Gallery video'}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="relative h-full w-full p-3 sm:p-6 lg:p-10">
                                <Image
                                    src={item.url}
                                    alt={item.title}
                                    fill
                                    sizes="100vw"
                                    className="object-contain p-3 sm:p-6 lg:p-10"
                                    priority
                                />
                            </div>
                        )}

                        {total > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); onPrevious(); }}
                                    className="absolute left-3 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 backdrop-blur-md transition hover:bg-black/90 sm:left-6 sm:h-14 sm:w-14"
                                    aria-label="Previous work"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => { event.stopPropagation(); onNext(); }}
                                    className="absolute right-3 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 backdrop-blur-md transition hover:bg-black/90 sm:right-6 sm:h-14 sm:w-14"
                                    aria-label="Next work"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="relative z-20 border-t border-white/10 bg-black/90 px-5 py-4 text-center backdrop-blur-xl sm:px-8 sm:py-5" onClick={(event) => event.stopPropagation()}>
                        <h3 className="font-serif text-xl sm:text-2xl">{item.title}</h3>
                        {item.description && <p className="mx-auto mt-1.5 max-w-3xl text-sm leading-relaxed text-white/55">{item.description}</p>}
                        {item.detailUrl && (
                            <Link href={item.detailUrl} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white">
                                View full work <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
