'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface LoadingScreenProps {
    onComplete?: () => void;
    onExitStart?: () => void;
    duration?: number;
}

const EXIT_DURATION_MS = 1400;

export function LoadingScreen({ onComplete, onExitStart, duration = 2500 }: LoadingScreenProps) {
    const [isLoading, setIsLoading] = useState(true);
    const exitStarted = useRef(false);
    const completionTimer = useRef<number | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onExitStartRef = useRef(onExitStart);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        onExitStartRef.current = onExitStart;
    }, [onComplete, onExitStart]);

    const beginExit = useCallback(() => {
        if (exitStarted.current) return;
        exitStarted.current = true;
        setIsLoading(false);
        onExitStartRef.current?.();
        completionTimer.current = window.setTimeout(() => {
            onCompleteRef.current?.();
        }, EXIT_DURATION_MS);
    }, []);

    useEffect(() => {
        // Do not depend on an animation-complete callback here. Embedded browsers
        // such as Facebook/Instagram WebView can occasionally skip compositor
        // callbacks during the first hydrated frame. A timer keeps the reveal
        // deterministic while the visual animation remains transform based.
        const safeDuration = Number.isFinite(duration) ? Math.max(1800, duration) : 2500;
        const exitDelay = Math.max(900, safeDuration - EXIT_DURATION_MS);
        const exitTimer = window.setTimeout(beginExit, exitDelay);
        return () => window.clearTimeout(exitTimer);
    }, [beginExit, duration]);

    useEffect(() => () => {
        if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
    }, []);

    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{
                        opacity: 0,
                        scale: 1.025,
                        filter: 'blur(12px)',
                        transition: {
                            duration: EXIT_DURATION_MS / 1000,
                            ease: [0.16, 1, 0.3, 1],
                        },
                    }}
                    className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden bg-[#050506] text-white"
                    style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', transformOrigin: '50% 50%' }}
                >
                    <motion.div
                        aria-hidden
                        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_18%_78%,rgba(139,92,246,0.08),transparent_30%),linear-gradient(135deg,#050506_0%,#09090c_50%,#040405_100%)]"
                        exit={{ opacity: 0.55, scale: 1.035 }}
                        transition={{ duration: EXIT_DURATION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
                    />

                    <motion.div
                        aria-hidden
                        initial={{ x: '-18%', y: '12%', scale: 0.9, opacity: 0.2 }}
                        animate={{
                            x: ['-18%', '12%', '-6%'],
                            y: ['12%', '-8%', '6%'],
                            scale: [0.9, 1.08, 0.96],
                            opacity: [0.18, 0.34, 0.2],
                        }}
                        exit={{ scale: 1.16, opacity: 0 }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="pointer-events-none absolute left-[-18vw] top-[-22vw] h-[78vw] w-[78vw] max-h-[900px] max-w-[900px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18)_0%,rgba(34,211,238,0.05)_34%,transparent_70%)] will-change-transform"
                    />
                    <motion.div
                        aria-hidden
                        initial={{ x: '10%', y: '-5%', scale: 1, opacity: 0.16 }}
                        animate={{
                            x: ['10%', '-12%', '5%'],
                            y: ['-5%', '12%', '-3%'],
                            scale: [1, 0.92, 1.06],
                            opacity: [0.14, 0.28, 0.16],
                        }}
                        exit={{ scale: 1.14, opacity: 0 }}
                        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="pointer-events-none absolute bottom-[-28vw] right-[-22vw] h-[82vw] w-[82vw] max-h-[980px] max-w-[980px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.17)_0%,rgba(139,92,246,0.04)_38%,transparent_70%)] will-change-transform"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.975, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -8, scale: 1.025, filter: 'blur(9px)' }}
                        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 flex w-full max-w-[520px] flex-col items-center justify-center px-6 will-change-transform"
                    >
                        <div className="px-3 py-2">
                            <motion.span
                                initial={{ opacity: 0, y: 8, scale: 0.975, filter: 'blur(7px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                transition={{ duration: 1.05, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                                className="block select-none text-7xl leading-none text-white sm:text-8xl md:text-9xl"
                                style={{ fontFamily: 'var(--font-signature)', willChange: 'transform, opacity, filter' }}
                                aria-label="Niko"
                            >
                                Niko
                            </motion.span>
                        </div>

                        <motion.div
                            aria-hidden
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: [0, 0.55, 0.3] }}
                            exit={{ scaleX: 0.72, opacity: 0 }}
                            transition={{ duration: 0.95, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-4 h-px w-28 origin-center bg-gradient-to-r from-transparent via-white/70 to-transparent"
                        />
                    </motion.div>

                    <motion.div
                        aria-hidden
                        animate={{ opacity: [0.18, 0.55, 0.18], scale: [0.85, 1, 0.85] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        exit={{ opacity: 0, scale: 1.8, transition: { duration: 0.45, ease: 'easeOut' } }}
                        className="absolute bottom-10 z-10 h-1.5 w-1.5 rounded-full bg-white/35"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
