'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ReactLenis, useLenis } from 'lenis/react';

function RouteScrollReset() {
    const pathname = usePathname();
    const lenis = useLenis();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let secondFrame = 0;
        const resetScroll = () => {
            lenis?.scrollTo(0, { immediate: true, force: true });
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };

        // Reset immediately, then again after the new route has committed.
        // Lenis can otherwise retain the previous page's virtual scroll position.
        resetScroll();
        const firstFrame = window.requestAnimationFrame(() => {
            resetScroll();
            secondFrame = window.requestAnimationFrame(resetScroll);
        });

        return () => {
            window.cancelAnimationFrame(firstFrame);
            if (secondFrame) window.cancelAnimationFrame(secondFrame);
        };
    }, [pathname, lenis]);

    return null;
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    return (
        <ReactLenis root options={{
            lerp: 0.1,
            duration: 1.5,
            smoothWheel: true,
            // smoothTouch is not present in this Lenis version's published option types.
            // @ts-expect-error - supported at runtime by the currently installed Lenis build.
            smoothTouch: false
        }}>
            <RouteScrollReset />
            {children}
        </ReactLenis>
    );
}
