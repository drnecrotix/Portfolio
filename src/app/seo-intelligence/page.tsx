import type { Metadata } from 'next';
import { SeoIntelligenceClient } from '@/components/seo-intelligence/SeoIntelligenceClient';

export const metadata: Metadata = {
    title: 'SEO Intelligence',
    description: 'Native technical SEO, content, keyword, competitor and link analysis without third-party SEO API credits.',
    alternates: { canonical: '/seo-intelligence' },
};

export default function SeoIntelligencePage() {
    return <SeoIntelligenceClient />;
}
