"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArcRevealHero } from "@/components/ui/arc-preloader-hero";

export function ArcPreloaderWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const initialPath = useRef(pathname);
    const [hasNavigated, setHasNavigated] = useState(false);

    useEffect(() => {
        if (pathname !== initialPath.current) setHasNavigated(true);
    }, [pathname]);

    // Keep the cinematic reveal for an initial public page load only. Internal route
    // changes (including CMS navigation and Home) should feel instant and never show
    // generated route titles such as "Admin" or "Home" as a loading screen.
    if (pathname.startsWith('/admin') || hasNavigated) {
        return <>{children}</>;
    }

    return <ArcRevealHero>{children}</ArcRevealHero>;
}
