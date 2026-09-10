import type { Metadata } from 'next';
import { SeoIntelligenceClient } from '@/components/seo-intelligence/SeoIntelligenceClient';

export const metadata: Metadata = {
    title: 'SEO Intelligence',
    description: 'Bulgarian keyword research, live Google SERP checks, organic competitor analysis and backlink signals in NecrotixLab.',
    alternates: { canonical: '/seo-intelligence' },
};

export default function SeoIntelligencePage() {
    return <SeoIntelligenceClient />;
}
