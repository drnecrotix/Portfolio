import { prisma } from '@/lib/prisma';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import { ProjectsArchiveClient } from '@/components/projects/ProjectsArchiveClient';
import { protectManagedMediaUrls } from '@/lib/blog-media-protection';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    const cmsProjects = await prisma.project.findMany({
        where: {
            status: { not: 'ARCHIVED' },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const projects = cmsProjects.map(cmsProjectToPortfolioProject);
    const replacements = await protectManagedMediaUrls(projects.flatMap((project) => [project.image ?? '', ...(project.galleryImages ?? [])]));
    const protectedProjects = projects.map((project) => ({
        ...project,
        image: project.image ? replacements.get(project.image) ?? project.image : project.image,
        galleryImages: project.galleryImages?.map((image) => replacements.get(image) ?? image),
    }));

    return <ProjectsArchiveClient projects={protectedProjects} />;
}
