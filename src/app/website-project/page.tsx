import type { Metadata } from 'next';
import { WebsiteProjectConfigurator } from '@/components/service-requests/WebsiteProjectConfigurator';

export const metadata: Metadata = {
    title: 'Website Project Request | Kreatrics',
    description: 'Configure a website project scope, receive an indicative EUR planning range and create a tracked Kreatrics service request.',
    alternates: { canonical: '/website-project' },
};

export default function WebsiteProjectPage() {
    return <WebsiteProjectConfigurator />;
}
