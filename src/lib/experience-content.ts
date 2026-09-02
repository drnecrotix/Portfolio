export type ExperienceTabId = 'education' | 'journey' | 'experience';

export type ExperienceCategory = {
    id: string;
    label: string;
    description: string;
    prefix: string;
    enabled: boolean;
};

export type ExperienceHighlight = {
    title: string;
    highlight: string;
    description: string;
    enabled: boolean;
};

export type ExperienceContent = {
    pageEnabled: boolean;
    showHero: boolean;
    showDecorations: boolean;
    showMarquee: boolean;
    showTabs: boolean;
    showEducation: boolean;
    showJourney: boolean;
    showExperience: boolean;
    showHighlights: boolean;
    showSkills: boolean;
    showResponsibilities: boolean;
    showImpact: boolean;
    showKeyLearnings: boolean;
    defaultTab: ExperienceTabId;
    heroEyebrow: string;
    heroTitle: string;
    heroHighlight: string;
    heroDescription: string;
    heroPrimaryLabel: string;
    heroPrimaryUrl: string;
    heroSecondaryLabel: string;
    heroSecondaryUrl: string;
    marqueeTitle: string;
    tabIntro: string;
    educationLabel: string;
    educationDescription: string;
    journeyLabel: string;
    journeyDescription: string;
    experienceLabel: string;
    experienceDescription: string;
    archiveEyebrow: string;
    archiveTitle: string;
    archiveDescription: string;
    emptyState: string;
    categories: ExperienceCategory[];
    highlights: Record<ExperienceTabId, ExperienceHighlight>;
};

export const defaultExperienceContent: ExperienceContent = {
    pageEnabled: true,
    showHero: true,
    showDecorations: true,
    showMarquee: true,
    showTabs: true,
    showEducation: true,
    showJourney: true,
    showExperience: true,
    showHighlights: true,
    showSkills: true,
    showResponsibilities: true,
    showImpact: true,
    showKeyLearnings: true,
    defaultTab: 'journey',
    heroEyebrow: 'Professional journey',
    heroTitle: 'Experience built through',
    heroHighlight: 'real work',
    heroDescription: 'A flexible view of education, professional milestones, responsibilities, skills and the work that shaped how I build today.',
    heroPrimaryLabel: 'Explore experience',
    heroPrimaryUrl: '#experience-content',
    heroSecondaryLabel: 'View projects',
    heroSecondaryUrl: '/projects',
    marqueeTitle: 'Partners & Sponsors',
    tabIntro: 'Choose how you want to explore the timeline.',
    educationLabel: 'Education',
    educationDescription: 'Academic foundations, training and learning milestones.',
    journeyLabel: 'Journey',
    journeyDescription: 'A chronological view of roles and professional growth.',
    experienceLabel: 'Experience',
    experienceDescription: 'Filter the archive by the kind of work and responsibility.',
    archiveEyebrow: 'Experience archive',
    archiveTitle: 'Choose a category',
    archiveDescription: 'Filter the experience database without removing or duplicating content.',
    emptyState: 'No records are available in this category yet.',
    categories: [
        { id: 'professional', label: 'Professional Experience', description: 'Employment, contracts, internships and freelance work.', prefix: 'prof-', enabled: true },
        { id: 'leadership', label: 'Leadership & Organizational', description: 'Leadership, community and organizational responsibilities.', prefix: 'lead-', enabled: true },
        { id: 'volunteer', label: 'Volunteer Experience', description: 'Volunteer work and community contributions.', prefix: 'vol-', enabled: true },
        { id: 'certifications', label: 'Certifications & Development', description: 'Development programs, certifications and structured learning.', prefix: 'cert-', enabled: true },
    ],
    highlights: {
        education: {
            title: 'Building the future',
            highlight: 'through knowledge',
            description: 'Learning provides the structure behind better decisions, stronger systems and more deliberate execution.',
            enabled: true,
        },
        journey: {
            title: 'Crafting experiences',
            highlight: 'that matter',
            description: 'Each role adds context, responsibility and a clearer understanding of how useful work gets delivered.',
            enabled: true,
        },
        experience: {
            title: 'Turning ideas',
            highlight: 'into reality',
            description: 'The archive focuses on practical work, measurable contribution and the skills developed along the way.',
            enabled: true,
        },
    },
};

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback: string, max = 600) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function normalizeCategory(value: unknown, fallback: ExperienceCategory): ExperienceCategory {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<ExperienceCategory> : {};
    return {
        id: text(source.id, fallback.id, 60).replace(/[^a-zA-Z0-9_-]/g, '') || fallback.id,
        label: text(source.label, fallback.label, 120),
        description: text(source.description, fallback.description, 240),
        prefix: text(source.prefix, fallback.prefix, 40),
        enabled: bool(source.enabled, fallback.enabled),
    };
}

