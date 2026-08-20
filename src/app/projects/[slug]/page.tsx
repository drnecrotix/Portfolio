import { notFound } from 'next/navigation';
import { ProjectPageContent } from '@/components/projects/ProjectPageContent';
import { getProjectImages } from '@/app/actions/getProjectImages';
import { prisma } from '@/lib/prisma';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const cmsProject = await prisma.project.findUnique({ where: { slug } });
    if (!cmsProject || cmsProject.status === 'ARCHIVED') notFound();

    const project = cmsProjectToPortfolioProject(cmsProject);
    const galleryImages = await getProjectImages(slug, project.title);
    const updatedProject = {
        ...project,
        image: galleryImages.length > 0 ? galleryImages[0] : project.image,
        galleryImages: galleryImages.length > 0 ? galleryImages : project.galleryImages,
    };

    return <ProjectPageContent project={updatedProject} />;
}
