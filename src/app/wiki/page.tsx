import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PersonalWikiPage } from '@/components/wiki/PersonalWikiPage';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity } from '@/lib/public-identity';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';
import { wikiHtmlToText } from '@/lib/wiki-articles';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

async function loadWiki() {
    const [page, settings] = await Promise.all([
        prisma.page.findUnique({ where: { slug: PERSONAL_WIKI_CONFIG_SLUG } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
    ]);
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const identity = buildPublicIdentity(settings, homepage.profileImage);
    const content = normalizePersonalWikiContent(page?.content);
    return { page, settings, identity, content };
}

export async function generateMetadata(): Promise<Metadata> {
    const { content, identity } = await loadWiki();
    if (!content.enabled) return { robots: { index: false, follow: false } };
    const title = `${content.title || identity.name} - Personal Wiki`;
    const description = wikiHtmlToText(content.lead).slice(0, 220);
    const canonical = `${siteUrl}/wiki`;
    const image = content.portrait || identity.avatar || undefined;
    return {
        title,
        description,
        alternates: { canonical },
        robots: { index: true, follow: true },
        openGraph: { type: 'profile', url: canonical, title, description, images: image ? [{ url: image }] : undefined },
        twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
    };
}

export default async function WikiPage() {
    const { page, identity, content } = await loadWiki();
    if (!content.enabled) notFound();

    const canonical = `${siteUrl}/wiki`;
    const description = wikiHtmlToText(content.lead).slice(0, 300);
    const image = content.portrait || identity.avatar;
    const absoluteImage = image ? (/^https?:\/\//i.test(image) ? image : `${siteUrl}${image.startsWith('/') ? '' : '/'}${image}`) : undefined;
    const sameAs = [identity.githubUrl, identity.linkedinUrl, identity.instagramUrl].filter(Boolean);
    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${canonical}#person`,
        name: content.title || identity.name,
        alternateName: content.aliases,
        url: canonical,
        description,
        image: absoluteImage,
        sameAs,
        nationality: 'Bulgarian',
        knowsAbout: ['software development', 'digital design', 'CNC programming', 'rail transport', 'online communities', 'poetry', 'creative technology'],
    };
    const profileSchema = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${canonical}#profile`,
        url: canonical,
        name: `${content.title || identity.name} - Personal Wiki`,
        description,
        dateModified: page?.updatedAt?.toISOString(),
        mainEntity: { '@id': `${canonical}#person` },
    };

    return <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([personSchema, profileSchema]).replace(/</g, '\\u003c') }} />
        <PersonalWikiPage content={content} identity={identity} updatedAt={page?.updatedAt ?? null} />
    </>;
}
