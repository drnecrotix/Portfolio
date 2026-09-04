import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { getLegalIdentity } from '@/lib/legal-settings';

export const metadata: Metadata = {
    title: 'Terms of Use - NecrotixLab',
    description: 'Terms of use for necrotixlab.com.',
    alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
    const identity = await getLegalIdentity();

    return (
        <LegalDocument
            eyebrow="Terms / Use"
            title="Terms of use."
            summary="These terms describe the basic rules for using NecrotixLab, its publications, Gallery, comments, AI assistant and external links."
        >
            <section>
                <h2>1. Scope</h2>
                <p className="mt-4">These terms apply to visitors of <a href={identity.siteUrl}>{identity.siteUrl}</a> and to public interactive features made available through the site. By using an interactive feature, you agree to follow the rules that apply to that feature.</p>
            </section>

            <section>
                <h2>2. Site content and intellectual property</h2>
                <p className="mt-4">Unless a work states otherwise, text, photography, artwork, video, branding, design and other original material on the site remain protected by the rights of their respective author or copyright holder. Publication on NecrotixLab does not automatically grant permission to reproduce, redistribute, sell or create derivative commercial works.</p>
                <p className="mt-3">Open-source projects linked from the site are governed by the licence published in the relevant repository or project documentation.</p>
            </section>

            <section>
                <h2>3. Comments and user-submitted content</h2>
                <p className="mt-4">When you post a comment, you confirm that you have the right to submit it and that it does not intentionally infringe another person&apos;s rights, disclose private information without permission, contain malware, unlawful content, spam, harassment or impersonation.</p>
                <p className="mt-3">You keep ownership of your comment. By submitting it, you grant the site the limited permission necessary to display, format, moderate and store it as part of the discussion. Comments may be removed or moderated where reasonably necessary.</p>
            </section>

            <section>
                <h2>4. AI assistant</h2>
                <p className="mt-4">The AI assistant is provided for informational navigation of the portfolio. AI-generated responses may be incomplete, delayed or incorrect and should not be treated as professional legal, medical, financial or safety advice.</p>
                <p className="mt-3">Do not submit passwords, access tokens, payment information, confidential business information or sensitive personal data to the assistant. Messages may be processed by the AI provider currently configured by the site. See the <Link href="/privacy">Privacy & GDPR Policy</Link>.</p>
            </section>

            <section>
                <h2>5. External links and embedded services</h2>
                <p className="mt-4">NecrotixLab may link to or embed third-party services. Those services are operated independently and their availability, content, privacy practices and terms are controlled by their respective providers. A link or embed does not imply endorsement of every statement, product or policy on the external service.</p>
            </section>

            <section>
                <h2>6. Availability and changes</h2>
                <p className="mt-4">The site and individual features may be modified, suspended, archived or removed without guaranteeing uninterrupted availability. Reasonable care is taken to keep published information accurate, but no guarantee is made that every page will always be complete, current or error-free.</p>
            </section>

            <section>
                <h2>7. Responsible use</h2>
                <p className="mt-4">You must not deliberately interfere with the site, bypass access controls, overload public endpoints, probe private administration areas, distribute malicious payloads or use automated systems in a way that materially degrades service for other visitors.</p>
            </section>

            <section>
                <h2>8. Privacy</h2>
                <p className="mt-4">Personal-data processing is governed by the <Link href="/privacy">Privacy & GDPR Policy</Link> and browser storage is described in the <Link href="/cookies">Cookie Policy</Link>. Those policies form part of the information provided to visitors when interactive features collect data.</p>
            </section>

            <section>
                <h2>9. Applicable law and contact</h2>
                <p className="mt-4">These terms are intended to operate alongside applicable Bulgarian and European Union law and do not limit rights that cannot legally be waived. Questions about these terms can be sent through the <Link href="/contact">contact page</Link>.</p>
            </section>
        </LegalDocument>
    );
}
