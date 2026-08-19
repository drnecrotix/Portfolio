import { prisma } from '@/lib/prisma';
import { portfolioData } from '@/data/portfolio';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import { ProjectsArchiveClient } from '@/components/projects/ProjectsArchiveClient';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    const cmsProjects = await prisma.project.findMany({
        where: {
            status: { not: 'ARCHIVED' },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const projects = cmsProjects.length > 0
        ? cmsProjects.map(cmsProjectToPortfolioProject)
        : portfolioData.projects;

    return <ProjectsArchiveClient projects={projects} />;
}
