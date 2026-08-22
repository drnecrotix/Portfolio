'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
    onComplete?: () => void;
    onExitStart?: () => void;
    duration?: number;
}

export function LoadingScreen({ onComplete, onExitStart }: LoadingScreenProps) {
    const [isLoading, setIsLoading] = useState(true);

    const handleAnimationComplete = () => {
        // Keep the original loader exit timing and page reveal behavior.
        setTimeout(() => {
            setIsLoading(false);
            onExitStart?.();
            setTimeout(() => {
                onComplete?.();
            }, 1200);
        }, 300);
    };

    return (
        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div
                    initial={{ y: 0 }}
                    exit={{
                        y: '-100%',
                        transition: {
                            duration: 1.2,
                            ease: [0.7, 0, 0.3, 1],
                        },
                    }}
                    className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background overflow-hidden will-change-transform"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                            opacity: 0,
                            y: -40,
                            transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] },
                        }}
                        className="relative flex flex-col items-center justify-center w-full max-w-[400px] will-change-transform"
                    >
                        <motion.span
                            initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
                            animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
                            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                            onAnimationComplete={handleAnimationComplete}
                            className="select-none text-7xl leading-none text-foreground sm:text-8xl md:text-9xl"
                            style={{ fontFamily: 'var(--font-signature)' }}
                            aria-label="Niko"
                        >
                            Niko
                        </motion.span>
                    </motion.div>

                    {/* Subtle aesthetic dot */}
                    <motion.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="absolute bottom-12 w-1.5 h-1.5 rounded-full bg-foreground/10"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
