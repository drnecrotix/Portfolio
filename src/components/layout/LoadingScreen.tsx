'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
    onComplete?: () => void;
    onExitStart?: () => void;
    duration?: number;
}

export function LoadingScreen({ onComplete, onExitStart, duration = 1.15 }: LoadingScreenProps) {
    const [isLoading, setIsLoading] = useState(true);

    const handleAnimationComplete = () => {
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
                    className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden bg-background will-change-transform"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 18, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{
                            opacity: 0,
                            y: -40,
                            transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] },
                        }}
                        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
                        onAnimationComplete={handleAnimationComplete}
                        className="relative flex w-full max-w-[480px] items-center justify-center px-6 will-change-transform"
                    >
                        <span
                            className="select-none text-[5rem] leading-none text-foreground sm:text-[6.5rem] md:text-[8rem]"
                            style={{ fontFamily: 'var(--font-signature)' }}
                            aria-label="Niko"
                        >
                            Niko
                        </span>
                    </motion.div>

                    <motion.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="absolute bottom-12 h-1.5 w-1.5 rounded-full bg-foreground/10"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
