import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectComposerPage } from '@/components/projects/ProjectComposerPage';
import { getProjectImages } from '@/app/actions/getProjectImages';
import { prisma } from '@/lib/prisma';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

type ProjectContent = { image?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const project = await prisma.project.findUnique({ where: { slug } });
    if (!project || project.status === 'ARCHIVED') return { robots: { index: false, follow: false } };

    const canonical = `${siteUrl}/projects/${slug}`;
    const content = (project.content ?? {}) as ProjectContent;
    const title = project.seoTitle?.trim() || project.title;
    const description = project.seoDescription?.trim() || project.description;
    const image = content.image || undefined;

    return {
        title,
        description,
        alternates: { canonical },
        robots: { index: true, follow: true },
        openGraph: {
            type: 'website',
            url: canonical,
            title,
            description,
            images: image ? [{ url: image, alt: project.title }] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

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

    return <ProjectComposerPage project={updatedProject} />;
}
