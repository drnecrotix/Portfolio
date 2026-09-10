import type { Metadata } from 'next';
import { AccessibilityCheckClient } from '@/components/web-health/AccessibilityCheckClient';

export const metadata: Metadata = {
    title: 'Accessibility Check',
    description: 'Run a lightweight static accessibility review for common HTML and semantic issues.',
    alternates: { canonical: '/accessibility-check' },
};

export default function AccessibilityCheckPage() {
    return <AccessibilityCheckClient />;
}
