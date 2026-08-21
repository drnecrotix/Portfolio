'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { BackToTop } from '@/components/ui/BackToTop';

export function ConditionalNavigation({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const segments = pathname?.split('/').filter(Boolean) || [];
    const isHome = pathname === '/';
    const isAdmin = segments[0] === 'admin';
    const projectsIndex = segments.indexOf('projects');
    const isProjectDetail = projectsIndex !== -1 && segments.length > projectsIndex + 1;
    const blogIndex = segments.indexOf('blog');
    const isBlogDetail = blogIndex !== -1 && segments.length > blogIndex + 1;

    const showNavbar = !isAdmin && !isProjectDetail;
    const showFooter = !isAdmin && !isProjectDetail && !isBlogDetail;
    const showBackToTop = showFooter && !isHome;
    const useShell = showNavbar || showFooter || showBackToTop;
    const shellClassName = !useShell
        ? 'contents'
        : isHome
            ? 'relative flex h-[100svh] max-h-[100svh] flex-col overflow-hidden'
            : 'relative flex min-h-screen flex-col';
    const contentClassName = !useShell
        ? 'contents'
        : isHome
            ? 'relative min-h-0 flex-1 overflow-hidden'
            : 'relative flex-1';

    return (
        <div className={shellClassName}>
            {showNavbar && <Navbar />}
            <div className={contentClassName}>{children}</div>

            {showFooter && isHome ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 overflow-hidden [&_footer]:pointer-events-auto [&_footer>div]:px-4 [&_footer>div]:py-3 sm:[&_footer>div]:px-6 sm:[&_footer>div]:py-4 [&_footer>div>div]:px-3 [&_footer>div>div]:py-3 sm:[&_footer>div>div]:px-5">
                    <Footer />
                </div>
            ) : showFooter ? (
                <Footer />
            ) : null}

            {showBackToTop && <BackToTop />}
        </div>
    );
}
