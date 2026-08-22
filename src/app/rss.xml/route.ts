import { prisma } from '@/lib/prisma';
import { defaultSeoDefaults, normalizeSeoDefaults } from '@/lib/seo-settings';

export const dynamic = 'force-dynamic';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function escapeXml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function GET() {
    let seo = defaultSeoDefaults;

    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
        seo = normalizeSeoDefaults(settings?.seoDefaults);
    } catch {
        // Safe defaults keep the endpoint predictable when settings are temporarily unavailable.
    }

    if (!seo.rssEnabled) {
        return new Response('RSS feed is disabled.', { status: 404 });
    }

    const now = new Date();
    const posts = seo.rssAutoUpdate
        ? await prisma.post.findMany({
              where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
              select: { slug: true, title: true, excerpt: true, authorName: true, publishedAt: true, createdAt: true, updatedAt: true },
              orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
              take: seo.rssItemLimit,
          })
        : [];

    const projectLimit = seo.rssIncludeProjects ? seo.rssItemLimit : 0;
    const projects = seo.rssAutoUpdate && projectLimit > 0
        ? await prisma.project.findMany({
              where: { status: { in: ['ONGOING', 'COMPLETED'] } },
              select: { slug: true, title: true, description: true, publishedAt: true, createdAt: true, updatedAt: true },
              orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
              take: projectLimit,
          })
        : [];

    const items = [
        ...posts.map((post) => ({
            title: post.title,
            description: post.excerpt || '',
            url: `${siteUrl}/blog/${post.slug}`,
            date: post.publishedAt ?? post.createdAt,
            updatedAt: post.updatedAt,
            author: post.authorName,
        })),
        ...projects.map((project) => ({
            title: project.title,
            description: project.description,
            url: `${siteUrl}/projects/${project.slug}`,
            date: project.publishedAt ?? project.createdAt,
            updatedAt: project.updatedAt,
            author: seo.authorName,
        })),
    ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, seo.rssItemLimit);

    const lastBuildDate = items[0]?.updatedAt ?? new Date();
    const itemXml = items.map((item) => `
        <item>
            <title>${escapeXml(item.title)}</title>
            <link>${escapeXml(item.url)}</link>
            <guid isPermaLink="true">${escapeXml(item.url)}</guid>
            <description>${escapeXml(item.description)}</description>
            <author>${escapeXml(item.author)}</author>
            <pubDate>${item.date.toUTCString()}</pubDate>
        </item>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${escapeXml(seo.rssTitle)}</title>
        <link>${escapeXml(siteUrl)}</link>
        <description>${escapeXml(seo.rssDescription)}</description>
        <language>${escapeXml(seo.locale.replace('_', '-'))}</language>
        <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
        <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />${itemXml}
    </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': seo.rssAutoUpdate
                ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300'
                : 'public, max-age=3600',
        },
    });
}
