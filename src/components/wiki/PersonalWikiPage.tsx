import Link from 'next/link';
import { BookOpen, HelpCircle, Clock3, ExternalLink, Hash, LibraryBig, Link2 } from 'lucide-react';
import type { PublicIdentity } from '@/lib/public-identity';
import type { PersonalWikiContent, WikiRelatedLink } from '@/lib/wiki-content';

function isExternal(href: string) {
    return /^https?:\/\//i.test(href);
}

function SmartLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    if (isExternal(href)) return <a href={href} target="_blank" rel="noreferrer" className={className}>{children}</a>;
    return <Link href={href} className={className}>{children}</Link>;
}

function RelatedLinkCard({ item }: { item: WikiRelatedLink }) {
    return (
        <SmartLink href={item.href} className="group flex min-h-28 flex-col justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-foreground/[0.035]">
            <div className="flex items-start justify-between gap-3">
                <span className="text-base font-bold tracking-tight">{item.label}</span>
                {isExternal(item.href) ? <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <span className="text-muted-foreground transition group-hover:translate-x-0.5">↗</span>}
            </div>
            {item.note ? <p className="mt-4 text-xs leading-5 text-muted-foreground">{item.note}</p> : null}
        </SmartLink>
    );
}

const richTextClass = 'prose max-w-none prose-headings:font-black prose-headings:tracking-[-0.025em] prose-p:text-foreground/78 prose-p:leading-8 prose-a:text-sky-400 prose-a:underline-offset-4 prose-strong:text-foreground prose-blockquote:border-foreground/20 prose-blockquote:text-foreground/70 prose-li:text-foreground/75 prose-code:before:content-none prose-code:after:content-none dark:prose-invert';

