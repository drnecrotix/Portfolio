import type { Metadata } from 'next';
import { WebsiteInspectorClient } from '@/components/website-inspector/WebsiteInspectorClient';

export const metadata: Metadata = {
    title: 'Website Inspector',
    description: 'Run a lightweight public website health check for delivery, security headers, SEO basics, privacy signals and response timing.',
    alternates: { canonical: '/website-inspector' },
};

export default function WebsiteInspectorPage() {
    return <WebsiteInspectorClient />;
}
