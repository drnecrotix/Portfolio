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

    useEffect(() => {
        if (isLoading || !showBlog || !showProjects) return;

        const desktopPointer = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let unlockTimer: number | null = null;

        const smoothTo = (section: HTMLElement, block: ScrollLogicalPosition) => {
            if (autoScrollInProgress.current) return;
            autoScrollInProgress.current = true;
            section.scrollIntoView({ behavior: 'smooth', block });
            if (unlockTimer !== null) window.clearTimeout(unlockTimer);
            unlockTimer = window.setTimeout(() => { autoScrollInProgress.current = false; }, 680);
        };

        const handleWheel = (event: WheelEvent) => {
            if (
                !desktopPointer.matches
                || reducedMotion.matches
                || event.defaultPrevented
                || event.ctrlKey
                || autoScrollInProgress.current
                || Math.abs(event.deltaY) < 18
            ) return;

            const journal = document.getElementById('home-blog');
            const projectSection = document.getElementById('home-projects');
            if (!journal || !projectSection) return;

            const journalRect = journal.getBoundingClientRect();
            const projectRect = projectSection.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Assist only at the Journal -> Projects boundary. This avoids the
            // visually empty in-between stop without turning the whole homepage
            // into a forced full-page slider.
            if (
                event.deltaY > 0
                && projectRect.top > viewportHeight * 0.14
                && projectRect.top < viewportHeight * 0.72
                && journalRect.bottom < viewportHeight * 0.82
            ) {
                event.preventDefault();
                smoothTo(projectSection, 'start');
                return;
            }

            if (
                event.deltaY < 0
                && journalRect.bottom > viewportHeight * 0.28
                && journalRect.bottom < viewportHeight * 0.86
                && projectRect.top > viewportHeight * 0.18
            ) {
                event.preventDefault();
                smoothTo(journal, 'end');
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            if (unlockTimer !== null) window.clearTimeout(unlockTimer);
            autoScrollInProgress.current = false;
            window.removeEventListener('wheel', handleWheel);
        };
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