export function PersonalWikiPage({ content, identity, updatedAt }: { content: PersonalWikiContent; identity: PublicIdentity; updatedAt: Date | null }) {
    const sections = content.sections.filter((section) => section.enabled);
    const timeline = content.timeline.filter((entry) => entry.enabled);
    const related = content.relatedLinks.filter((item) => item.enabled);
    const facts = content.infoboxRows.filter((item) => item.enabled);
    const portrait = content.portrait || identity.avatar || '/dr-necrotix-mark.svg';
    const updatedLabel = updatedAt ? updatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Living document';
    const toc = [
        { id: 'introduction', label: 'Introduction' },
        ...sections.map((section) => ({ id: section.id, label: section.title })),
        ...(content.showTimeline && timeline.length ? [{ id: 'chronology', label: content.timelineTitle }] : []),
        ...(content.showRelatedLinks && related.length ? [{ id: 'related', label: content.relatedTitle }] : []),
    ];

    return (
        <main className="min-h-screen bg-background pb-28 pt-28 text-foreground sm:pt-36">
            <header className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <div className="border-b border-foreground/10 pb-10 sm:pb-14">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">{content.eyebrow}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href="/wiki/articles" className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-[10px] font-semibold text-sky-700 transition hover:border-sky-500/45 hover:bg-sky-500/15 dark:text-sky-300"><LibraryBig className="size-3.5" /> Browse Wiki</Link>
                            <Link href="/wiki/faq" className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.035] px-3.5 py-2 text-[10px] font-semibold text-foreground/75 transition hover:border-sky-500/30 hover:bg-sky-500/[0.08] hover:text-sky-700 dark:hover:text-sky-300"><HelpCircle className="size-3.5" /> FAQ</Link>
                            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground"><Clock3 className="size-3.5" /> Updated {updatedLabel}</div>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                        <div>
                            <h1 className="max-w-5xl text-5xl font-black tracking-[-0.055em] sm:text-7xl lg:text-8xl">{content.title || identity.name}</h1>
                            <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-foreground/70 sm:text-lg">{content.subtitle}</p>
                        </div>
                        <div className="border-l border-foreground/10 pl-5">
                            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><BookOpen className="size-3.5" /> Main Wiki article</div>
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">The biography is the root article. Projects, communities, organizations and the dedicated FAQ live in the connected Wiki archive.</p>
                        </div>
                    </div>
                </div>
            </header>

            {content.showContents && toc.length > 1 ? (
                <div className="mx-auto mt-6 max-w-7xl px-5 sm:px-8 lg:hidden">
                    <div className="mb-3 grid grid-cols-3 gap-2">
                        <Link href="/wiki" className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs font-semibold text-sky-700 dark:text-sky-300"><BookOpen className="size-4" /><span className="hidden min-[390px]:inline">Main</span></Link>
                        <Link href="/wiki/articles" className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.045] px-3 py-2.5 text-xs font-semibold text-foreground/80 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"><LibraryBig className="size-4" /><span className="hidden min-[390px]:inline">Articles</span></Link>
                        <Link href="/wiki/faq" className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.045] px-3 py-2.5 text-xs font-semibold text-foreground/80 transition hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"><HelpCircle className="size-4" /> FAQ</Link>
                    </div>
                    <details className="rounded-2xl border border-foreground/10 bg-foreground/[0.018] p-4">
                        <summary className="cursor-pointer list-none font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground [&::-webkit-details-marker]:hidden">Contents</summary>
                        <nav className="mt-4 grid gap-2 border-t border-foreground/10 pt-4">
                            {toc.map((item, index) => <a key={item.id} href={`#${item.id}`} className="flex items-center gap-3 py-1 text-sm text-muted-foreground transition hover:text-foreground"><span className="font-mono text-[9px] opacity-50">{String(index + 1).padStart(2, '0')}</span>{item.label}</a>)}
                        </nav>
                    </details>
                </div>
            ) : null}

            <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)_280px] lg:px-10 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
                <aside className="hidden lg:block">
                    <div className="sticky top-28 space-y-8">
                        <nav className="space-y-1.5 border-l border-foreground/10 pl-4">
                            <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Wiki</p>
                            <Link href="/wiki" className="flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300"><BookOpen className="size-3.5" /> Main article</Link>
                            <Link href="/wiki/articles" className="flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium text-foreground/70 transition hover:border-foreground/10 hover:bg-foreground/[0.04] hover:text-foreground"><LibraryBig className="size-3.5" /> All articles</Link>
                            <Link href="/wiki/faq" className="flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium text-foreground/70 transition hover:border-foreground/10 hover:bg-foreground/[0.04] hover:text-foreground"><HelpCircle className="size-3.5" /> FAQ</Link>
                        </nav>
                        {content.showContents ? (
                            <nav className="border-l border-foreground/10 pl-4">
                                <p className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Contents</p>
                                <div className="space-y-1">
                                    {toc.map((item, index) => <a key={item.id} href={`#${item.id}`} className="group flex items-start gap-2 py-1.5 text-xs leading-5 text-muted-foreground transition hover:text-foreground"><span className="mt-px font-mono text-[8px] opacity-40 group-hover:opacity-70">{String(index + 1).padStart(2, '0')}</span><span>{item.label}</span></a>)}
                                </div>
                            </nav>
                        ) : null}
                    </div>
                </aside>

                <article className="min-w-0">
                    <section id="introduction" className="scroll-mt-28 border-b border-foreground/10 pb-12">
                        <div className="mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><Hash className="size-3.5" /> 01 · Introduction</div>
                        <div className={`${richTextClass} text-[1.04rem] sm:text-lg`} dangerouslySetInnerHTML={{ __html: content.lead }} />
                    </section>

                    {sections.map((section, index) => (
                        <section key={section.id} id={section.id} className="scroll-mt-28 border-b border-foreground/10 py-12">
                            <div className="mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><Hash className="size-3.5" /> {String(index + 2).padStart(2, '0')} · Article</div>
                            <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">{section.title}</h2>
                            <div className={`${richTextClass} mt-7`} dangerouslySetInnerHTML={{ __html: section.body }} />
                        </section>
                    ))}

                    {content.showTimeline && timeline.length ? (
                        <section id="chronology" className="scroll-mt-28 border-b border-foreground/10 py-12">
                            <div className="mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><Clock3 className="size-3.5" /> Chronology</div>
                            <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">{content.timelineTitle}</h2>
                            <div className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">
                                {timeline.map((entry) => (
                                    <div key={entry.id} className="grid gap-3 py-6 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-5">
                                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{entry.period}</div>
                                        <div>
                                            {entry.href ? <SmartLink href={entry.href} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight transition hover:opacity-65">{entry.title}<span aria-hidden="true">↗</span></SmartLink> : <h3 className="text-lg font-bold tracking-tight">{entry.title}</h3>}
                                            {entry.body ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.body}</p> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {content.showRelatedLinks && related.length ? (
                        <section id="related" className="scroll-mt-28 py-12">
                            <div className="mb-5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"><Link2 className="size-3.5" /> Index links</div>
                            <h2 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">{content.relatedTitle}</h2>
                            <div className="mt-8 grid gap-3 sm:grid-cols-2">{related.map((item) => <RelatedLinkCard key={item.id} item={item} />)}</div>
                        </section>
                    ) : null}
                </article>

                <aside>
                    {content.showInfobox ? (
                        <div className="sticky top-28 overflow-hidden rounded-[1.4rem] border border-foreground/10 bg-foreground/[0.018]">
                            <div className="border-b border-foreground/10 p-4 text-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={portrait} alt={content.title || identity.name} className="mx-auto h-52 w-52 rounded-2xl border border-foreground/10 bg-foreground/[0.03] object-cover sm:h-56 sm:w-56 lg:h-52 lg:w-52 xl:h-56 xl:w-56" />
                                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">{content.portraitCaption}</p>
                            </div>
                            <div className="p-5">
                                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{content.infoboxTitle}</p>
                                <h2 className="mt-2 text-xl font-black tracking-[-0.035em]">{content.title || identity.name}</h2>
                                {content.aliases.length ? <div className="mt-3 flex flex-wrap gap-1.5">{content.aliases.map((alias) => <span key={alias} className="rounded-full border border-foreground/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{alias}</span>)}</div> : null}
                                {facts.length ? <dl className="mt-5 divide-y divide-foreground/10 border-y border-foreground/10">{facts.map((fact) => <div key={fact.id} className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 py-2.5 text-[11px] leading-5"><dt className="font-medium text-muted-foreground">{fact.label}</dt><dd className="min-w-0 font-semibold text-foreground/85">{fact.href ? <SmartLink href={fact.href} className="break-words transition hover:opacity-65">{fact.value}</SmartLink> : fact.value}</dd></div>)}</dl> : null}
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {identity.githubUrl ? <a href={identity.githubUrl} target="_blank" rel="noreferrer" className="rounded-full border border-foreground/10 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground">GitHub</a> : null}
                                    {identity.linkedinUrl ? <a href={identity.linkedinUrl} target="_blank" rel="noreferrer" className="rounded-full border border-foreground/10 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground">LinkedIn</a> : null}
                                    {identity.instagramUrl ? <a href={identity.instagramUrl} target="_blank" rel="noreferrer" className="rounded-full border border-foreground/10 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground">Instagram</a> : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </aside>
            </div>

            <footer className="mx-auto mt-12 max-w-7xl px-5 sm:px-8 lg:px-10"><div className="border-t border-foreground/10 pt-6 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{content.footerNote}</div></footer>
        </main>
    );
}
