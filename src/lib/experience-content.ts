import { portfolioData } from '@/data/portfolio';
import type { Education, Experience } from '@/types';

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

export type PartnerLogo = {
    id: string;
    name: string;
    src: string;
    href?: string;
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
    educationEntries: Education[];
    journeyEntries: Experience[];
    experienceEntries: Experience[];
    partnerLogos: PartnerLogo[];
};

const legacyPartnerLogos: PartnerLogo[] = [
    ['dbs', 'DBS', '/assets/DBSLogo.webp'],
    ['hmit', 'HMIT', '/assets/HMITlogo.webp'],
    ['humic', 'HUMIC', '/assets/HumicLogo.webp'],
    ['mckinsey', 'McKinsey & Company', '/assets/McKinseylogo.webp'],
    ['telkom-university', 'Telkom University', '/assets/TelkomUniversityLogo.webp'],
    ['aiesec', 'AIESEC', '/assets/aieseclogo.webp'],
    ['aselab', 'ASE Lab', '/assets/aselablogo.webp'],
    ['birulangit', 'BiruLangit', '/assets/birulangitlogo.webp'],
    ['cisometric', 'Cisometric', '/assets/cisometriclogo.webp'],
    ['dicoding', 'Dicoding', '/assets/dicodinglogo.webp'],
    ['dinas-pangan', 'Dinas Pangan dan Pertanian Kota Bandung', '/assets/dinas-pangan-dan-pertanian-kota-bandung.webp'],
    ['flyrank-ai', 'FlyRank AI', '/assets/flyrankailogo.webp'],
    ['iflab', 'Informatics Lab', '/assets/iflablogo.webp'],
    ['idcamp', 'IDCamp', '/assets/indosat-ooredoo-hutchison-digital-camp.webp'],
    ['bei', 'BEI', '/assets/logobei.webp'],
    ['cps', 'Cyber Physical System Laboratory', '/assets/logocps.webp'],
    ['digistar', 'Digistar', '/assets/logodigistar.webp'],
    ['gdsc', 'GDSC', '/assets/logogdsc.webp'],
    ['microsoft', 'Microsoft', '/assets/microsotlogo.webp'],
    ['sman88', 'SMAN 88', '/assets/sman88logo.webp'],
    ['softage', 'SoftAge', '/assets/softagelogo.webp'],
    ['yot', 'Young On Top', '/assets/yotlogo.webp'],
    ['youth-ranger', 'Youth Ranger Indonesia', '/assets/youth-ranger-indonesia.webp'],
].map(([id, name, src]) => ({ id, name, src, enabled: true }));

function cloneEducation(entries: Education[]) {
    return entries.map((item) => ({
        ...item,
        activities: item.activities ? [...item.activities] : undefined,
        achievements: item.achievements ? [...item.achievements] : undefined,
    }));
}

function cloneExperiences(entries: Experience[]) {
    return entries.map((item) => ({
        ...item,
        skills: [...item.skills],
        responsibilities: item.responsibilities ? [...item.responsibilities] : undefined,
        galleryImages: item.galleryImages ? [...item.galleryImages] : undefined,
        externalLink: Array.isArray(item.externalLink) ? [...item.externalLink] : item.externalLink,
        keyLearnings: item.keyLearnings ? [...item.keyLearnings] : undefined,
        impact: item.impact ? [...item.impact] : undefined,
    }));
}

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
    educationEntries: cloneEducation(portfolioData.education),
    journeyEntries: cloneExperiences(portfolioData.experiences),
    experienceEntries: cloneExperiences(portfolioData.experiences),
    partnerLogos: legacyPartnerLogos.map((item) => ({ ...item })),
};

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback: string, max = 600) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function optionalText(value: unknown, max = 1200) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value: unknown, maxItems = 80, maxLength = 500) {
    if (!Array.isArray(value)) return [] as string[];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems);
}

