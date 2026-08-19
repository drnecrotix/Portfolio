export type HomepageContent = {
    intro: string;
    lineOne: string;
    lineTwoPrefix: string;
    lineTwoSuffix: string;
    lineThreePrefix: string;
    lineThreeSuffix: string;
    collaboration: string;
    locationLabel: string;
    yearLabel: string;
    resumeLabel: string;
    resumeHref: string;
    workspaceUrl: string;
    workspaceTooltip: string;
    assistantTooltip: string;
    availabilityLabel: string;
    profileTitle: string;
    profileDescription: string;
    profileImage: string;
};

export const defaultHomepageContent: HomepageContent = {
    intro: "Hi, I'm Dr Necrotix. I build digital systems, creative projects and communities.",
    lineOne: 'DIGITAL LAB',
    lineTwoPrefix: 'DR.',
    lineTwoSuffix: 'NECROTIX',
    lineThreePrefix: 'BUILD',
    lineThreeSuffix: 'CREATE',
    collaboration: 'Open to meaningful collaborations, creative work and technical projects.',
    locationLabel: 'BULGARIA',
    yearLabel: '2026',
    resumeLabel: 'View Resume',
    resumeHref: '/resume',
    workspaceUrl: '/projects',
    workspaceTooltip: 'Explore Projects',
    assistantTooltip: 'Talk to my AI Assistant',
    availabilityLabel: 'AVAILABLE FOR OPPORTUNITY',
    profileTitle: 'Developer, Creator & Community Builder',
    profileDescription: 'Dr Necrotix builds software, digital experiences, creative projects and online communities with a focus on practical execution and distinctive identity.',
    profileImage: '',
};

export function normalizeHomepageContent(value: unknown): HomepageContent {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<HomepageContent> : {};
    return { ...defaultHomepageContent, ...source };
}
