'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ImageIcon, LayoutGrid, ListFilter, Play, StretchHorizontal, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    galleryCreativeTypeLabel,
    galleryCreativeTypeOptions,
    galleryItemHref,
    type GalleryCreativeType,
    type GallerySettings,
} from '@/lib/gallery-settings';

type FilterType = 'all' | GalleryCreativeType;
type ViewMode = 'rows' | 'grid' | 'slider';
type GalleryItem = {
    id: string;
    title: string;
    type: 'image' | 'video';
    creativeType: GalleryCreativeType;
    thumbnail: string;
    description: string;
    isNsfw: boolean;
    detailUrl: string;
};

function GalleryPreview({ item, sizes, className }: { item: GalleryItem; sizes: string; className?: string }) {
    return (
        <>
            {item.thumbnail ? (
                <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes={sizes}
                    loading="lazy"
                    className={cn('object-cover', className, item.isNsfw && 'scale-110 blur-2xl')}
                />
            ) : (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 text-white/60">
                    <div className="flex flex-col items-center gap-2">
                        <Video className="h-7 w-7" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em]">Video preview</span>
                    </div>
                </div>
            )}
            {item.isNsfw && (
                <div className="absolute inset-0 z-[5] grid place-items-center bg-black/20 text-center backdrop-saturate-50">
                    <div className="rounded-xl border border-white/20 bg-black/55 px-4 py-3 text-white shadow-xl backdrop-blur-md">
                        <div className="text-sm font-bold tracking-[0.22em]">NSFW</div>
                        <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/65">Sensitive preview</div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function CleanFilmGrid({ isLowPowerMode, content }: { isLowPowerMode?: boolean; content: GallerySettings }) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [visibleCount, setVisibleCount] = useState(18);
    const rowScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const sliderRef = useRef<HTMLDivElement | null>(null);

    const galleryItems = useMemo<GalleryItem[]>(() => content.items
        .filter((item) => item.isVisible && item.mediaUrl)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            creativeType: item.creativeType,
            thumbnail: item.type === 'video' ? item.thumbnailUrl : (item.thumbnailUrl || item.mediaUrl),
            description: item.description,
            isNsfw: item.isNsfw,
            detailUrl: galleryItemHref(item.slug),
        })), [content.items]);

    const availableTypes = useMemo(
        () => galleryCreativeTypeOptions.filter((option) => galleryItems.some((item) => item.creativeType === option.value)),
        [galleryItems],
    );
    const filteredItems = useMemo(
        () => galleryItems.filter((item) => filter === 'all' || item.creativeType === filter),
        [filter, galleryItems],
    );
    const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

    const groupedItems = useMemo(() => {
        const groups: Partial<Record<GalleryCreativeType, GalleryItem[]>> = {};
        filteredItems.forEach((item) => {
            if (!groups[item.creativeType]) groups[item.creativeType] = [];
            groups[item.creativeType]!.push(item);
        });
        return groups;
    }, [filteredItems]);

    const groupedTypes = useMemo(
        () => galleryCreativeTypeOptions.map((option) => option.value).filter((type) => groupedItems[type]?.length),
        [groupedItems],
    );

    const scrollToType = (type: GalleryCreativeType) => {
        const element = document.getElementById(`creative-type-${type}`);
        if (!element) return;
        window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
    };

    const scrollHorizontal = (type: GalleryCreativeType, direction: 'left' | 'right') => {
        rowScrollRefs.current[type]?.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    };

    const scrollSlider = (direction: 'left' | 'right') => {
        const element = sliderRef.current;
        if (!element) return;
        const distance = Math.max(320, element.clientWidth * 0.78);
        element.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
    };

    const changeFilter = (next: FilterType) => {
        setFilter(next);
        setVisibleCount(18);
        sliderRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    };

    const sliderTitle = content.infiniteViewTitle === 'Infinite Preview' ? 'Slider View' : content.infiniteViewTitle;

    return (
        <section className="relative min-h-screen px-4 py-20 sm:px-6 md:px-10 lg:px-14 xl:px-16">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-gradient-to-b from-transparent to-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-96 z-0 bg-background" />

            <div className="relative z-10 mx-auto mb-9 flex max-w-[1920px] flex-col items-start justify-between gap-6 border-b border-neutral-500 pb-5 dark:border-white/20 md:flex-row md:items-end">
                <div className="flex-1">
                    <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/80 md:text-xs">{content.sectionEyebrow}</span>
                    <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground/90 md:text-5xl">{content.sectionTitle}</h2>
                </div>

                <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
                    <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-black/5 bg-black/5 p-1 shadow-inner backdrop-blur-md scrollbar-hide dark:border-white/5 dark:bg-white/5">
                        <button onClick={() => changeFilter('all')} className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-medium transition', filter === 'all' ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')}>{content.filterAll}</button>
                        {availableTypes.map((option) => (
                            <button key={option.value} onClick={() => changeFilter(option.value)} className={cn('shrink-0 rounded-full px-4 py-2 text-xs font-medium transition', filter === option.value ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')}>{option.label}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 self-end rounded-full border border-black/5 bg-black/5 p-1 shadow-inner backdrop-blur-md dark:border-white/5 dark:bg-white/5">
                        <button onClick={() => setViewMode('rows')} className={cn('rounded-full p-2.5 transition', viewMode === 'rows' ? 'bg-white text-foreground shadow-md dark:bg-neutral-800' : 'text-muted-foreground hover:text-foreground')} title={content.rowsViewTitle} aria-label={content.rowsViewTitle}><StretchHorizontal className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('grid')} className={cn('rounded-full p-2.5 transition', viewMode === 'grid' ? 'bg-white text-foreground shadow-md dark:bg-neutral-800' : 'text-muted-foreground hover:text-foreground')} title={content.gridViewTitle} aria-label={content.gridViewTitle}><LayoutGrid className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('slider')} className={cn('rounded-full p-2.5 transition', viewMode === 'slider' ? 'bg-white text-foreground shadow-md dark:bg-neutral-800' : 'text-muted-foreground hover:text-foreground')} title={sliderTitle} aria-label={sliderTitle}><Play className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto flex max-w-[1920px] flex-col gap-8 lg:flex-row">
                {viewMode === 'rows' && groupedTypes.length > 1 && (
                    <div className="sticky top-32 hidden h-fit w-48 shrink-0 lg:block">
                        <div className="border-l border-neutral-500 py-2 pl-6 dark:border-white/20">
                            <h3 className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"><ListFilter className="h-3 w-3" />{content.collectionsLabel}</h3>
                            <div className="flex flex-col gap-3">
                                {groupedTypes.map((type, index) => (
                                    <button key={type} onClick={() => scrollToType(type)} className="text-left text-sm text-foreground/60 transition hover:pl-2 hover:text-primary"><span className="mr-2 font-mono text-[10px] opacity-40">{String(index + 1).padStart(2, '0')}</span>{galleryCreativeTypeLabel(type)}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="min-w-0 flex-1 space-y-14">
                    {viewMode === 'rows' && groupedTypes.map((type) => (
                        <div key={type} id={`creative-type-${type}`} className="group/section relative">
                            <div className="mb-6 flex items-center justify-between px-1">
                                <h3 className="flex items-center gap-3 font-serif text-xl text-foreground md:text-2xl">{galleryCreativeTypeLabel(type)}<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{groupedItems[type]?.length || 0}</span></h3>
                                <div className="hidden items-center gap-2 opacity-0 transition-opacity group-hover/section:opacity-100 md:flex">
                                    <button onClick={() => scrollHorizontal(type, 'left')} className="rounded-full border border-border/40 p-2 hover:bg-foreground/5" aria-label={`Previous ${galleryCreativeTypeLabel(type)} works`}><ChevronLeft className="h-4 w-4" /></button>
                                    <button onClick={() => scrollHorizontal(type, 'right')} className="rounded-full border border-border/40 p-2 hover:bg-foreground/5" aria-label={`Next ${galleryCreativeTypeLabel(type)} works`}><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div ref={(element) => { rowScrollRefs.current[type] = element; }} data-lenis-prevent className={cn('flex gap-4 overflow-x-auto overscroll-x-contain px-1 pb-8 scrollbar-hide', !isLowPowerMode && 'snap-x snap-mandatory')} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {(groupedItems[type] || []).map((item, index) => (
                                    <motion.div key={item.id} initial={isLowPowerMode ? { opacity: 0 } : { opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: isLowPowerMode ? 0 : index * 0.06 }} className="w-[78vw] flex-none snap-center sm:w-[340px] md:w-[380px]">
                                        <Link href={item.detailUrl} className="group/card relative block aspect-video overflow-hidden rounded-xl bg-muted">
                                            <GalleryPreview item={item} sizes="(max-width: 768px) 78vw, 380px" className={cn('transition-transform duration-700', !isLowPowerMode && !item.isNsfw && 'group-hover/card:scale-105')} />
                                            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-sm">{item.type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}<span>{galleryCreativeTypeLabel(item.creativeType)}</span></div>
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-70" />
                                            <div className="absolute bottom-4 left-4 right-4 z-20"><h4 className="truncate text-base font-medium text-white drop-shadow-md">{item.title}</h4></div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {viewMode === 'grid' && (
                        <div className="space-y-10">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                {visibleItems.map((item, index) => (
                                    <motion.div key={item.id} initial={isLowPowerMode ? { opacity: 0 } : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-8%' }} transition={{ duration: 0.35, delay: isLowPowerMode ? 0 : Math.min(index, 10) * 0.035 }}>
                                        <Link href={item.detailUrl} className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                                            <GalleryPreview item={item} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1535px) 33vw, 25vw" className={cn('transition-transform duration-700', !item.isNsfw && 'group-hover:scale-[1.035]')} />
                                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                                            <div className="absolute left-3 top-3 z-10 rounded-full bg-black/45 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/80 backdrop-blur-sm">{galleryCreativeTypeLabel(item.creativeType)}</div>
                                            <span className="absolute right-3 top-3 z-10 rounded-full bg-black/45 p-2 text-white/80 opacity-0 transition-opacity group-hover:opacity-100">{item.type === 'video' ? <Play className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}</span>
                                            <div className="absolute bottom-3 left-3 right-3 z-10"><p className="line-clamp-2 text-sm font-medium text-white sm:text-base">{item.title}</p></div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                            {visibleCount < filteredItems.length && (
                                <div className="flex justify-center"><button onClick={() => setVisibleCount((count) => count + 18)} className="rounded-full border border-foreground/10 px-5 py-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">{content.loadMoreLabel}</button></div>
                            )}
                        </div>
                    )}

                    {viewMode === 'slider' && filteredItems.length > 0 && (
                        <div className="relative">
                            <div className="mb-4 flex items-center justify-between gap-4 px-1">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Slider</p>
                                    <p className="mt-1 text-sm text-foreground/65">Browse the collection, then open a work directly.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => scrollSlider('left')} className="rounded-full border border-foreground/10 bg-background/70 p-2.5 text-muted-foreground transition hover:text-foreground" aria-label="Previous work"><ChevronLeft className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => scrollSlider('right')} className="rounded-full border border-foreground/10 bg-background/70 p-2.5 text-muted-foreground transition hover:text-foreground" aria-label="Next work"><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div ref={sliderRef} data-lenis-prevent className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-5 pr-[12vw] scroll-smooth scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {filteredItems.map((item, index) => (
                                    <motion.div key={item.id} initial={isLowPowerMode ? { opacity: 0 } : { opacity: 0, scale: 0.985 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.4, delay: isLowPowerMode ? 0 : Math.min(index, 8) * 0.04 }} className="w-[86vw] max-w-[1080px] flex-none snap-center sm:w-[76vw] lg:w-[68vw]">
                                        <Link href={item.detailUrl} className="group relative block aspect-video overflow-hidden rounded-2xl border border-foreground/10 bg-muted shadow-2xl">
                                            <GalleryPreview item={item} sizes="(max-width: 639px) 86vw, (max-width: 1023px) 76vw, 68vw" className={cn('transition-transform duration-700', !item.isNsfw && 'group-hover:scale-[1.02]')} />
                                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                                            <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">{item.type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}{galleryCreativeTypeLabel(item.creativeType)}</div>
                                            <div className="absolute bottom-5 left-5 right-5 z-10 sm:bottom-7 sm:left-7 sm:right-7">
                                                <h3 className="text-xl font-medium text-white drop-shadow-md sm:text-3xl">{item.title}</h3>
                                                {item.description && <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-white/65 sm:text-sm">{item.description}</p>}
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredItems.length === 0 && <div className="rounded-2xl border border-dashed border-foreground/10 py-16 text-center text-sm text-muted-foreground">{content.emptyLabel}</div>}
                </div>
            </div>
        </section>
    );
}
