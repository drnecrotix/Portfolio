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

export default function HomeClient({ content, identity, posts, projects }: { content: HomepageContent; identity: PublicIdentity; posts: PublicPost[]; projects: Project[] }) {
    const { phase } = usePreloadState();
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoadingExit, setIsInitialLoadingExit] = useState(false);
    const [skipAnimation, setSkipAnimation] = useState(false);
    const autoScrollInProgress = useRef(false);

    useEffect(() => {
        const hasLoaded = sessionStorage.getItem('portfolioLoaded');
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
        sessionStorage.setItem('portfolioLoaded', 'true');
    };

    const smoothTo = (id: string) => {
        const section = document.getElementById(id);
        if (!section || autoScrollInProgress.current) return;
        autoScrollInProgress.current = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => { autoScrollInProgress.current = false; }, 900);
    };

    const handleHeroWheel = (event: React.WheelEvent<HTMLElement>) => {
        if (event.deltaY < 12 || autoScrollInProgress.current || window.scrollY > 120) return;
        const target = showBlog ? 'home-blog' : showProjects ? 'home-projects' : '';
        if (!target) return;
        event.preventDefault();
        smoothTo(target);
    };

    const handleBlogWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        if (!showProjects || event.deltaY < 12 || autoScrollInProgress.current) return;
        const blog = document.getElementById('home-blog');
        if (!blog || blog.getBoundingClientRect().bottom > window.innerHeight + 120) return;
        event.preventDefault();
        smoothTo('home-projects');
    };

    return (
        <>
            {isLoading && <LoadingScreen onComplete={handleLoadingComplete} onExitStart={() => setIsInitialLoadingExit(true)} duration={2500} />}
            <motion.main
                initial={skipAnimation ? false : { opacity: 0, y: 40 }}
                animate={skipAnimation ? { opacity: 1, y: 0 } : isReadyToAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: skipAnimation ? 0 : 1.4, ease: skipAnimation ? 'linear' : [0.16, 1, 0.3, 1], opacity: { duration: skipAnimation ? 0 : 0.8 } }}
                className="home-hero-container relative flex min-h-0 flex-1 overflow-hidden will-change-transform will-change-opacity [&>div]:!min-h-0"
                onWheel={handleHeroWheel}
            >
                <HeroVisual isExiting={isReadyToAnimate} content={content} identity={identity} />
            </motion.main>
            {showBlog && <div onWheel={handleBlogWheel}><HomeBlogSection posts={posts} title={content.homeBlogTitle} subtitle={content.homeBlogSubtitle} /></div>}
            {showProjects && <HomeProjectsSection projects={projects} title={content.homeProjectsTitle} subtitle={content.homeProjectsSubtitle} />}
        </>
    );
}
