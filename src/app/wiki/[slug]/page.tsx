import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WikiArticlePage, type RelatedWikiArticle } from '@/components/wiki/WikiArticlePage';
import { prisma } from '@/lib/prisma';
import { normalizeHomepageContent } from '@/lib/homepage-content';
import { buildPublicIdentity } from '@/lib/public-identity';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { internalWikiSlug, normalizeWikiArticleContent, wikiHtmlToText } from '@/lib/wiki-articles';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

async function loadArticle(slug: string) {
    const page = await prisma.page.findUnique({ where: { slug: internalWikiSlug(slug) } }).catch(() => null);
    if (!page || page.status !== 'PUBLISHED') return null;
    const content = normalizeWikiArticleContent(page.content, slug);
    if (!content.slug) return null;
    return { page, content };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const loaded = await loadArticle(slug);
    if (!loaded) return { robots: { index: false, follow: false } };
    const { page, content } = loaded;
    const canonical = `${siteUrl}/wiki/${content.slug}`;
    const description = page.seoDescription || content.summary || wikiHtmlToText(content.bodyHtml).slice(0, 220);
    const title = page.seoTitle || `${page.title} - Necrotix Wiki`;
    return {
        title,
        description,
        alternates: { canonical },
        robots: { index: content.indexable, follow: true },
        openGraph: { type: 'article', url: canonical, title, description, images: content.image ? [{ url: content.image }] : undefined },
        twitter: { card: content.image ? 'summary_large_image' : 'summary', title, description, images: content.image ? [content.image] : undefined },
    };
}

export default async function WikiArticleRoute({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const loaded = await loadArticle(slug);
    if (!loaded) notFound();
    const { page, content } = loaded;

    const [settings, relatedPages] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
        content.relatedSlugs.length
            ? prisma.page.findMany({
                where: { slug: { in: content.relatedSlugs.map(internalWikiSlug) }, status: 'PUBLISHED' },
                select: { title: true, slug: true, content: true },
            }).catch(() => [])
            : Promise.resolve([]),
    ]);
    const homepage = normalizeHomepageContent(settings?.homepageContent);
    const identity = buildPublicIdentity(settings, homepage.profileImage);
    const related: RelatedWikiArticle[] = relatedPages.map((item) => {
        const itemContent = normalizeWikiArticleContent(item.content, item.slug);
        return { slug: itemContent.slug, title: item.title, summary: itemContent.summary, category: itemContent.category };
    }).filter((item) => item.slug);

    const canonical = `${siteUrl}/wiki/${content.slug}`;
    const description = page.seoDescription || content.summary || wikiHtmlToText(content.bodyHtml).slice(0, 220);
    const aboutType = content.category === 'ORGANIZATION' || content.category === 'COMMUNITY'
        ? 'Organization'
        : content.category === 'PROJECT' || content.category === 'CREATIVE_WORK'
            ? 'CreativeWork'
            : content.category === 'PERSON'
                ? 'Person'
                : 'Thing';
    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.title,
        description,
        url: canonical,
        dateModified: page.updatedAt.toISOString(),
        author: { '@type': 'Person', name: identity.name, url: `${siteUrl}/wiki` },
        about: { '@type': aboutType, name: page.title },
        image: content.image || undefined,
    };
    const faqItems = content.category === 'FAQ' ? content.faqItems.filter((item) => item.enabled) : [];
    const faqSchema = faqItems.length ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: wikiHtmlToText(item.answer) },
        })),
    } : null;

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }} />
            {faqSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} /> : null}
            <WikiArticlePage title={page.title} content={content} identity={identity} updatedAt={page.updatedAt} related={related} />
        </>
    );
}
