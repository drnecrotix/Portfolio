import Link from 'next/link';
import type { ReactNode } from 'react';

const legalLinks = [
    { href: '/legal', label: 'Legal overview' },
    { href: '/privacy', label: 'Privacy & GDPR' },
    { href: '/cookies', label: 'Cookie policy' },
    { href: '/terms', label: 'Terms of use' },
];

type LegalDocumentProps = {
    eyebrow: string;
    title: string;
    summary: string;
    updated?: string;
    children: ReactNode;
};

export function LegalDocument({ eyebrow, title, summary, updated = '4 September 2026', children }: LegalDocumentProps) {
    return (
        <main className="min-h-screen bg-background px-5 pb-24 pt-28 text-foreground sm:px-8 md:pt-36 lg:px-12">
            <div className="mx-auto w-full max-w-6xl">
                <header className="border-b border-foreground/10 pb-10 md:pb-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl md:text-6xl">{title}</h1>
                    <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{summary}</p>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Last updated: {updated}</p>
                </header>

                <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-14">
                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Legal</p>
                        <nav className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start" aria-label="Legal pages">
                            {legalLinks.map((link) => (
                                <Link key={link.href} href={link.href} className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-muted-foreground transition hover:border-foreground/25 hover:text-foreground lg:border-0 lg:px-0 lg:py-1.5">
                                    {link.label}
                                </Link>
                            ))}
                            <Link href="/contact" className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-muted-foreground transition hover:border-foreground/25 hover:text-foreground lg:mt-3 lg:border-0 lg:px-0 lg:py-1.5">Contact</Link>
                        </nav>
                    </aside>

                    <article className="legal-document min-w-0 space-y-10 [&_a]:underline [&_a]:decoration-foreground/25 [&_a]:underline-offset-4 [&_a:hover]:decoration-foreground [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-0.025em] [&_h3]:text-base [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:leading-8 [&_p]:text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:space-y-2 [&_ul]:pl-5">
                        {children}
                    </article>
                </div>
            </div>
        </main>
    );
}
