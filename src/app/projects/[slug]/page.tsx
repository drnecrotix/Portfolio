import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectComposerPage } from '@/components/projects/ProjectComposerPage';
import { getProjectImages } from '@/app/actions/getProjectImages';
import { prisma } from '@/lib/prisma';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { normalizeSeoDefaults } from '@/lib/seo-settings';
import { absoluteSocialMediaUrl, getPublicSiteUrl, socialImageDescriptor } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';

const siteUrl = getPublicSiteUrl();

type ProjectContent = { image?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const [project, settings] = await Promise.all([
        prisma.project.findUnique({ where: { slug } }),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
    ]);
    if (!project || project.status === 'ARCHIVED') return { robots: { index: false, follow: false } };

    const canonical = `${siteUrl}/projects/${slug}`;
    const content = (project.content ?? {}) as ProjectContent;
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const seo = normalizeSeoDefaults(settings?.seoDefaults);
    const ogImage = absoluteSocialMediaUrl(content.image || seo.ogImage || homepage.socialImage);
    const twitterImage = absoluteSocialMediaUrl(content.image || seo.twitterImage || seo.ogImage || homepage.socialImage);
    const title = project.seoTitle?.trim() || project.title;
    const description = project.seoDescription?.trim() || project.description;

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
            images: ogImage ? [socialImageDescriptor(ogImage, project.title)!] : undefined,
        },
        twitter: {
            card: twitterImage ? 'summary_large_image' : 'summary',
            title,
            description,
            images: twitterImage ? [socialImageDescriptor(twitterImage, project.title)!] : undefined,
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
