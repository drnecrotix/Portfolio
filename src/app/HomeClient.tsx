'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { LoadingScreen } from '@/components/layout';
import { HeroVisual } from '@/components/sections/HeroVisual';
import { HomeBlogSection } from '@/components/home/HomeBlogSection';
import { HomeProjectsSection } from '@/components/home/HomeProjectsSection';
import { usePreloadState } from '@/components/ui/arc-preloader-hero';
import { useExperimentTelemetry } from '@/lib/experiments-client';
import type { ExperimentVariantMap } from '@/lib/experiments';
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

type Props = {
    content: HomepageContent;
    identity: PublicIdentity;
    posts: PublicPost[];
    projects: Project[];
    experimentVariants: ExperimentVariantMap;
};

export default function HomeClient({ content, identity, posts, projects, experimentVariants }: Props) {
    const { phase } = usePreloadState();
    const trackExperiment = useExperimentTelemetry(experimentVariants);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoadingExit, setIsInitialLoadingExit] = useState(false);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
    const autoScrollInProgress = useRef(false);

    useEffect(() => {
        const hasLoaded = readPortfolioLoaded();
        const frame = window.requestAnimationFrame(() => {
            setIsFirstVisit(!hasLoaded);
            if (hasLoaded) {
                setSkipAnimation(true);
                setIsLoading(false);
            }
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const isReadyToAnimate = isLoading ? isInitialLoadingExit : phase === 'reveal' || phase === 'done';
    const showBlog = content.showBlogPosts && posts.length > 0;
    const showProjects = content.showProjects && projects.length > 0;
    const orderExperimentApplies = showBlog && showProjects;
    const projectsFirst = orderExperimentApplies && experimentVariants['home-section-order'] === 'B';
    const showHeroCtas = experimentVariants['hero-micro-cta'] === 'B' && isReadyToAnimate;
    const loaderDuration = experimentVariants['niko-loader-duration'] === 'B' ? 2000 : 2500;

    useEffect(() => {
        trackExperiment('hero-micro-cta', 'exposure');
    }, [trackExperiment]);

    useEffect(() => {
        if (orderExperimentApplies) trackExperiment('home-section-order', 'exposure');
    }, [orderExperimentApplies, trackExperiment]);

    useEffect(() => {
        if (isFirstVisit === true) trackExperiment('niko-loader-duration', 'exposure');
    }, [isFirstVisit, trackExperiment]);

    const handleLoadingComplete = () => {
        setIsLoading(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        writePortfolioLoaded();
    };

    useEffect(() => {
        if (isLoading || isFirstVisit !== true) return;

        const markEngaged = () => trackExperiment('niko-loader-duration', 'engaged');
        const timer = window.setTimeout(markEngaged, 10000);
        window.addEventListener('pointerdown', markEngaged, { once: true, passive: true });
        window.addEventListener('wheel', markEngaged, { once: true, passive: true });
        window.addEventListener('keydown', markEngaged, { once: true });

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('pointerdown', markEngaged);
            window.removeEventListener('wheel', markEngaged);
            window.removeEventListener('keydown', markEngaged);
        };
    }, [isFirstVisit, isLoading, trackExperiment]);

    useEffect(() => {
        if (isLoading || !showProjects) return;
        const section = document.getElementById('home-projects');
        if (!section) return;

        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            if (isFirstVisit === true) trackExperiment('niko-loader-duration', 'projects_seen');
            if (orderExperimentApplies) trackExperiment('home-section-order', 'projects_seen');
            trackExperiment('hero-micro-cta', 'projects_seen');
            observer.disconnect();
        }, { threshold: 0.25 });

        observer.observe(section);
        return () => observer.disconnect();
    }, [isFirstVisit, isLoading, orderExperimentApplies, showProjects, trackExperiment]);

    useEffect(() => {
        if (isLoading || !orderExperimentApplies) return;

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

            const firstSection = document.getElementById(projectsFirst ? 'home-projects' : 'home-blog');
            const secondSection = document.getElementById(projectsFirst ? 'home-blog' : 'home-projects');
            if (!firstSection || !secondSection) return;

            const firstRect = firstSection.getBoundingClientRect();
            const secondRect = secondSection.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            if (
                event.deltaY > 0
                && secondRect.top > viewportHeight * 0.14
                && secondRect.top < viewportHeight * 0.72
                && firstRect.bottom < viewportHeight * 0.82
            ) {
                event.preventDefault();
                smoothTo(secondSection, 'start');
                return;
            }

            if (
                event.deltaY < 0
                && firstRect.bottom > viewportHeight * 0.28
                && firstRect.bottom < viewportHeight * 0.86
                && secondRect.top > viewportHeight * 0.18
            ) {
                event.preventDefault();
                smoothTo(firstSection, 'end');
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            if (unlockTimer !== null) window.clearTimeout(unlockTimer);
            autoScrollInProgress.current = false;
            window.removeEventListener('wheel', handleWheel);
        };
    }, [isLoading, orderExperimentApplies, projectsFirst]);

    const handleProjectOpen = () => {
        if (isFirstVisit === true) trackExperiment('niko-loader-duration', 'project_open');
        if (orderExperimentApplies) trackExperiment('home-section-order', 'project_open');
        trackExperiment('hero-micro-cta', 'project_open');
    };

    const handleBlogOpen = () => {
        if (isFirstVisit === true) trackExperiment('niko-loader-duration', 'blog_open');
        if (orderExperimentApplies) trackExperiment('home-section-order', 'blog_open');
        trackExperiment('hero-micro-cta', 'blog_open');
    };

    const journalSection = showBlog ? <HomeBlogSection posts={posts} onPostOpen={handleBlogOpen} /> : null;
    const projectsSection = showProjects ? <HomeProjectsSection projects={projects} onProjectOpen={handleProjectOpen} /> : null;

    return (
        <>
            {isLoading && <LoadingScreen onComplete={handleLoadingComplete} onExitStart={() => setIsInitialLoadingExit(true)} duration={loaderDuration} />}
            <motion.main
                id="home-hero"
                initial={skipAnimation ? false : { opacity: 0, y: 40 }}
                animate={skipAnimation ? { opacity: 1, y: 0 } : isReadyToAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: skipAnimation ? 0 : 1.4, ease: skipAnimation ? 'linear' : [0.16, 1, 0.3, 1], opacity: { duration: skipAnimation ? 0 : 0.8 } }}
                className="home-hero-container relative flex h-[100svh] min-h-[100svh] flex-none overflow-hidden will-change-transform will-change-opacity [&>div]:!h-[100svh] [&>div]:!min-h-[100svh]"
            >
                <HeroVisual isExiting={isReadyToAnimate} content={content} identity={identity} />
                {showHeroCtas && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-7 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-5 whitespace-nowrap rounded-full border border-foreground/10 bg-background/55 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70 shadow-lg backdrop-blur-xl sm:bottom-9 sm:text-[11px]"
                    >
                        <Link href="/projects" onClick={handleProjectOpen} className="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                            View projects <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                        <span className="h-3 w-px bg-foreground/15" aria-hidden />
                        <Link href="/gallery" onClick={() => {
                            trackExperiment('hero-micro-cta', 'gallery_open');
                            if (isFirstVisit === true) trackExperiment('niko-loader-duration', 'gallery_open');
                        }} className="group inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                            Explore gallery <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </motion.div>
                )}
            </motion.main>
            {projectsFirst ? <>{projectsSection}{journalSection}</> : <>{journalSection}{projectsSection}</>}
        </>
    );
}
