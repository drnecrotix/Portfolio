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
        <section id="home-blog" className="flex min-h-[100svh] scroll-mt-0 items-center border-t border-foreground/10 bg-background px-6 py-10 md:px-16 md:py-12 lg:px-24">
            <div className="mx-auto w-full max-w-[1400px]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-foreground/70" />
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Journal</p>
                            <span className="rounded-md border border-foreground/10 px-2 py-1 font-mono text-[9px] text-muted-foreground">{posts.length}</span>
                        </div>
                        <p className="mt-1.5 text-xs font-medium text-foreground/75">{title}</p>
                        {subtitle ? <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p> : null}
                    </div>
                    <Link href="/blog" className="group inline-flex items-center gap-2 text-xs font-medium text-foreground/60 transition hover:text-foreground">
                        View all posts <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </div>

                <div className="border-t border-foreground/10">
                    {posts.map((post, index) => (
                        <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 border-b border-foreground/10 px-1 py-3 transition-colors hover:bg-foreground/[0.025] sm:grid-cols-[38px_104px_minmax(0,1fr)_138px_24px] sm:gap-4 sm:px-3 sm:py-4"
                        >
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/55">{String(index + 1).padStart(2, '0')}</span>

                            <div className="hidden h-14 w-24 overflow-hidden rounded-md border border-foreground/10 bg-foreground/[0.025] sm:block">
                                {post.content.featuredImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={post.content.featuredImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                ) : null}
                            </div>

                            <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2 text-[8px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                                    <span>{post.category}</span>
                                    <span className="text-foreground/15">/</span>
                                    <time dateTime={post.date}>{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                                </div>
                                <h3 className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">{post.title}</h3>
                                {post.excerpt ? <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">{post.excerpt}</p> : null}
                            </div>

                            <span className="hidden text-right text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">Read publication</span>
                            <ArrowUpRight className="size-3.5 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
