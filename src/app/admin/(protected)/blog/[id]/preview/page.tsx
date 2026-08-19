import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PostBody } from '@/components/blog/PostBody';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Publication preview',
    robots: { index: false, follow: false, nocache: true },
};

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) notFound();
    const content = (post.content ?? {}) as { html?: string; text?: string };

    return (
        <article className="mx-auto max-w-5xl py-8">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/35">Private preview - {post.type.replaceAll('_', ' ')}</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">{post.title}</h1>
            {post.excerpt && <p className="mt-5 max-w-3xl text-lg leading-8 text-white/50">{post.excerpt}</p>}
            <div className="mt-10 border-t border-white/10 pt-10">
                <PostBody type={post.type} content={content} />
            </div>
        </article>
    );
}
