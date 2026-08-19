import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { pageContentToHtml } from '@/lib/cms-pages';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== 'PUBLISHED') return {};
    return {
        title: page.seoTitle || page.title,
        description: page.seoDescription || undefined,
    };
}

export default async function CmsPublicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== 'PUBLISHED') notFound();

    return (
        <main className="min-h-screen bg-background text-foreground px-6 pb-24 pt-32 md:px-12 md:pt-40">
            <article className="mx-auto max-w-4xl">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Page</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
                <div
                    className="prose prose-lg dark:prose-invert mt-12 max-w-none prose-headings:tracking-tight prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: pageContentToHtml(page.content) }}
                />
            </article>
        </main>
    );
}
