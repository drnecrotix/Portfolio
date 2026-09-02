'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { usePerformance } from '@/hooks/usePerformance';

const logos = [
    '/assets/DBSLogo.webp',
    '/assets/HMITlogo.webp',
    '/assets/HumicLogo.webp',
    '/assets/McKinseylogo.webp',
    '/assets/TelkomUniversityLogo.webp',
    '/assets/aieseclogo.webp',
    '/assets/aselablogo.webp',
    '/assets/birulangitlogo.webp',
    '/assets/cisometriclogo.webp',
    '/assets/dicodinglogo.webp',
    '/assets/dinas-pangan-dan-pertanian-kota-bandung.webp',
    '/assets/flyrankailogo.webp',
    '/assets/iflablogo.webp',
    '/assets/indosat-ooredoo-hutchison-digital-camp.webp',
    '/assets/logobei.webp',
    '/assets/logocps.webp',
    '/assets/logodigistar.webp',
    '/assets/logogdsc.webp',
    '/assets/microsotlogo.webp',
    '/assets/sman88logo.webp',
    '/assets/softagelogo.webp',
    '/assets/yotlogo.webp',
    '/assets/youth-ranger-indonesia.webp',
];

function PartnerLogo({ src }: { src: string }) {
    return (
        <div className="group relative flex h-16 w-32 shrink-0 items-center justify-center rounded-2xl border border-border/35 bg-card/20 px-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/70 hover:bg-card/45 sm:h-20 sm:w-40">
            <Image
                src={src}
                alt="Partner or sponsor logo"
                fill
                sizes="(max-width: 640px) 128px, 160px"
                unoptimized
                className="object-contain p-3 opacity-55 grayscale transition-all duration-300 group-hover:opacity-100 dark:brightness-0 dark:invert"
            />
        </div>
    );
}

export default function ExperienceMarquee() {
    const { isLowPowerMode } = usePerformance();
    const repeatedLogos = [...logos, ...logos, ...logos];

    return (
        <div className="relative w-full overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-background via-background/90 to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-background via-background/90 to-transparent sm:w-24" />

            <div className="overflow-hidden py-1">
                <motion.div
                    className="flex w-max items-center gap-3 pr-3 sm:gap-4 sm:pr-4"
                    animate={isLowPowerMode ? undefined : { x: ['0%', '-33.333%'] }}
                    transition={isLowPowerMode ? undefined : {
                        x: {
                            repeat: Infinity,
                            repeatType: 'loop',
                            duration: 70,
                            ease: 'linear',
                        },
                    }}
                >
                    {repeatedLogos.map((logo, index) => (
                        <PartnerLogo key={`${logo}-${index}`} src={logo} />
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
