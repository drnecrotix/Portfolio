'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PublicPost } from '@/lib/cms-posts';

type Props = {
    posts: PublicPost[];
    title: string;
    subtitle: string;
};

export function HomeBlogSection({ posts, title, subtitle }: Props) {
    if (!posts.length) return null;

    return (
        <section id="home-blog" className="scroll-mt-20 border-t border-black/10 bg-background px-6 py-20 dark:border-white/10 md:px-16 md:py-28 lg:px-24">
            <div className="mx-auto max-w-[1400px]">
                <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 dark:border-white/10 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Journal</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>
                    </div>
                    <Link href="/blog" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground">
                        View all posts <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {posts.map((post) => (
                        <Link key={post.id} href={`/blog/${post.slug}`} className="group flex min-h-64 flex-col overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] transition duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-white/20">
                            {post.content.featuredImage ? (
                                <div className="aspect-[16/9] overflow-hidden bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={post.content.featuredImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                                </div>
                            ) : null}
                            <div className="flex flex-1 flex-col p-6">
                                <div className="mb-4 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                    <span>{post.category}</span>
                                    <time dateTime={post.date}>{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                                </div>
                                <h3 className="text-xl font-semibold leading-tight tracking-tight transition-colors group-hover:text-primary">{post.title}</h3>
                                {post.excerpt ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p> : null}
                                <div className="mt-auto pt-6 text-xs font-medium uppercase tracking-[0.14em] text-foreground/50 transition group-hover:text-foreground">Read publication</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
