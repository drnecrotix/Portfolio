import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WikiFaqPage } from '@/components/wiki/WikiFaqPage';
import { prisma } from '@/lib/prisma';
import { getPublicSiteUrl } from '@/lib/social-metadata';
import { normalizeWikiFaqContent, WIKI_FAQ_CONFIG_SLUG } from '@/lib/wiki-faq';
import { wikiHtmlToText } from '@/lib/wiki-articles';

export const dynamic = 'force-dynamic';
const siteUrl = getPublicSiteUrl();

async function loadFaq() {
    const page = await prisma.page.findUnique({ where: { slug: WIKI_FAQ_CONFIG_SLUG }, select: { content: true, seoTitle: true, seoDescription: true, updatedAt: true } }).catch(() => null);
    return { page, content: normalizeWikiFaqContent(page?.content) };
}

export async function generateMetadata(): Promise<Metadata> {
    const { page, content } = await loadFaq();
    if (!content.enabled) return { robots: { index: false, follow: false } };
    const title = page?.seoTitle || `${content.title} - Necrotix Wiki`;
    const description = page?.seoDescription || content.subtitle;
    const canonical = `${siteUrl}/wiki/faq`;
    return {
        title,
        description,
        alternates: { canonical },
        robots: { index: content.indexable, follow: true },
        openGraph: { type: 'website', url: canonical, title, description },
        twitter: { card: 'summary', title, description },
    };
}

export default async function WikiFaqRoute() {
    const { content } = await loadFaq();
    if (!content.enabled) notFound();
    const enabledItems = content.items.filter((item) => item.enabled);
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: content.title,
        description: content.subtitle,
        url: `${siteUrl}/wiki/faq`,
        mainEntity: enabledItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: wikiHtmlToText(item.answer) },
        })),
    };

    return (
        <>
            {enabledItems.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /> : null}
            <WikiFaqPage content={content} />
        </>
    );
}
