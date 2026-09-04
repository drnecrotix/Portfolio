import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, FileText, Scale, ShieldCheck } from 'lucide-react';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const metadata: Metadata = {
    title: 'Legal & Privacy - NecrotixLab',
    description: 'Legal, privacy, GDPR and cookie information for necrotixlab.com.',
    alternates: { canonical: '/legal' },
};

const cards = [
    {
        href: '/privacy',
        title: 'Privacy & GDPR',
        description: 'How personal data is collected, used, retained and protected, plus your GDPR rights.',
        Icon: ShieldCheck,
    },
    {
        href: '/cookies',
        title: 'Cookie policy',
        description: 'First-party cookies, browser storage, engagement identifiers and external media.',
        Icon: Cookie,
    },
    {
        href: '/terms',
        title: 'Terms of use',
        description: 'Rules for using the website, comments, AI assistant, external services and site content.',
        Icon: Scale,
    },
];

export default function LegalPage() {
    return (
        <LegalDocument
            eyebrow="Legal / 01"
            title="Legal, privacy and data protection."
            summary="This section explains how necrotixlab.com handles personal data, browser storage, user-submitted content and third-party services."
        >
            <section>
                <h2>GDPR at a glance</h2>
                <p className="mt-4">The General Data Protection Regulation (GDPR) applies when personal data is processed in the context of an EU-based website operator. NecrotixLab provides the notices below so visitors can understand what data is used and why.</p>
                <p className="mt-3">The site does not use a legal page as a substitute for good technical practice. Privacy information is also linked directly from places where data can be submitted, such as the contact and comment forms.</p>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {cards.map(({ href, title, description, Icon }) => (
                    <Link key={href} href={href} className="group rounded-2xl border border-foreground/10 p-5 no-underline transition hover:border-foreground/25 hover:bg-foreground/[0.025]">
                        <Icon className="size-5 text-muted-foreground transition group-hover:text-foreground" />
                        <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                    </Link>
                ))}
            </section>

            <section className="rounded-2xl border border-foreground/10 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <FileText className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div>
                        <h2>Questions or data requests</h2>
                        <p className="mt-3">For access, correction, deletion or another privacy request, use the <Link href="/contact">contact page</Link> and clearly mark the message as a privacy or data-protection request.</p>
                    </div>
                </div>
            </section>
        </LegalDocument>
    );
}
