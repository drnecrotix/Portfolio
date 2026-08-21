"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArcRevealHero, PreloadContext } from "@/components/ui/arc-preloader-hero";

export function ArcPreloaderWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const initialPath = useRef(pathname);
    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        if (pathname !== initialPath.current) setHasNavigated(true);
    }, [pathname]);

    // Keep the cinematic reveal for an initial public page load only. When it is
    // bypassed, still provide an explicit completed preload state so components
    // using usePreloadState() never remain stuck in the default intro phase.
    if (pathname.startsWith('/admin') || hasNavigated) {
        return (
            <PreloadContext.Provider value={{ isPreloading: false, phase: 'done' }}>
                {children}
            </PreloadContext.Provider>
        );
    }

    return <ArcRevealHero>{children}</ArcRevealHero>;
}