function normalizeHighlight(value: unknown, fallback: ExperienceHighlight): ExperienceHighlight {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<ExperienceHighlight> : {};
    return {
        title: text(source.title, fallback.title, 120),
        highlight: text(source.highlight, fallback.highlight, 120),
        description: text(source.description, fallback.description, 500),
        enabled: bool(source.enabled, fallback.enabled),
    };
}

export function normalizeExperienceContent(value: unknown): ExperienceContent {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<ExperienceContent> : {};
    const sourceCategories = Array.isArray(source.categories) ? source.categories : [];
    const defaultTab = source.defaultTab === 'education' || source.defaultTab === 'experience' || source.defaultTab === 'journey'
        ? source.defaultTab
        : defaultExperienceContent.defaultTab;
    const savedMarqueeTitle = text(source.marqueeTitle, defaultExperienceContent.marqueeTitle, 120);
    const marqueeTitle = /^selected experience$/i.test(savedMarqueeTitle)
        ? defaultExperienceContent.marqueeTitle
        : savedMarqueeTitle;

    return {
        pageEnabled: bool(source.pageEnabled, defaultExperienceContent.pageEnabled),
        showHero: bool(source.showHero, defaultExperienceContent.showHero),
        showDecorations: bool(source.showDecorations, defaultExperienceContent.showDecorations),
        showMarquee: bool(source.showMarquee, defaultExperienceContent.showMarquee),
        showTabs: bool(source.showTabs, defaultExperienceContent.showTabs),
        showEducation: bool(source.showEducation, defaultExperienceContent.showEducation),
        showJourney: bool(source.showJourney, defaultExperienceContent.showJourney),
        showExperience: bool(source.showExperience, defaultExperienceContent.showExperience),
        showHighlights: bool(source.showHighlights, defaultExperienceContent.showHighlights),
        showSkills: bool(source.showSkills, defaultExperienceContent.showSkills),
        showResponsibilities: bool(source.showResponsibilities, defaultExperienceContent.showResponsibilities),
        showImpact: bool(source.showImpact, defaultExperienceContent.showImpact),
        showKeyLearnings: bool(source.showKeyLearnings, defaultExperienceContent.showKeyLearnings),
        defaultTab,
        heroEyebrow: text(source.heroEyebrow, defaultExperienceContent.heroEyebrow, 120),
        heroTitle: text(source.heroTitle, defaultExperienceContent.heroTitle, 160),
        heroHighlight: text(source.heroHighlight, defaultExperienceContent.heroHighlight, 120),
        heroDescription: text(source.heroDescription, defaultExperienceContent.heroDescription, 600),
        heroPrimaryLabel: text(source.heroPrimaryLabel, defaultExperienceContent.heroPrimaryLabel, 80),
        heroPrimaryUrl: text(source.heroPrimaryUrl, defaultExperienceContent.heroPrimaryUrl, 2048),
        heroSecondaryLabel: text(source.heroSecondaryLabel, defaultExperienceContent.heroSecondaryLabel, 80),
        heroSecondaryUrl: text(source.heroSecondaryUrl, defaultExperienceContent.heroSecondaryUrl, 2048),
        marqueeTitle,
        tabIntro: text(source.tabIntro, defaultExperienceContent.tabIntro, 240),
        educationLabel: text(source.educationLabel, defaultExperienceContent.educationLabel, 80),
        educationDescription: text(source.educationDescription, defaultExperienceContent.educationDescription, 240),
        journeyLabel: text(source.journeyLabel, defaultExperienceContent.journeyLabel, 80),
        journeyDescription: text(source.journeyDescription, defaultExperienceContent.journeyDescription, 240),
        experienceLabel: text(source.experienceLabel, defaultExperienceContent.experienceLabel, 80),
        experienceDescription: text(source.experienceDescription, defaultExperienceContent.experienceDescription, 240),
        archiveEyebrow: text(source.archiveEyebrow, defaultExperienceContent.archiveEyebrow, 100),
        archiveTitle: text(source.archiveTitle, defaultExperienceContent.archiveTitle, 160),
        archiveDescription: text(source.archiveDescription, defaultExperienceContent.archiveDescription, 360),
        emptyState: text(source.emptyState, defaultExperienceContent.emptyState, 240),
        categories: defaultExperienceContent.categories.map((fallback, index) => normalizeCategory(sourceCategories[index], fallback)),
        highlights: {
            education: normalizeHighlight(source.highlights?.education, defaultExperienceContent.highlights.education),
            journey: normalizeHighlight(source.highlights?.journey, defaultExperienceContent.highlights.journey),
            experience: normalizeHighlight(source.highlights?.experience, defaultExperienceContent.highlights.experience),
        },
    };
}
