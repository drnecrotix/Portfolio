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

    const opacityTransform = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    const opacity = isLowPowerMode ? 1 : opacityTransform;
    const yTitle1Transform = useTransform(scrollYProgress, [0, 1], [0, -300]);
    const ySubtitleTransform = useTransform(scrollYProgress, [0, 1], [0, -225]);
    const yTitle2Transform = useTransform(scrollYProgress, [0, 1], [0, -150]);
    const yParagraphTransform = useTransform(scrollYProgress, [0, 1], [0, -75]);
    const opacityPromptTransform = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
    const opacityPrompt = isLowPowerMode ? 1 : opacityPromptTransform;
    const yPromptTransform = useTransform(scrollYProgress, [0, 0.3], [0, 50]);

    const yTitle1 = isLowPowerMode ? 0 : yTitle1Transform;
    const ySubtitle = isLowPowerMode ? 0 : ySubtitleTransform;
    const yTitle2 = isLowPowerMode ? 0 : yTitle2Transform;
    const yParagraph = isLowPowerMode ? 0 : yParagraphTransform;
    const yPrompt = isLowPowerMode ? 0 : yPromptTransform;

    return (
        <section ref={containerRef} className="relative h-[150vh] text-foreground">
            <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
                {!isLowPowerMode && (
                    <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-0 pointer-events-none bg-[url('/noise.svg')]" />
                )}

                <motion.div style={{ opacity }} className="relative z-10 px-4 md:px-12 max-w-7xl mx-auto text-center">
                    <div className="flex flex-col gap-2 md:gap-6">
                        <motion.div style={{ y: yTitle1 }} className="overflow-hidden">
                            <motion.h1
                                initial={isLowPowerMode ? { opacity: 0 } : { y: 100, opacity: 0 }}
                                animate={isLowPowerMode ? { opacity: 1 } : { y: 0, opacity: 1 }}
                                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                className="text-6xl md:text-9xl font-black tracking-tighter uppercase leading-[0.8] text-transparent bg-clip-text bg-gradient-to-br from-foreground/80 to-foreground/20 [-webkit-text-stroke:1px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.1)]"
                            >
                                {content.heroTitlePrefix && <>{content.heroTitlePrefix} </>}
                                <span className="font-serif italic font-light opacity-80 text-foreground/60">{content.heroEyebrow}</span>{' '}{content.heroTitleMain}
                            </motion.h1>
                        </motion.div>

                        <motion.div style={{ y: ySubtitle }} className="flex items-center justify-center gap-4 md:gap-8 overflow-hidden">
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }} className="h-px bg-foreground/30 w-12 md:w-32" />
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} className="font-mono text-xs md:text-sm uppercase tracking-widest text-muted-foreground">
                                {content.heroBridge}
                            </motion.p>
                            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }} className="h-px bg-foreground/30 w-12 md:w-32" />
                        </motion.div>

                        <motion.div style={{ y: yTitle2 }} className="overflow-hidden">
                            <motion.h1
                                initial={isLowPowerMode ? { opacity: 0 } : { y: -100, opacity: 0 }}
                                animate={isLowPowerMode ? { opacity: 1 } : { y: 0, opacity: 1 }}
                                transition={{ duration: 1, delay: isLowPowerMode ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="text-6xl md:text-9xl font-black tracking-tighter uppercase leading-[0.8] text-transparent bg-clip-text bg-gradient-to-br from-foreground/80 to-foreground/20 [-webkit-text-stroke:1px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.1)]"
                            >
                                {content.heroSecondTitle} <span className="font-serif italic font-light text-primary/80">{content.heroSecondAccent}</span>
                            </motion.h1>
                        </motion.div>
                    </div>

                    <motion.div style={{ y: yParagraph }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.2 }} className="mt-6 md:mt-10 max-w-xl mx-auto">
                        <p className="text-lg md:text-xl font-serif text-muted-foreground leading-relaxed">“{content.heroQuote}”</p>
                    </motion.div>
                </motion.div>

                <motion.div style={{ opacity: opacityPrompt, y: yPrompt }} className="absolute bottom-12 flex flex-col items-center gap-4 z-10">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{content.scrollPrompt}</span>
                    <ArrowDown className="w-5 h-5 text-foreground animate-bounce" />
                </motion.div>
            </div>
        </section>
    );
}
