import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity, defaultPublicIdentity } from '@/lib/public-identity';
import { cmsPostToPublicPost, type PublicPost } from '@/lib/cms-posts';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import {
    EXPERIMENT_VARIANT_COOKIE,
    assignHomepageExperimentVariants,
    parseExperimentVariants,
} from '@/lib/experiments';
import type { Project } from '@/types';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

const HOME_SECTION_LIMIT = 5;

export default async function HomePage() {
    let rawContent: unknown = null;
    let identity = defaultPublicIdentity;
    let posts: PublicPost[] = [];
    let projects: Project[] = [];

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        rawContent = settings?.homepageContent;
        const homepage = normalizeHomepageContent(rawContent);
        identity = buildPublicIdentity(settings, homepage.profileImage);

        if (homepage.showBlogPosts) {
            const cmsPosts = await prisma.post.findMany({
                where: {
                    status: 'PUBLISHED',
                    OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
                },
                include: {
                    postType: { select: { name: true, slug: true } },
                    categoryRef: { select: { name: true, slug: true } },
                },
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: Math.min(HOME_SECTION_LIMIT, homepage.homeBlogPostLimit),
            });
            posts = cmsPosts.map((post) => cmsPostToPublicPost(post));
        }

        if (homepage.showProjects) {
            const cmsProjects = await prisma.project.findMany({
                where: { status: { not: 'ARCHIVED' } },
                orderBy: [{ createdAt: 'desc' }, { sortOrder: 'asc' }],
                take: Math.min(HOME_SECTION_LIMIT, homepage.homeProjectLimit),
            });
            projects = cmsProjects.map(cmsProjectToPortfolioProject);
        }
    } catch {
        // Keep the public hero available even if CMS content cannot be loaded.
    }

    const cookieStore = await cookies();
    const experimentVariants = parseExperimentVariants(cookieStore.get(EXPERIMENT_VARIANT_COOKIE)?.value)
        || assignHomepageExperimentVariants();

    return (
        <HomeClient
            content={normalizeHomepageContent(rawContent)}
            identity={identity}
            posts={posts}
            projects={projects}
            experimentVariants={experimentVariants}
        />
    );
}