function cleanId(value: unknown, fallback: string) {
    const raw = optionalText(value, 100).replace(/[^a-zA-Z0-9_-]/g, '');
    return raw || fallback;
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

function normalizeEducationEntry(value: unknown, index: number): Education | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Partial<Education>;
    const institution = optionalText(source.institution, 200);
    const degree = optionalText(source.degree, 200);
    if (!institution || !degree) return null;
    const endDate = optionalText(source.endDate, 40);
    const gpa = optionalText(source.gpa, 40);
    const activities = list(source.activities, 60, 300);
    const achievements = list(source.achievements, 60, 300);
    return {
        id: cleanId(source.id, `education-${index + 1}`),
        institution,
        degree,
        major: optionalText(source.major, 200),
        startDate: optionalText(source.startDate, 40),
        ...(endDate ? { endDate } : {}),
        isOngoing: Boolean(source.isOngoing),
        ...(gpa ? { gpa } : {}),
        ...(activities.length ? { activities } : {}),
        ...(achievements.length ? { achievements } : {}),
    };
}

const experienceTypes: Experience['type'][] = ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'volunteer', 'apprenticeship', 'self-employed'];

function normalizeExperienceEntry(value: unknown, index: number): Experience | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Partial<Experience>;
    const company = optionalText(source.company, 200);
    const position = optionalText(source.position, 200);
    if (!company || !position) return null;
    const responsibilities = list(source.responsibilities, 80, 500);
    const skills = list(source.skills, 100, 120);
    const impact = list(source.impact, 80, 500);
    const keyLearnings = list(source.keyLearnings, 80, 500);
    const galleryImages = list(source.galleryImages, 80, 2048);
    const rawExternal = Array.isArray(source.externalLink) ? list(source.externalLink, 20, 2048) : optionalText(source.externalLink, 2048);
    const type = experienceTypes.includes(source.type as Experience['type']) ? source.type as Experience['type'] : 'full-time';
    const endDate = optionalText(source.endDate, 40);
    const location = optionalText(source.location, 240);
    const logo = optionalText(source.logo, 2048);
    const logoBg = optionalText(source.logoBg, 120);
    const link = optionalText(source.link, 2048);
    const description = optionalText(source.description, 4000);

    return {
        id: cleanId(source.id, `experience-${index + 1}`),
        company,
        position,
        description,
        ...(responsibilities.length ? { responsibilities } : {}),
        skills,
        startDate: optionalText(source.startDate, 40),
        ...(endDate ? { endDate } : {}),
        isOngoing: Boolean(source.isOngoing),
        ...(location ? { location } : {}),
        type,
        ...(logo ? { logo } : {}),
        ...(logoBg ? { logoBg } : {}),
        ...(link ? { link } : {}),
        ...(galleryImages.length ? { galleryImages } : {}),
        ...(Array.isArray(rawExternal) ? (rawExternal.length ? { externalLink: rawExternal } : {}) : (rawExternal ? { externalLink: rawExternal } : {})),
        ...(keyLearnings.length ? { keyLearnings } : {}),
        ...(impact.length ? { impact } : {}),
    };
}

function normalizeEducationEntries(value: unknown, fallback: Education[]) {
    if (!Array.isArray(value)) return cloneEducation(fallback);
    return value.map(normalizeEducationEntry).filter((item): item is Education => Boolean(item));
}

function normalizeExperienceEntries(value: unknown, fallback: Experience[]) {
    if (!Array.isArray(value)) return cloneExperiences(fallback);
    return value.map(normalizeExperienceEntry).filter((item): item is Experience => Boolean(item));
}

function normalizePartnerLogos(value: unknown, fallback: PartnerLogo[]) {
    if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
    return value.flatMap((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const source = entry as Partial<PartnerLogo>;
        const src = optionalText(source.src, 2048);
        if (!src) return [];
        const href = optionalText(source.href, 2048);
        return [{
            id: cleanId(source.id, `partner-${index + 1}`),
            name: optionalText(source.name, 180) || `Partner ${index + 1}`,
            src,
            ...(href ? { href } : {}),
            enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
        }];
    });
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
        educationEntries: normalizeEducationEntries(source.educationEntries, defaultExperienceContent.educationEntries),
        journeyEntries: normalizeExperienceEntries(source.journeyEntries, defaultExperienceContent.journeyEntries),
        experienceEntries: normalizeExperienceEntries(source.experienceEntries, defaultExperienceContent.experienceEntries),
        partnerLogos: normalizePartnerLogos(source.partnerLogos, defaultExperienceContent.partnerLogos),
    };
}
