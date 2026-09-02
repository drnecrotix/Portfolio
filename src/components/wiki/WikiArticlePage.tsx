import Link from 'next/link';
import { BookOpen, Clock3, Hash, LibraryBig } from 'lucide-react';
import type { PublicIdentity } from '@/lib/public-identity';
import { prepareWikiArticleHtml, type WikiArticleContent, wikiCategoryLabel } from '@/lib/wiki-articles';

export type RelatedWikiArticle = {
    slug: string;
    title: string;
    summary: string;
    category: WikiArticleContent['category'];
};

function isExternal(href: string) {
    return /^https?:\/\//i.test(href);
}

function FactValue({ href, value }: { href: string; value: string }) {
    if (!href) return <>{value}</>;
    if (isExternal(href)) return <a href={href} target="_blank" rel="noreferrer" className="transition hover:opacity-65">{value}</a>;
    return <Link href={href} className="transition hover:opacity-65">{value}</Link>;
}

export function WikiArticlePage({
    title,
    content,
    identity,
    updatedAt,
    related,
}: {
    title: string;
    content: WikiArticleContent;
    identity: PublicIdentity;
    updatedAt: Date;
    related: RelatedWikiArticle[];
}) {
    const prepared = prepareWikiArticleHtml(content.bodyHtml);
    const facts = content.infoboxRows.filter((item) => item.enabled);
    const faq = content.faqItems.filter((item) => item.enabled);
    const updatedLabel = updatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <header className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <div className="border-b border-foreground/10 pb-9 sm:pb-12">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground"><BookOpen className="size-3.5" /> Necrotix Wiki · {wikiCategoryLabel(content.category)}</div>
                        <div className="flex items-center gap-2">
                            <Link href="/wiki/articles" className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-[10px] font-semibold text-sky-700 transition hover:border-sky-500/45 hover:bg-sky-500/15 dark:text-sky-300"><LibraryBig className="size-3.5" /> All articles</Link>
                            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><Clock3 className="size-3.5" /> {updatedLabel}</span>
                        </div>
                    </div>
                    <h1 className="mt-7 max-w-5xl text-4xl font-black tracking-[-0.05em] sm:text-6xl lg:text-7xl">{title}</h1>
                    {content.summary ? <p className="mt-5 max-w-3xl text-base leading-7 text-foreground/68 sm:text-lg">{content.summary}</p> : null}
                </div>
            </header>

            <div className="mx-auto mt-8 grid max-w-7xl gap-9 px-5 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)_280px] lg:px-10 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
                <aside className="hidden lg:block">
                    <div className="sticky top-28 space-y-7">
                        <nav className="space-y-1.5 border-l border-foreground/10 pl-4">
                            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Wiki</p>
                            <Link href="/wiki" className="flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium text-foreground/70 transition hover:border-foreground/10 hover:bg-foreground/[0.04] hover:text-foreground"><BookOpen className="size-3.5" /> Main article</Link>
                            <Link href="/wiki/articles" className="flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300"><LibraryBig className="size-3.5" /> All articles</Link>
                        </nav>
                        {prepared.headings.length ? (
                            <nav className="border-l border-foreground/10 pl-4">
                                <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Contents</p>
                                {prepared.headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`block py-1.5 text-xs leading-5 text-muted-foreground transition hover:text-foreground ${heading.level === 3 ? 'pl-3' : ''}`}>{heading.label}</a>)}
                            </nav>
                        ) : null}
                    </div>
                </aside>

                <article className="min-w-0">
                    <div className="mb-6 grid grid-cols-2 gap-2 lg:hidden">
                        <Link href="/wiki" className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.045] px-3 py-2.5 text-xs font-semibold text-foreground/80 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"><BookOpen className="size-4" /> Main article</Link>
                        <Link href="/wiki/articles" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs font-semibold text-sky-700 dark:text-sky-300"><LibraryBig className="size-4" /> All articles</Link>
                    </div>
                    {prepared.headings.length ? (
                        <details className="mb-7 rounded-xl border border-foreground/10 p-4 lg:hidden">
                            <summary className="cursor-pointer list-none font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground [&::-webkit-details-marker]:hidden">Contents</summary>
                            <div className="mt-3 border-t border-foreground/10 pt-3">{prepared.headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`block py-1.5 text-sm text-muted-foreground ${heading.level === 3 ? 'pl-4' : ''}`}>{heading.label}</a>)}</div>
                        </details>
                    ) : null}
                    <div className="prose max-w-none prose-headings:scroll-mt-28 prose-headings:font-black prose-headings:tracking-[-0.03em] prose-p:leading-8 prose-p:text-foreground/78 prose-a:text-sky-400 prose-a:underline-offset-4 prose-strong:text-foreground prose-blockquote:border-foreground/20 prose-blockquote:text-foreground/70 prose-li:text-foreground/75 prose-code:before:content-none prose-code:after:content-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: prepared.html }} />

                    {content.category === 'FAQ' && faq.length ? (
                        <section className="mt-12 border-t border-foreground/10 pt-10">
                            <div className="mb-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><Hash className="size-3.5" /> Frequently asked questions</div>
                            <div className="divide-y divide-foreground/10 border-y border-foreground/10">
                                {faq.map((item) => (
                                    <details key={item.id} className="group py-5">
                                        <summary className="cursor-pointer list-none text-base font-bold tracking-tight [&::-webkit-details-marker]:hidden">{item.question}</summary>
                                        <div className="prose prose-sm mt-4 max-w-none prose-p:text-muted-foreground prose-a:text-sky-400 dark:prose-invert" dangerouslySetInnerHTML={{ __html: item.answer }} />
                                    </details>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {related.length ? (
                        <section className="mt-12 border-t border-foreground/10 pt-10">
                            <h2 className="text-2xl font-black tracking-tight">Related Wiki articles</h2>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {related.map((item) => <Link key={item.slug} href={`/wiki/${item.slug}`} className="rounded-2xl border border-foreground/10 p-4 transition hover:bg-foreground/[0.025]"><span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">{wikiCategoryLabel(item.category)}</span><h3 className="mt-2 font-bold">{item.title}</h3>{item.summary ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary}</p> : null}</Link>)}
                            </div>
                        </section>
                    ) : null}
                </article>

                <aside>
                    {(content.image || facts.length) ? (
                        <div className="sticky top-28 overflow-hidden rounded-[1.4rem] border border-foreground/10 bg-foreground/[0.018]">
                            {content.image ? <div className="border-b border-foreground/10 p-4 text-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={content.image} alt={title} className="mx-auto h-36 w-36 rounded-2xl border border-foreground/10 object-cover" />{content.imageCaption ? <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground">{content.imageCaption}</p> : null}</div> : null}
                            <div className="p-5">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{content.infoboxTitle}</p>
                                <h2 className="mt-2 text-xl font-black tracking-tight">{title}</h2>
                                {facts.length ? <dl className="mt-5 divide-y divide-foreground/10 border-y border-foreground/10">{facts.map((fact) => <div key={fact.id} className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 py-2.5 text-[11px] leading-5"><dt className="text-muted-foreground">{fact.label}</dt><dd className="min-w-0 font-semibold"><FactValue href={fact.href} value={fact.value} /></dd></div>)}</dl> : null}
                                <p className="mt-5 text-[10px] leading-5 text-muted-foreground">Maintained by {identity.name} through Necrotix Wiki.</p>
                            </div>
                        </div>
                    ) : null}
                </aside>
            </div>
        </main>
    );
}
