import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity, defaultPublicIdentity } from '@/lib/public-identity';
import { cmsPostToPublicPost, type PublicPost } from '@/lib/cms-posts';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import type { Project } from '@/types';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

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
                take: homepage.homeBlogPostLimit,
            });
            posts = cmsPosts.map((post) => cmsPostToPublicPost(post));
        }

        if (homepage.showProjects) {
            const cmsProjects = await prisma.project.findMany({
                where: { status: { not: 'ARCHIVED' } },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
                take: homepage.homeProjectLimit,
            });
            projects = cmsProjects.map(cmsProjectToPortfolioProject);
        }
    } catch {
        // Keep the public hero available even if CMS content cannot be loaded.
    }

    return <HomeClient content={normalizeHomepageContent(rawContent)} identity={identity} posts={posts} projects={projects} />;
}
