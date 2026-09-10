import type { Metadata } from 'next';
import { EmailDomainSecurityClient } from '@/components/web-health/EmailDomainSecurityClient';

export const metadata: Metadata = {
    title: 'Email Domain Security',
    description: 'Check public MX, SPF, DMARC, DKIM, MTA-STS, TLS-RPT, CAA and BIMI signals for a domain.',
    alternates: { canonical: '/email-domain-security' },
};

export default function EmailDomainSecurityPage() {
    return <EmailDomainSecurityClient />;
}
