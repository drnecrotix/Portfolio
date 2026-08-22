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
    const isSiteStatus = pathname === '/site-status';
    const projectsIndex = segments.indexOf('projects');
    const isProjectDetail = projectsIndex !== -1 && segments.length > projectsIndex + 1;
    const blogIndex = segments.indexOf('blog');
    const isBlogDetail = blogIndex !== -1 && segments.length > blogIndex + 1;

    const showNavbar = !isAdmin && !isSiteStatus;
    const showFooter = !isAdmin && !isProjectDetail && !isBlogDetail && !isSiteStatus;
    const showBackToTop = showFooter && !isHome;
    const useShell = showNavbar || showFooter || showBackToTop;
    const shellClassName = !useShell
        ? 'contents'
        : isHome
            ? 'relative flex min-h-[100dvh] flex-col overflow-x-hidden'
            : 'relative flex min-h-screen flex-col';
    const contentClassName = !useShell
        ? 'contents'
        : isHome
            ? 'relative flex min-h-0 flex-1 flex-col'
            : 'relative flex-1';

    return (
        <div className={shellClassName}>
            {showNavbar && <Navbar />}
            <div className={contentClassName}>{children}</div>
            {showFooter && <Footer />}
            {showBackToTop && <BackToTop />}
        </div>
    );
}
