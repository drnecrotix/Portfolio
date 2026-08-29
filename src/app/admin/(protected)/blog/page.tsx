import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAvailablePostLocales } from '@/lib/cms-posts';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
    const posts = await prisma.post.findMany({
        include: {
            postType: { select: { name: true } },
            categoryRef: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Content</p>
                    <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Blog</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Write and manage publications with reusable post types, categories, media, scheduling and revisions.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Link href="/admin/blog/taxonomies" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/10 px-3 py-2.5 text-center text-sm text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground sm:px-4">Types & Categories</Link>
                    <Link href="/admin/blog/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-3 py-2.5 text-center text-sm font-semibold text-background sm:px-4">Add new post</Link>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.015]">
                {posts.map((post) => {
                    const availableLocales = getAvailablePostLocales(post);
                    return (
                        <Link key={post.id} href={`/admin/blog/${post.id}`} className="block border-b border-foreground/10 p-4 transition-colors last:border-b-0 hover:bg-foreground/[0.035] sm:p-5 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5">
                            <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <h3 className="mr-1 min-w-0 break-words text-lg font-semibold sm:text-xl">{post.title}</h3>
                                    <span className="rounded-full border border-foreground/10 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{post.postType?.name ?? post.type.replaceAll('_', ' ')}</span>
                                    {post.categoryRef?.name && <span className="rounded-full border border-sky-500/20 bg-sky-500/[0.06] px-2 py-1 text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-300">{post.categoryRef.name}</span>}
                                    <span className="rounded-full border border-foreground/10 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{post.status}</span>
                                    <span className="ml-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Languages</span>
                                    {(['en', 'bg'] as const).map((locale) => {
                                        const available = availableLocales.includes(locale);
                                        return (
                                            <span
                                                key={locale}
                                                title={available ? `${locale.toUpperCase()} version available` : `${locale.toUpperCase()} translation missing`}
                                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${available
                                                    ? locale === 'bg'
                                                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                                        : 'border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                                                    : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground/45'
                                                    }`}
                                            >
                                                {locale}
                                            </span>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 truncate text-xs text-muted-foreground sm:text-sm">/blog/{post.slug}</p>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground md:mt-0 md:text-right">Updated {post.updatedAt.toLocaleDateString()}</div>
                        </Link>
                    );
                })}
                {posts.length === 0 && <div className="px-5 py-14 text-center text-sm text-muted-foreground">No CMS publications yet.</div>}
            </div>
        </div>
    );
}
