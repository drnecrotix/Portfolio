"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { GallerySettings } from '@/lib/gallery-settings';

export default function ManifestoHero({ isLowPowerMode, content }: { isLowPowerMode?: boolean; content: GallerySettings }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const opacityTransform = useTransform(scrollYProgress, [0, 0.82], [1, 0]);
    const opacity = isLowPowerMode ? 1 : opacityTransform;
    const yTitle1Transform = useTransform(scrollYProgress, [0, 1], [0, -160]);
    const ySubtitleTransform = useTransform(scrollYProgress, [0, 1], [0, -120]);
    const yTitle2Transform = useTransform(scrollYProgress, [0, 1], [0, -80]);
    const yParagraphTransform = useTransform(scrollYProgress, [0, 1], [0, -40]);
    const opacityPromptTransform = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
    const opacityPrompt = isLowPowerMode ? 1 : opacityPromptTransform;
    const yPromptTransform = useTransform(scrollYProgress, [0, 0.35], [0, 30]);

    const yTitle1 = isLowPowerMode ? 0 : yTitle1Transform;
    const ySubtitle = isLowPowerMode ? 0 : ySubtitleTransform;
    const yTitle2 = isLowPowerMode ? 0 : yTitle2Transform;
    const yParagraph = isLowPowerMode ? 0 : yParagraphTransform;
    const yPrompt = isLowPowerMode ? 0 : yPromptTransform;

    return (
        <section ref={containerRef} className="relative h-[100svh] text-foreground md:h-[110vh]">
            <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden md:h-screen">
                {!isLowPowerMode && (
                    <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/noise.svg')] opacity-[0.03] dark:opacity-0" />
                )}

                <motion.div style={{ opacity }} className="relative z-10 mx-auto max-w-7xl px-4 text-center md:px-12">
                    <div className="flex flex-col gap-2 md:gap-6">
                        <motion.div style={{ y: yTitle1 }} className="overflow-hidden">
                            <motion.h1
                                initial={isLowPowerMode ? { opacity: 0 } : { y: 100, opacity: 0 }}
                                animate={isLowPowerMode ? { opacity: 1 } : { y: 0, opacity: 1 }}
                                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                className="bg-gradient-to-br from-foreground/80 to-foreground/20 bg-clip-text text-5xl font-black uppercase leading-[0.82] tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.1)] sm:text-6xl md:text-9xl"
                            >
                                {content.heroTitlePrefix && <>{content.heroTitlePrefix} </>}
                                <span className="font-serif font-light italic text-foreground/60 opacity-80">{content.heroEyebrow}</span>{' '}{content.heroTitleMain}
                            </motion.h1>
                        </motion.div>

                        <motion.div style={{ y: ySubtitle }} className="flex items-center justify-center gap-3 overflow-hidden md:gap-8">
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }} className="h-px w-8 bg-foreground/30 sm:w-12 md:w-32" />
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs md:text-sm">
                                {content.heroBridge}
                            </motion.p>
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }} className="h-px w-8 bg-foreground/30 sm:w-12 md:w-32" />
                        </motion.div>

                        <motion.div style={{ y: yTitle2 }} className="overflow-hidden">
                            <motion.h1
                                initial={isLowPowerMode ? { opacity: 0 } : { y: -100, opacity: 0 }}
                                animate={isLowPowerMode ? { opacity: 1 } : { y: 0, opacity: 1 }}
                                transition={{ duration: 1, delay: isLowPowerMode ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="bg-gradient-to-br from-foreground/80 to-foreground/20 bg-clip-text text-5xl font-black uppercase leading-[0.82] tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.1)] sm:text-6xl md:text-9xl"
                            >
                                {content.heroSecondTitle} <span className="font-serif font-light italic text-primary/80">{content.heroSecondAccent}</span>
                            </motion.h1>
                        </motion.div>
                    </div>

                    <motion.div style={{ y: yParagraph }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }} className="mx-auto mt-5 max-w-xl md:mt-10">
                        <p className="font-serif text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">“{content.heroQuote}”</p>
                    </motion.div>
                </motion.div>

                <motion.div style={{ opacity: opacityPrompt, y: yPrompt }} className="absolute bottom-6 z-10 flex flex-col items-center gap-2 sm:bottom-8 md:bottom-12 md:gap-4">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">{content.scrollPrompt}</span>
                    <ArrowDown className="size-4 animate-bounce text-foreground md:size-5" />
                </motion.div>
            </div>
        </section>
    );
}
