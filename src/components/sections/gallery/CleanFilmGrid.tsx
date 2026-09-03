"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowDownUp, ChevronLeft, ChevronRight, ImageIcon, LayoutGrid, ListFilter, Maximize2, Play, Sparkles, StretchHorizontal, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllGalleryImages } from "@/app/actions/getGalleryImages";
import MagneticEffect from "@/components/ui/MagneticEffect";
import { InfiniteImageField } from "@/components/ui/infinite-image-field";
import { GalleryLightbox } from "@/components/sections/gallery/GalleryLightbox";
import { galleryItemHref, type GallerySettings } from '@/lib/gallery-settings';

type FilterType = 'all' | 'image' | 'video';
type ViewMode = 'rows' | 'grid' | 'infinite';
type GalleryItem = {
    id: string;
    title: string;
    type: 'image' | 'video';
    category: string;
    thumbnail: string;
    url: string;
    description: string;
    detailUrl?: string;
};

export default function CleanFilmGrid({ isLowPowerMode, content }: { isLowPowerMode?: boolean; content: GallerySettings }) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [visibleCount, setVisibleCount] = useState(12);
    const [fallbackItems, setFallbackItems] = useState<GalleryItem[]>([]);
    const scrollContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

    const configuredItems = useMemo<GalleryItem[]>(() => content.items
        .filter((item) => item.isVisible && item.mediaUrl)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            category: item.category || (item.type === 'video' ? 'Video' : 'Photo'),
            thumbnail: item.type === 'video' ? (item.thumbnailUrl || item.mediaUrl) : item.mediaUrl,
            url: item.mediaUrl,
            description: item.description,
            detailUrl: item.slug ? galleryItemHref(item.slug) : undefined,
        })), [content.items]);

    useEffect(() => {
        if (configuredItems.length) return;
        let cancelled = false;
        getAllGalleryImages()
            .then((images) => {
                if (cancelled) return;
                setFallbackItems(images.map((img, index) => ({
                    id: `gallery-${index}`,
                    title: img.filename.split('.')[0].replace(/-/g, ' '),
                    type: 'image' as const,
                    category: 'Photo',
                    thumbnail: img.src,
                    url: img.src,
                    description: content.defaultImageDescription,
                })));
            })
            .catch((error) => console.error('Failed to load gallery images', error));
        return () => { cancelled = true; };
    }, [configuredItems, content.defaultImageDescription]);

    const galleryItems = configuredItems.length ? configuredItems : fallbackItems;

    const groupedItems = useMemo(() => {
        const groups: Record<string, GalleryItem[]> = {};
        galleryItems
            .filter((item) => filter === 'all' || item.type === filter)
            .forEach((item) => {
                const category = item.category || (item.type === 'video' ? 'Video' : 'Photo');
                if (!groups[category]) groups[category] = [];
                groups[category].push(item);
            });
        return groups;
    }, [filter, galleryItems]);

    const categories = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);
    const flattenedFilteredItems = useMemo(() => categories.flatMap((category) => groupedItems[category]), [categories, groupedItems]);
    const visibleItems = useMemo(() => viewMode === 'rows' ? [] : flattenedFilteredItems.slice(0, visibleCount), [flattenedFilteredItems, visibleCount, viewMode]);
    const currentIndex = flattenedFilteredItems.findIndex((item) => item.id === selectedId);
    const currentItem = currentIndex >= 0 ? flattenedFilteredItems[currentIndex] : null;

    const openLightbox = (id: string) => setSelectedId(id);
    const closeLightbox = () => setSelectedId(null);
    const moveLightbox = (direction: number) => {
        if (!flattenedFilteredItems.length || currentIndex < 0) return;
        const next = (currentIndex + direction + flattenedFilteredItems.length) % flattenedFilteredItems.length;
        setSelectedId(flattenedFilteredItems[next].id);
    };
    const scrollToCategory = (category: string) => {
        const element = document.getElementById(`category-${category}`);
        if (!element) return;
        window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
    };
    const scrollHorizontal = (category: string, direction: 'left' | 'right') => {
        scrollContainerRef.current[category]?.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    };
    const changeFilter = (next: FilterType) => {
        setFilter(next);
        setVisibleCount(12);
    };

    const filterLabel = (value: FilterType) => value === 'all' ? content.filterAll : value === 'image' ? content.filterPhotos : content.filterVideos;

    return (
        <section className="relative min-h-screen px-6 py-24 md:px-16 lg:px-24">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-gradient-to-b from-transparent to-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-96 z-0 bg-background" />

            <div className="relative z-10 mx-auto mb-12 flex max-w-[1920px] flex-col items-start justify-between gap-6 border-b border-neutral-500 pb-6 dark:border-white/20 md:flex-row md:items-end">
                <div className="flex-1">
                    <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/80 transition-colors duration-300 md:text-xs">{content.sectionEyebrow}</span>
                    <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground/90 transition-colors duration-300 md:text-5xl">{content.sectionTitle}</h2>
                </div>

                <div className="flex w-full flex-wrap items-center gap-4 md:w-auto md:gap-8">
                    <div className="flex items-center gap-1 rounded-full border border-black/5 bg-black/5 p-1 shadow-inner backdrop-blur-md transition-colors duration-300 dark:border-white/5 dark:bg-white/5">
                        {(['all', 'image', 'video'] as FilterType[]).map((item) => (
                            <button key={item} onClick={() => changeFilter(item)} className={cn('rounded-full px-5 py-2 text-xs font-medium tracking-wide transition-all duration-300', filter === item ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')}>{filterLabel(item)}</button>
                        ))}
                    </div>

                    <div className="hidden h-8 w-px bg-neutral-500 dark:bg-white/20 md:block" />

                    <div className="flex items-center gap-1 rounded-full border border-black/5 bg-black/5 p-1 shadow-inner backdrop-blur-md transition-colors duration-300 dark:border-white/5 dark:bg-white/5">
                        <button onClick={() => setViewMode('rows')} className={cn('rounded-full p-2.5 transition-all duration-300', viewMode === 'rows' ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')} title={content.rowsViewTitle}><StretchHorizontal className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('grid')} className={cn('rounded-full p-2.5 transition-all duration-300', viewMode === 'grid' ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')} title={content.gridViewTitle}><LayoutGrid className="h-4 w-4" /></button>
                        <button onClick={() => setViewMode('infinite')} className={cn('rounded-full p-2.5 transition-all duration-300', viewMode === 'infinite' ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10' : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10')} title={content.infiniteViewTitle}><Sparkles className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto flex max-w-[1920px] flex-col gap-8 lg:flex-row">
                {viewMode === 'rows' && (
                    <div className="sticky top-32 hidden h-fit w-48 shrink-0 lg:block">
                        <div className="border-l border-neutral-500 py-2 pl-6 dark:border-white/20">
                            <h3 className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground"><ListFilter className="h-3 w-3" />{content.collectionsLabel}</h3>
                            <div className="flex flex-col gap-3">
                                {categories.map((category, index) => <button key={category} onClick={() => scrollToCategory(category)} className="text-left text-sm capitalize text-foreground/60 transition-all duration-300 hover:pl-2 hover:text-primary"><span className="mr-2 font-mono text-[10px] opacity-40">{String(index + 1).padStart(2, '0')}</span>{category}</button>)}
                            </div>
                        </div>
                    </div>
                )}

                <div className="min-w-0 flex-1 space-y-16">
                    {viewMode === 'rows' && categories.map((category) => (
                        <div key={category} id={`category-${category}`} className="group/section relative">
                            <div className="mb-6 flex items-center justify-between px-1">
                                <h3 className="flex items-center gap-3 font-serif text-xl capitalize text-foreground md:text-2xl">{category}<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{groupedItems[category].length}</span></h3>
                                <div className="hidden items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/section:opacity-100 md:flex">
                                    <button onClick={() => scrollHorizontal(category, 'left')} className="rounded-full border border-border/40 p-2 transition-all hover:border-foreground/20 hover:bg-foreground/5"><ChevronLeft className="h-4 w-4" /></button>
                                    <button onClick={() => scrollHorizontal(category, 'right')} className="rounded-full border border-border/40 p-2 transition-all hover:border-foreground/20 hover:bg-foreground/5"><ChevronRight className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div ref={(element) => { scrollContainerRef.current[category] = element; }} className={cn('flex gap-4 overflow-x-auto px-1 pb-8 scrollbar-hide', !isLowPowerMode && 'snap-x snap-mandatory')} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {groupedItems[category].map((item, index) => (
                                    <motion.div key={item.id} initial={isLowPowerMode ? { opacity: 0 } : { opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '0px -50px 0px 0px' }} transition={{ duration: 0.5, delay: isLowPowerMode ? 0 : index * 0.1 }} className="group/card relative aspect-video w-[85vw] flex-none cursor-pointer snap-center md:w-[400px]" onClick={() => openLightbox(item.id)}>
                                        <div className="relative h-full w-full overflow-hidden rounded-sm bg-muted">
                                            <Image src={item.thumbnail || item.url} alt={item.title} fill sizes="(max-width: 768px) 85vw, 400px" loading="lazy" className={cn('object-cover transition-transform duration-700', !isLowPowerMode && 'group-hover/card:scale-110')} />
                                            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-sm">{item.type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}<span>{item.type}</span></div>
                                            <div className={cn('absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 group-hover/card:opacity-100', isLowPowerMode && 'hidden md:flex')}><div className="rounded-full border border-white/20 bg-white/10 p-4 backdrop-blur-md">{item.type === 'video' ? <Play className="h-6 w-6 fill-current text-white" /> : <Maximize2 className="h-6 w-6 text-white" />}</div></div>
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-60 transition-opacity duration-300 group-hover/card:opacity-90" />
                                        </div>
                                        <div className="absolute bottom-4 left-4 right-4 z-20 translate-y-2 transition-transform duration-300 group-hover/card:translate-y-0"><h4 className="truncate text-lg font-medium leading-tight text-white drop-shadow-md">{item.title}</h4><div className="mt-2 flex items-center justify-end opacity-0 transition-opacity delay-75 duration-300 group-hover/card:opacity-100"><span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60">{content.viewLabel}</span></div></div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {viewMode === 'grid' && (
                        <div className="space-y-12">
                            <div className="columns-1 gap-3 space-y-3 md:columns-2 lg:columns-3">
                                {visibleItems.map((item, index) => (
                                    <motion.div key={item.id} initial={isLowPowerMode ? { opacity: 0 } : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 0.4, delay: isLowPowerMode ? 0 : index * 0.05 }} className="group relative break-inside-avoid cursor-pointer transition-all" onClick={() => openLightbox(item.id)}>
                                        <div className="relative aspect-auto overflow-hidden rounded-none bg-muted transition-all duration-500 ease-out group-hover:rounded-[2rem]">
                                            <Image src={item.thumbnail || item.url} alt={item.title} width={800} height={600} loading="lazy" className={cn('object-cover transition-transform duration-700', !isLowPowerMode && 'group-hover:scale-105')} />
                                            <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-sm">{item.type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}<span>{item.type}</span></div>
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 p-4 text-center opacity-0 transition-all duration-300 group-hover:opacity-100"><div className="mb-4 translate-y-4 rounded-full border border-white/20 bg-white/10 p-3 backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">{item.type === 'video' ? <Play className="h-5 w-5 fill-current text-white" /> : <Maximize2 className="h-5 w-5 text-white" />}</div><h3 className="line-clamp-2 translate-y-4 text-sm font-bold uppercase tracking-wide text-white transition-transform delay-75 duration-300 group-hover:translate-y-0">{item.title}</h3><p className="mt-2 translate-y-4 font-mono text-xs text-white/70 transition-transform delay-100 duration-300 group-hover:translate-y-0">{item.category}</p></div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {visibleCount < flattenedFilteredItems.length && <div className="flex justify-center pb-12 pt-8"><MagneticEffect><button onClick={() => setVisibleCount((value) => value + 12)} className="group relative mt-6 flex flex-col items-center gap-4 px-8 py-4"><span className="absolute top-[-10px] -translate-y-4 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[3px] text-foreground opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">{content.loadMoreLabel}</span><div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-500 bg-background shadow-sm transition-all duration-500 ease-out group-hover:scale-110 group-hover:bg-foreground group-hover:text-background group-hover:shadow-xl dark:border-white/20"><ArrowDownUp className="h-5 w-5" /></div></button></MagneticEffect></div>}
                        </div>
                    )}

                    {viewMode === 'infinite' && <div className="relative mt-2 h-[800px] w-full"><InfiniteImageField images={flattenedFilteredItems.map((item) => item.thumbnail || item.url)} /></div>}
                    {categories.length === 0 && <div className="py-20 text-center"><p className="font-mono text-muted-foreground">{content.emptyLabel}</p></div>}
                </div>
            </div>

            <GalleryLightbox
                item={currentItem}
                currentIndex={Math.max(currentIndex, 0)}
                total={flattenedFilteredItems.length}
                onClose={closeLightbox}
                onPrevious={() => moveLightbox(-1)}
                onNext={() => moveLightbox(1)}
            />
        </section>
    );
}
