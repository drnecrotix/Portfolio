import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/LegalDocument';

export const metadata: Metadata = {
    title: 'Cookie Policy - NecrotixLab',
    description: 'Cookie and browser-storage information for necrotixlab.com.',
    alternates: { canonical: '/cookies' },
};

const rows = [
    ['locale', 'Cookie', 'Remembers a language selected by the visitor.', 'Up to 1 year', 'Preference / requested functionality'],
    ['necrotix_experiment_variants', 'Session cookie', 'Keeps the randomly assigned homepage A/B variants stable for the current browser session so repeated refreshes do not move the same session between variants.', 'Browser session', 'First-party measurement'],
    ['necrotix_traffic_session', 'HTTP-only session cookie', 'Random first-party session identifier used to estimate visits and live traffic. The server hashes the cookie value before storing the short-lived session record.', 'Browser session; server session record about 24 hours', 'First-party measurement'],
    ['necrotix_blog_like_id', 'Cookie', 'Pseudonymous identifier created when Blog Like functionality is used, so the site can remember and toggle that interaction.', 'Up to 2 years', 'Functional interaction'],
    ['necrotix_gallery_like_id', 'Cookie', 'Pseudonymous identifier created when Gallery Like functionality is used.', 'Up to 2 years', 'Functional interaction'],
    ['portfolio-private-access', 'Cookie', 'Temporary access token when the site owner enables Private mode and a visitor successfully enters the access password.', 'About 12 hours', 'Strictly necessary'],
    ['Authentication / admin session', 'Cookie', 'Keeps authorised administrators signed in and protects the administration area.', 'Session / configured auth lifetime', 'Strictly necessary'],
    ['sidebar_state', 'Cookie', 'Remembers the administration sidebar state.', 'Up to 7 days', 'Admin preference'],
    ['portfolioLoaded', 'Session storage', 'Prevents the first-visit Niko intro from repeating during the same browser session.', 'Browser session', 'Presentation preference'],
    ['necrotix:blog-view:*', 'Session storage', 'Prevents duplicate Blog view-count requests in the same browser session.', 'Browser session', 'Aggregate engagement'],
    ['necrotix:gallery-view:*', 'Session storage', 'Prevents duplicate Gallery view-count requests in the same browser session.', 'Browser session', 'Aggregate engagement'],
    ['portfolio-chat-messages-v2', 'Session storage', 'Keeps the visible AI assistant conversation in the current browser tab/session.', 'Browser session', 'Requested chat functionality'],
    ['portfolio-theme', 'Local storage', 'Remembers the selected visual theme where supported.', 'Until changed or cleared', 'Preference'],
];

export default function CookiesPage() {
    return (
        <LegalDocument
            eyebrow="Cookies / Storage"
            title="Cookie & browser storage policy."
            summary="NecrotixLab uses a limited set of first-party cookies and browser-storage entries for requested features, preferences, security, short-retention analytics and aggregate engagement."
        >
            <section>
                <h2>1. What cookies and browser storage are</h2>
                <p className="mt-4">Cookies are small values stored by the browser and sent with matching web requests. Local storage and session storage are browser-side storage mechanisms that are not sent automatically with every request, but can still contain identifiers or preferences.</p>
            </section>

            <section>
                <h2>2. Storage used by this site</h2>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-foreground/10">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <thead className="bg-foreground/[0.035] text-xs text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Purpose</th>
                                <th className="px-4 py-3 font-medium">Lifetime</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row[0]} className="border-t border-foreground/10 align-top">
                                    {row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`px-4 py-4 leading-6 ${index === 0 ? 'font-mono text-xs text-foreground' : 'text-muted-foreground'}`}>{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <h2>3. First-party functional and measurement storage</h2>
                <p className="mt-4">Storage used for requested functionality includes language, theme, authentication, private-site access, Likes and session-level view markers. These entries are separate from advertising and cross-site behavioural tracking.</p>
                <p className="mt-3">NecrotixLab also runs limited first-party A/B tests. A small session cookie stores only the current A/B variant letters so a browser session stays in the same variants across refreshes. Experiment event data is kept as aggregate counters such as exposures, project opens and section visibility rather than as a named visitor profile.</p>
                <p className="mt-3">Short-retention traffic analytics uses a random HTTP-only session cookie to estimate visits and live traffic. The server hashes the random cookie value before storing it. Country headers supplied by the hosting/CDN are preferred; if no supported country header is available, the server may also store the raw client IP address in the same short-lived traffic-session record and use it only to resolve an ISO country code. Raw IP is not copied into the longer-lived aggregate traffic table. Traffic-session rows are intended to expire after about 24 hours of inactivity, while country/device aggregates are intended to expire after about 31 days.</p>
                <p className="mt-3">When a browser sends the Do Not Track signal, the public page-view tracker does not submit traffic analytics events.</p>
                <p className="mt-3">The current application code does not intentionally set first-party advertising or cross-site behavioural advertising cookies.</p>
            </section>

            <section>
                <h2>4. External media and third parties</h2>
                <p className="mt-4">Some Gallery works can embed media from YouTube, Vimeo, TikTok, Instagram, Facebook, X/Twitter, Pinterest or Dailymotion. When an external player is loaded, your browser connects directly to that provider. The provider may receive your IP address, browser information and may use its own cookies or browser storage under its privacy and cookie rules.</p>
                <p className="mt-3">External-provider storage is not controlled by NecrotixLab. If you do not want a provider to receive a direct request, do not load or interact with its embedded media and use the provider&apos;s privacy controls where available.</p>
            </section>

            <section>
                <h2>5. Managing storage</h2>
                <p className="mt-4">You can delete cookies, local storage and session storage through your browser settings. Deleting functional or measurement storage can reset language, theme, Like state, view-session markers, A/B assignment, traffic-session state, chat history or private-access state.</p>
                <p className="mt-3">Blocking all cookies may prevent authentication, Private mode and some interactive or measurement features from working correctly.</p>
            </section>

            <section>
                <h2>6. Personal data and your rights</h2>
                <p className="mt-4">A cookie ID, IP address or similar online identifier can be personal data when it can relate to an identifiable person. For more information about purposes, legal bases, retention, recipients and your rights, read the <Link href="/privacy">Privacy & GDPR Policy</Link>.</p>
            </section>
        </LegalDocument>
    );
}
