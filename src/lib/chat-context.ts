import { prisma } from '@/lib/prisma';
import { normalizeGeneralSiteSettings } from '@/lib/site-settings';

const MAX_PROJECTS = 12;

export async function buildPortfolioChatContext() {
    const [settings, projects] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }),
        prisma.project.findMany({
            where: { status: { in: ['ONGOING', 'COMPLETED'] } },
            orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
            take: MAX_PROJECTS,
            select: {
                title: true,
                description: true,
                category: true,
                technologies: true,
                role: true,
                repoUrl: true,
                demoUrl: true,
            },
        }),
    ]);

    const general = normalizeGeneralSiteSettings(settings);
    const socials = Object.entries(general.socialLinks)
        .filter(([, value]) => Boolean(value))
        .map(([name, value]) => `${name}: ${value}`)
        .join('\n');

    const projectList = projects.length
        ? projects.map((project) => {
            const links = [project.demoUrl ? `Demo: ${project.demoUrl}` : '', project.repoUrl ? `Repo: ${project.repoUrl}` : '']
                .filter(Boolean)
                .join(' · ');
            return `- ${project.title}${project.category ? ` (${project.category})` : ''}: ${project.description}${project.technologies.length ? ` Tech: ${project.technologies.join(', ')}.` : ''}${project.role ? ` Role: ${project.role}.` : ''}${links ? ` ${links}` : ''}`;
        }).join('\n')
        : 'No published projects are currently available.';

    return {
        siteName: general.siteName,
        siteDescription: general.siteDescription,
        contactEmail: general.contactDetails.email,
        location: general.contactDetails.location,
        socials,
        projectList,
    };
}
