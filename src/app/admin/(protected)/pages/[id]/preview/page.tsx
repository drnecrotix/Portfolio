import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { pageContentToHtml } from '@/lib/cms-pages';

export default async function PagePreview({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) notFound();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200/70">Protected preview · {page.status}</div>
            <article>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/35">Page preview</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
                <div className="prose prose-lg prose-invert mt-12 max-w-none" dangerouslySetInnerHTML={{ __html: pageContentToHtml(page.content) }} />
            </article>
        </div>
    );
}
