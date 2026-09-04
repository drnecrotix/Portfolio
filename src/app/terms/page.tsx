import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { getLegalIdentity } from '@/lib/legal-settings';

export const metadata: Metadata = {
    title: 'Terms of Use - NecrotixLab',
    description: 'Terms of use and Digital Content Policy for necrotixlab.com.',
    alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
    const identity = await getLegalIdentity();

    return (
        <LegalDocument
            eyebrow="Terms / Use"
            title="Terms of use."
            summary="These terms describe the rules for using NecrotixLab, including the Digital Store, digital delivery, comments, AI assistant and external services."
        >
            <section>
                <h2>1. Scope</h2>
                <p className="mt-4">These terms apply to visitors of <a href={identity.siteUrl}>{identity.siteUrl}</a> and to public interactive features made available through the site. By using an interactive feature or starting a Store checkout, you agree to follow the rules that apply to that feature.</p>
            </section>

            <section>
                <h2>2. Site content and intellectual property</h2>
                <p className="mt-4">Unless a work states otherwise, text, photography, artwork, video, branding, design and other original material on the site remain protected by the rights of their respective author or copyright holder. Publication on NecrotixLab does not automatically grant permission to reproduce, redistribute, sell or create derivative commercial works.</p>
                <p className="mt-3">Open-source projects linked from the site are governed by the licence published in the relevant repository or project documentation.</p>
            </section>

            <section>
                <h2>3. Digital Store, delivery and refunds</h2>
                <p className="mt-4">Store products are supplied as digital content and are delivered electronically. Before checkout or immediate download, the customer is asked to accept this Digital Content Policy and request that digital delivery begins immediately.</p>
                <p className="mt-3">For paid digital content that is not supplied on a tangible medium, once delivery or downloading has begun after the customer&apos;s prior express consent and acknowledgement, the statutory withdrawal right may no longer apply. NecrotixLab therefore does not offer discretionary refunds for digital products after protected access or downloading has begun.</p>
                <p className="mt-3"><strong>This does not remove mandatory consumer rights.</strong> Where applicable law requires a remedy because digital content is faulty, unavailable, materially different from its description or otherwise non-conforming, the customer may still be entitled to correction, replacement, a price reduction, termination or a refund as required by law.</p>
                <p className="mt-3">If you believe a digital product was not delivered correctly or is defective, use the <Link href="/contact">contact page</Link> and include the product name and relevant order information. Do not publish payment credentials or sensitive account information.</p>
            </section>

            <section>
                <h2>4. Comments and user-submitted content</h2>
                <p className="mt-4">When you post a comment, you confirm that you have the right to submit it and that it does not intentionally infringe another person&apos;s rights, disclose private information without permission, contain malware, unlawful content, spam, harassment or impersonation.</p>
                <p className="mt-3">You keep ownership of your comment. By submitting it, you grant the site the limited permission necessary to display, format, moderate and store it as part of the discussion. Comments may be removed or moderated where reasonably necessary.</p>
            </section>

            <section>
                <h2>5. AI assistant</h2>
                <p className="mt-4">The AI assistant is provided for informational navigation of the portfolio. AI-generated responses may be incomplete, delayed or incorrect and should not be treated as professional legal, medical, financial or safety advice.</p>
                <p className="mt-3">Do not submit passwords, access tokens, payment information, confidential business information or sensitive personal data to the assistant. Messages may be processed by the AI provider currently configured by the site. See the <Link href="/privacy">Privacy & GDPR Policy</Link>.</p>
            </section>

            <section>
                <h2>6. External links and embedded services</h2>
                <p className="mt-4">NecrotixLab may link to or embed third-party services. Those services are operated independently and their availability, content, privacy practices and terms are controlled by their respective providers. A link or embed does not imply endorsement of every statement, product or policy on the external service.</p>
            </section>

            <section>
                <h2>7. Availability and changes</h2>
                <p className="mt-4">The site and individual features may be modified, suspended, archived or removed without guaranteeing uninterrupted availability. Reasonable care is taken to keep published information accurate, but no guarantee is made that every page will always be complete, current or error-free.</p>
            </section>

            <section>
                <h2>8. Responsible use</h2>
                <p className="mt-4">You must not deliberately interfere with the site, bypass access controls, overload public endpoints, probe private administration areas, distribute malicious payloads or use automated systems in a way that materially degrades service for other visitors.</p>
            </section>

            <section>
                <h2>9. Privacy</h2>
                <p className="mt-4">Personal-data processing is governed by the <Link href="/privacy">Privacy & GDPR Policy</Link> and browser storage is described in the <Link href="/cookies">Cookie Policy</Link>. Those policies form part of the information provided to visitors when interactive features collect data.</p>
            </section>

            <section>
                <h2>10. Applicable law and contact</h2>
                <p className="mt-4">These terms are intended to operate alongside applicable Bulgarian and European Union law and do not limit rights that cannot legally be waived. Questions about these terms can be sent through the <Link href="/contact">contact page</Link>.</p>
            </section>
        </LegalDocument>
    );
}
