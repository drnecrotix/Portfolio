import type { Metadata } from 'next';
import { SiteCrawlClient } from '@/components/web-health/SiteCrawlClient';

export const metadata: Metadata = {
    title: 'Site Crawl / Broken Links',
    description: 'Run a bounded same-origin crawl to sample broken internal pages, redirects and page-title hygiene.',
    alternates: { canonical: '/site-crawl' },
};

export default function SiteCrawlPage() {
    return <SiteCrawlClient />;
}
