"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArcRevealHero } from "@/components/ui/arc-preloader-hero";

export function ArcPreloaderWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const previousPath = useRef(pathname);
    const isAdmin = pathname.startsWith('/admin');
    const cameFromAdmin = previousPath.current.startsWith('/admin');

    useEffect(() => {
        previousPath.current = pathname;
    }, [pathname]);

    // The public site keeps the cinematic route reveal, but CMS navigation and the
    // first public navigation after leaving the CMS should behave like a fast app.
    if (isAdmin || cameFromAdmin) {
        return <>{children}</>;
    }

    return <ArcRevealHero>{children}</ArcRevealHero>;
}
