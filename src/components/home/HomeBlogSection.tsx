'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { PublicPost } from '@/lib/cms-posts';

type Props = {
    posts: PublicPost[];
};

export function HomeBlogSection({ posts }: Props) {
    const visiblePosts = posts.slice(0, 5);
    if (!visiblePosts.length) return null;

    return (
        <section id="home-blog" className="scroll-mt-24 border-t border-foreground/10 bg-background px-6 py-12 md:px-16 md:py-14 lg:scroll-mt-28 lg:px-24 lg:py-16">
            <div className="mx-auto w-full max-w-[1400px]">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.7 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-6 flex flex-wrap items-center justify-between gap-5 border-b border-foreground/10 pb-6"
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-foreground/70" />
                        <p className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-foreground/80">Journal</p>
                        <span className="rounded-md border border-foreground/10 px-2 py-1 font-mono text-[10px] text-muted-foreground">{visiblePosts.length}</span>
                    </div>
                    <Link href="/blog" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground/65 transition hover:text-foreground">
                        View all posts <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                </motion.div>

                <div className="border-t border-foreground/10">
                    {visiblePosts.map((post, index) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.55 }}
                            transition={{ duration: 0.42, delay: Math.min(index * 0.075, 0.3), ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Link
                                href={`/blog/${post.slug}`}
                                className="group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-4 border-b border-foreground/10 px-1 py-5 transition-colors hover:bg-foreground/[0.025] sm:grid-cols-[48px_160px_minmax(0,1fr)_160px_28px] sm:gap-6 sm:px-4 sm:py-6"
                            >
                                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60 sm:text-xs">{String(index + 1).padStart(2, '0')}</span>

                                <div className="hidden h-24 w-40 overflow-hidden rounded-lg border border-foreground/10 bg-foreground/[0.025] sm:block">
                                    {post.content.featuredImage ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.content.featuredImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                                    ) : null}
                                </div>

                                <div className="min-w-0">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
                                        <span>{post.category}</span>
                                        <span className="text-foreground/15">/</span>
                                        <time dateTime={post.date}>{new Date(post.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                                    </div>
                                    <h3 className="truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">{post.title}</h3>
                                    {post.excerpt ? <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground sm:text-[15px] sm:leading-6">{post.excerpt}</p> : null}
                                </div>

                                <span className="hidden text-right text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">Read publication</span>
                                <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
