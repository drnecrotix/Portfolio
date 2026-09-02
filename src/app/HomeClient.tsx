'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LoadingScreen } from '@/components/layout';
import { HeroVisual } from '@/components/sections/HeroVisual';
import { HomeBlogSection } from '@/components/home/HomeBlogSection';
import { HomeProjectsSection } from '@/components/home/HomeProjectsSection';
import { usePreloadState } from '@/components/ui/arc-preloader-hero';
import type { HomepageContent } from '@/lib/homepage-content';
import type { PublicIdentity } from '@/lib/public-identity';
import type { PublicPost } from '@/lib/cms-posts';
import type { Project } from '@/types';

function readPortfolioLoaded() {
    try {
        return window.sessionStorage.getItem('portfolioLoaded');
    } catch {
        return null;
    }
}

function writePortfolioLoaded() {
    try {
        window.sessionStorage.setItem('portfolioLoaded', 'true');
    } catch {
        // Some embedded browsers can restrict sessionStorage. The loader should
        // still complete normally even when persistence is unavailable.
    }
}

export default function HomeClient({ content, identity, posts, projects }: { content: HomepageContent; identity: PublicIdentity; posts: PublicPost[]; projects: Project[] }) {
    const { phase } = usePreloadState();
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoadingExit, setIsInitialLoadingExit] = useState(false);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const autoScrollInProgress = useRef(false);

    useEffect(() => {
        const hasLoaded = readPortfolioLoaded();
        if (!hasLoaded) return;
        const frame = window.requestAnimationFrame(() => { setSkipAnimation(true); setIsLoading(false); });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const isReadyToAnimate = isLoading ? isInitialLoadingExit : phase === 'reveal' || phase === 'done';
    const showBlog = content.showBlogPosts && posts.length > 0;
    const showProjects = content.showProjects && projects.length > 0;

    const handleLoadingComplete = () => {
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        writePortfolioLoaded();
    };

    const smoothTo = (id: string) => {
        const section = document.getElementById(id);
        if (!section || autoScrollInProgress.current) return;
        autoScrollInProgress.current = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => { autoScrollInProgress.current = false; }, 850);
    };

    useEffect(() => {
        if (isLoading) return;

        const sectionIds = ['home-hero'];
        if (showBlog) sectionIds.push('home-blog');
        if (showProjects) sectionIds.push('home-projects');

        const handleWheel = (event: WheelEvent) => {
            if (Math.abs(event.deltaY) < 14 || autoScrollInProgress.current || event.ctrlKey) return;

            const viewportCenter = window.scrollY + window.innerHeight / 2;
            let currentIndex = 0;
            let closestDistance = Number.POSITIVE_INFINITY;

            sectionIds.forEach((id, index) => {
                const section = document.getElementById(id);
                if (!section) return;
                const rect = section.getBoundingClientRect();
                const sectionCenter = window.scrollY + rect.top + rect.height / 2;
                const distance = Math.abs(sectionCenter - viewportCenter);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    currentIndex = index;
                }
            });

            const nextIndex = event.deltaY > 0 ? currentIndex + 1 : currentIndex - 1;
            const targetId = sectionIds[nextIndex];
            if (!targetId) return;

            event.preventDefault();
            smoothTo(targetId);
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [isLoading, showBlog, showProjects]);

    return (
        <>
            {isLoading && <LoadingScreen onComplete={handleLoadingComplete} onExitStart={() => setIsInitialLoadingExit(true)} duration={2500} />}
            <motion.main
                id="home-hero"
                initial={skipAnimation ? false : { opacity: 0, y: 40 }}
                animate={skipAnimation ? { opacity: 1, y: 0 } : isReadyToAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: skipAnimation ? 0 : 1.4, ease: skipAnimation ? 'linear' : [0.16, 1, 0.3, 1], opacity: { duration: skipAnimation ? 0 : 0.8 } }}
                className="home-hero-container relative flex h-[100svh] min-h-[100svh] flex-none overflow-hidden will-change-transform will-change-opacity [&>div]:!h-[100svh] [&>div]:!min-h-[100svh]"
            >
                <HeroVisual isExiting={isReadyToAnimate} content={content} identity={identity} />
            </motion.main>
            {showBlog && <HomeBlogSection posts={posts} />}
            {showProjects && <HomeProjectsSection projects={projects} />}
        </>
    );
}
