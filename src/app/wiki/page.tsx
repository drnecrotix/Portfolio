import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PersonalWikiPage } from '@/components/wiki/PersonalWikiPage';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity } from '@/lib/public-identity';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { normalizePersonalWikiContent, PERSONAL_WIKI_CONFIG_SLUG } from '@/lib/wiki-content';

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
    const description = content.lead.slice(0, 220);
    const canonical = `${siteUrl}/wiki`;

    return {
        title,
        description,
        alternates: { canonical },
        robots: { index: true, follow: true },
        openGraph: { type: 'profile', url: canonical, title, description },
        twitter: { card: 'summary', title, description },
    };
}

export default async function WikiPage() {
    const { page, identity, content } = await loadWiki();
    if (!content.enabled) notFound();

    return <PersonalWikiPage content={content} identity={identity} updatedAt={page?.updatedAt ?? null} />;
}
