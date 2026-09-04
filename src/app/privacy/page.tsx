import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { getLegalIdentity } from '@/lib/legal-settings';

export const metadata: Metadata = {
    title: 'Privacy & GDPR - NecrotixLab',
    description: 'Privacy and GDPR information for visitors of necrotixlab.com.',
    alternates: { canonical: '/privacy' },
};

function ContactLine({ email }: { email: string }) {
    return email ? <a href={`mailto:${email}`}>{email}</a> : <Link href="/contact">Contact form</Link>;
}

export default async function PrivacyPage() {
    const identity = await getLegalIdentity();

    return (
        <LegalDocument
            eyebrow="Privacy / GDPR"
            title="Privacy & data protection policy."
            summary="This notice explains what personal data may be processed when you use NecrotixLab, why it is processed, how long it may be kept, who may receive it and what rights you have under the GDPR."
        >
            <section>
                <h2>1. Data controller</h2>
                <p className="mt-4"><strong>{identity.controllerName}</strong>, operator of <strong>{identity.siteName}</strong> at <a href={identity.siteUrl}>{identity.siteUrl}</a>, is responsible for the processing described in this policy.</p>
                <p className="mt-3"><strong>Location:</strong> {identity.location}. <strong>Privacy contact:</strong> <ContactLine email={identity.contactEmail} />.</p>
            </section>

            <section>
                <h2>2. Data the site may process</h2>
                <ul className="mt-4 list-disc">
                    <li><strong>Contact enquiries:</strong> name, email address, reason, subject and message content.</li>
                    <li><strong>Blog comments:</strong> public display name, comment text and an optional private email address.</li>
                    <li><strong>Engagement:</strong> pseudonymous visitor identifiers used to remember Blog and Gallery likes, plus aggregate view counts.</li>
                    <li><strong>Technical and security data:</strong> IP address and request metadata used temporarily for rate limiting, abuse prevention and service security.</li>
                    <li><strong>AI assistant:</strong> the messages you choose to send, the conversation context required to answer them and short-lived technical data used for rate limiting.</li>
                    <li><strong>Preferences and browser storage:</strong> language, theme, first-visit/loading state, session view markers and chat history stored in your browser.</li>
                    <li><strong>Administrative accounts:</strong> account identity and authentication information for authorised site administrators and editors.</li>
                </ul>
            </section>

            <section>
                <h2>3. Purposes and legal bases</h2>
                <div className="mt-5 space-y-6">
                    <div>
                        <h3>Responding to enquiries</h3>
                        <p className="mt-2">Contact-form information is used only to receive, assess and respond to the message. Depending on the enquiry, the legal basis is taking steps at your request before entering into an agreement (Article 6(1)(b) GDPR) or the legitimate interest in handling correspondence and enquiries (Article 6(1)(f)).</p>
                    </div>
                    <div>
                        <h3>Comments and community interaction</h3>
                        <p className="mt-2">Comment data is processed to publish and moderate discussion around publications. The legal basis is the legitimate interest in operating an interactive publication and preventing misuse (Article 6(1)(f)). The optional email address is not displayed publicly.</p>
                    </div>
                    <div>
                        <h3>Likes and aggregate views</h3>
                        <p className="mt-2">Pseudonymous identifiers and session markers are used to provide requested Like functionality, avoid duplicate interactions and maintain aggregate engagement counts. These identifiers are not intended to identify you by name.</p>
                    </div>
                    <div>
                        <h3>AI assistant</h3>
                        <p className="mt-2">Messages are processed to provide the assistant response you requested. The current implementation may route them to the AI provider configured by the site administrator, which can include OpenAI, Groq, Google Gemini or a compatible custom provider. Do not submit passwords, financial information, health information or other sensitive personal data to the assistant.</p>
                    </div>
                    <div>
                        <h3>Security and abuse prevention</h3>
                        <p className="mt-2">Short-lived IP-based rate limits and technical checks protect forms and APIs from automated abuse. The legal basis is the legitimate interest in securing the website and its users (Article 6(1)(f)).</p>
                    </div>
                </div>
            </section>

            <section>
                <h2>4. Recipients and service providers</h2>
                <p className="mt-4">Personal data is not sold. It may be processed by service providers only where necessary to operate the site, including hosting/infrastructure providers, the configured email provider for contact messages and the configured AI provider when you use the assistant.</p>
                <p className="mt-3">Gallery pages may contain media hosted by services such as YouTube, Vimeo, TikTok, Instagram, Facebook, X/Twitter, Pinterest or Dailymotion. External media is treated separately because loading it can disclose technical information such as your IP address and browser details to that provider. See the <Link href="/cookies">Cookie Policy</Link>.</p>
            </section>

            <section>
                <h2>5. International transfers</h2>
                <p className="mt-4">Some infrastructure, email, AI or embedded-media providers may process data outside the European Economic Area. Where GDPR requires a transfer mechanism, the relevant provider/controller arrangement should use an applicable safeguard such as an adequacy decision or standard contractual clauses. Provider-specific terms and privacy notices also apply to their independent processing.</p>
            </section>

            <section>
                <h2>6. Retention</h2>
                <ul className="mt-4 list-disc">
                    <li>Contact-form submissions are sent by email and are not stored in the website database by the contact API. Correspondence is retained only for as long as reasonably necessary for the enquiry, ongoing relationship, security or legal claims.</li>
                    <li>Contact-form IP rate-limit entries are held in server memory for about 10 minutes.</li>
                    <li>AI rate-limit entries are short-lived, about one minute. The site does not persist submitted assistant messages in its database in the current implementation; the browser keeps the visible chat history for the current session.</li>
                    <li>Comments remain until removed by moderation, deletion of the related publication or a valid erasure request, subject to applicable legal exceptions.</li>
                    <li>Like identifiers remain until the Like is removed or the related content is deleted. The corresponding first-party Like cookie currently has a maximum lifetime of two years.</li>
                    <li>Preference and session storage periods are described in the <Link href="/cookies">Cookie Policy</Link>.</li>
                </ul>
            </section>

            <section>
                <h2>7. Your GDPR rights</h2>
                <p className="mt-4">Subject to the conditions in the GDPR, you may request access to your personal data, correction, erasure, restriction of processing, data portability where applicable, and you may object to processing based on legitimate interests. Where processing is based on consent, you may withdraw that consent without affecting processing that was lawful before withdrawal.</p>
                <p className="mt-3">Requests can be submitted through <ContactLine email={identity.contactEmail} />. Enough information may be requested to verify that the data relates to you before a request is fulfilled.</p>
            </section>

            <section>
                <h2>8. Complaints</h2>
                <p className="mt-4">You may lodge a complaint with the Bulgarian Commission for Personal Data Protection (CPDP / КЗЛД) or another competent supervisory authority. CPDP contact information and complaint procedures are available at <a href="https://cpdp.bg/en/" target="_blank" rel="noopener noreferrer">cpdp.bg</a>.</p>
            </section>

            <section>
                <h2>9. Automated decisions and profiling</h2>
                <p className="mt-4">NecrotixLab does not use the website data described here to make decisions about visitors that produce legal or similarly significant effects. The AI assistant generates conversational responses but is not used for automated eligibility, employment, credit or similar decisions.</p>
            </section>

            <section>
                <h2>10. Security and changes</h2>
                <p className="mt-4">Reasonable technical and organisational safeguards are used to reduce unauthorised access, misuse and data loss. No internet service can guarantee absolute security.</p>
                <p className="mt-3">This notice may be updated when site functionality, providers or legal requirements change. The current revision date is shown at the top of the page.</p>
            </section>
        </LegalDocument>
    );
}
