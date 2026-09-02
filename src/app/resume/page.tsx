import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CareerDossierPage } from '@/components/resume/CareerDossierPage';
import { prisma } from '@/lib/prisma';
import { normalizeExperienceContent } from '@/lib/experience-content';
import { entryIsPublic, normalizeJourneyEntryState } from '@/lib/journey-entry-state';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity } from '@/lib/public-identity';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { normalizeResumeSettings, RESUME_CONFIG_SLUG } from '@/lib/resume-settings';

const EXPERIENCE_CONFIG_SLUG = '__experience-config';
const ENTRY_STATE_SLUG = '__journey-entry-state';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Career Dossier | Resume',
    description: 'A live professional dossier covering selected experience, education, capabilities and the downloadable CV.',
    alternates: { canonical: '/resume' },
    robots: { index: true, follow: true },
    openGraph: {
        title: 'Career Dossier | Resume',
        description: 'Selected professional experience, education and capabilities in a live portfolio-native format.',
        url: '/resume',
        type: 'profile',
    },
};

export default async function ResumePage() {
    const [configPage, entryStatePage, settings, wikiPage, resumePage] = await Promise.all([
        prisma.page.findUnique({ where: { slug: EXPERIENCE_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        prisma.page.findUnique({ where: { slug: ENTRY_STATE_SLUG }, select: { content: true } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
        prisma.page.findUnique({ where: { slug: RESUME_CONFIG_SLUG }, select: { content: true } }).catch(() => null),
    ]);

    const resume = normalizeResumeSettings(resumePage?.content);
    if (!resume.enabled) notFound();

    const content = normalizeExperienceContent(configPage?.content);
    const entryState = normalizeJourneyEntryState(entryStatePage?.content);
    const experience = {
        ...content,
        educationEntries: content.educationEntries.filter((item) => entryIsPublic(entryState, 'education', item.id)),
        journeyEntries: content.journeyEntries.filter((item) => entryIsPublic(entryState, 'journey', item.id)),
        experienceEntries: content.experienceEntries.filter((item) => entryIsPublic(entryState, 'experience', item.id)),
    };
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const identity = buildPublicIdentity(settings, homepage.profileImage);
    const wiki = normalizePersonalWikiContent(wikiPage?.content);

    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `${wiki.title || identity.name} - Career Dossier`,
        url: '/resume',
        mainEntity: {
            '@type': 'Person',
            name: wiki.title || identity.name,
            alternateName: wiki.aliases,
            image: wiki.portrait || identity.avatar || undefined,
            sameAs: [identity.githubUrl, identity.linkedinUrl, identity.instagramUrl].filter(Boolean),
        },
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
            <CareerDossierPage identity={identity} wiki={wiki} experience={experience} resume={resume} />
        </>
    );
}
