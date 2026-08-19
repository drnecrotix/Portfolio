import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cmsProjectToPortfolioProject } from '@/lib/cms-projects';
import { ProjectPageContent } from '@/components/projects/ProjectPageContent';

export const dynamic = 'force-dynamic';

export default async function ProjectPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) notFound();

    return (
        <div className="-m-6 md:-m-10 lg:-m-12">
            <div className="sticky top-0 z-[120] flex items-center justify-between border-b border-white/10 bg-black/90 px-5 py-3 backdrop-blur-xl">
                <div><p className="text-xs uppercase tracking-[0.25em] text-white/35">CMS Preview</p><p className="text-sm text-white/70">{project.title}</p></div>
                <Link href={`/admin/projects/${project.id}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-white">Back to editor</Link>
            </div>
            <ProjectPageContent project={cmsProjectToPortfolioProject(project)} />
        </div>
    );
}
