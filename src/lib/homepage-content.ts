export type HomepageContent = {
    intro: string;
    lineOne: string;
    lineTwoPrefix: string;
    lineTwoSuffix: string;
    lineThreePrefix: string;
    lineThreeSuffix: string;
    collaboration: string;
    workspaceUrl: string;
    workspaceTooltip: string;
    assistantTooltip: string;
    availabilityLabel: string;
    profileTitle: string;
    profileDescription: string;
    profileImage: string;
    showBlogPosts: boolean;
    homeBlogTitle: string;
    homeBlogSubtitle: string;
    homeBlogPostLimit: number;
    showProjects: boolean;
    homeProjectsTitle: string;
    homeProjectsSubtitle: string;
    homeProjectLimit: number;
    socialImage: string;
    openGraphImage: string;
    twitterImage: string;
    customMetaTags: string;
};

export type CustomMetaTag = { attribute: 'name' | 'property' | 'http-equiv'; key: string; content: string };

export const defaultHomepageContent: HomepageContent = {
    intro: "Hi, I'm Dr Necrotix. I build digital systems, creative projects and communities.",
    lineOne: 'DIGITAL LAB',
    lineTwoPrefix: 'DR.',
    lineTwoSuffix: 'NECROTIX',
    lineThreePrefix: 'BUILD',
    lineThreeSuffix: 'CREATE',
    collaboration: 'Open to meaningful collaborations, creative work and technical projects.',
    workspaceUrl: '/projects',
    workspaceTooltip: 'Explore Projects',
    assistantTooltip: 'Talk to my AI Assistant',
    availabilityLabel: 'AVAILABLE FOR OPPORTUNITY',
    profileTitle: 'Developer, Creator & Community Builder',
    profileDescription: 'Dr Necrotix builds software, digital experiences, creative projects and online communities with a focus on practical execution and distinctive identity.',
    profileImage: '',
    showBlogPosts: true,
    homeBlogTitle: 'Latest from the blog',
    homeBlogSubtitle: 'Recent publications, notes and ideas.',
    homeBlogPostLimit: 6,
    showProjects: true,
    homeProjectsTitle: 'Selected projects',
    homeProjectsSubtitle: 'Current and completed work from the lab.',
    homeProjectLimit: 6,
    socialImage: '',
    openGraphImage: '',
    twitterImage: '',
    customMetaTags: '',
};

export function normalizeHomepageContent(value: unknown): HomepageContent {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<HomepageContent> : {};
    const blogLimit = Number(source.homeBlogPostLimit);
    const projectLimit = Number(source.homeProjectLimit);
    return {
        ...defaultHomepageContent,
        ...source,
        showBlogPosts: source.showBlogPosts !== false,
        homeBlogPostLimit: Number.isFinite(blogLimit) ? Math.max(1, Math.min(12, Math.round(blogLimit))) : defaultHomepageContent.homeBlogPostLimit,
        showProjects: source.showProjects !== false,
        homeProjectLimit: Number.isFinite(projectLimit) ? Math.max(1, Math.min(12, Math.round(projectLimit))) : defaultHomepageContent.homeProjectLimit,
    };
}

export function parseCustomMetaTags(value: string): CustomMetaTag[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 50).flatMap((line) => {
        const match = line.match(/^(name|property|http-equiv)\s*:\s*([^=]+?)\s*=\s*(.+)$/i);
        if (!match) return [];
        const attribute = match[1].toLowerCase() as CustomMetaTag['attribute'];
        const key = match[2].trim().replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120);
        const content = match[3].trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 1000);
        if (!key || !content) return [];
        return [{ attribute, key, content }];
    });
}
