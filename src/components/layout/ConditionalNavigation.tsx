'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { BackToTop } from '@/components/ui/BackToTop';

export function ConditionalNavigation({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const segments = pathname?.split('/').filter(Boolean) || [];
    const isAdmin = segments[0] === 'admin';
    const projectsIndex = segments.indexOf('projects');
    const isProjectDetail = projectsIndex !== -1 && segments.length > projectsIndex + 1;
    const blogIndex = segments.indexOf('blog');
    const isBlogDetail = blogIndex !== -1 && segments.length > blogIndex + 1;
    const useFullLayout = !isAdmin && !(isProjectDetail || isBlogDetail);

    return (
        <div className={useFullLayout ? 'relative flex min-h-screen flex-col' : 'contents'}>
            {useFullLayout && <Navbar />}
            <div className={useFullLayout ? 'relative flex-1' : 'contents'}>{children}</div>
            {useFullLayout && <Footer />}
            {useFullLayout && <BackToTop />}
        </div>
    );
}
