'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { BlogSettings } from '@/lib/blog-settings';

export function BlogHeroTitle({ settings, className }: { settings: BlogSettings; className?: string }) {
    const words = useMemo(() => settings.rotatingWords.filter(Boolean), [settings.rotatingWords]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!settings.rotatingEnabled || words.length < 2) return;
        const timer = window.setInterval(() => setIndex((value) => (value + 1) % words.length), settings.rotationIntervalMs);
        return () => window.clearInterval(timer);
    }, [settings.rotatingEnabled, settings.rotationIntervalMs, words.length]);

    const gradient = settings.titleEffect === 'gradient';
    const glitch = settings.titleEffect === 'glitch';
    const titleClass = cn(
        'font-black tracking-[-0.04em]',
        gradient && 'bg-gradient-to-r from-foreground via-fuchsia-500 to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[blog-title-gradient_7s_ease-in-out_infinite]',
        className,
    );

    if (!settings.rotatingEnabled || words.length === 0) {
        const initial = settings.titleEffect === 'slide' ? { opacity: 0, y: 14 } : settings.titleEffect === 'fade' ? { opacity: 0 } : false;
        return (
            <motion.h1
                initial={initial}
                animate={glitch ? { opacity: 1, x: [0, -1, 1, 0] } : { opacity: 1, y: 0, x: 0 }}
                transition={glitch ? { x: { duration: 0.18, repeat: Infinity, repeatDelay: 3.2 }, opacity: { duration: 0.25 } } : { duration: 0.42, ease: 'easeOut' }}
                className={titleClass}
            >
                {settings.title}
            </motion.h1>
        );
    }

    const safeIndex = index % words.length;
    const word = words[safeIndex] ?? words[0];
    const wordInitial = settings.titleEffect === 'fade'
        ? { opacity: 0 }
        : settings.titleEffect === 'none' || settings.titleEffect === 'gradient'
            ? { opacity: 1 }
            : { opacity: 0, y: 12 };
    const wordAnimate = glitch
        ? { opacity: 1, y: 0, x: [0, -1, 1, 0] }
        : { opacity: 1, y: 0, x: 0 };

    return (
        <h1 className={titleClass}>
            {settings.titlePrefix && <span>{settings.titlePrefix} </span>}
            <span className="inline-grid align-baseline">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={`${word}-${safeIndex}`}
                        className="col-start-1 row-start-1 inline-block"
                        initial={wordInitial}
                        animate={wordAnimate}
                        exit={settings.titleEffect === 'fade' ? { opacity: 0 } : { opacity: 0, y: -10 }}
                        transition={glitch ? { x: { duration: 0.18 }, opacity: { duration: 0.2 }, y: { duration: 0.2 } } : { duration: 0.28, ease: 'easeOut' }}
                    >
                        {word}
                    </motion.span>
                </AnimatePresence>
            </span>
            {settings.titleSuffix && <span>{settings.titleSuffix}</span>}
        </h1>
    );
}
