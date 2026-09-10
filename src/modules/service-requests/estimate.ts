export type ServiceRequestSource = 'WEBSITE_INSPECTOR' | 'EMAIL_DOMAIN_SECURITY' | 'SITE_CRAWL' | 'ACCESSIBILITY_CHECK';

export type ServiceRequestIssue = {
    id: string;
    label: string;
    status: 'warning' | 'fail';
    summary: string;
    recommendation?: string;
};

const baseBySource: Record<ServiceRequestSource, number> = {
    WEBSITE_INSPECTOR: 29,
    EMAIL_DOMAIN_SECURITY: 39,
    SITE_CRAWL: 39,
    ACCESSIBILITY_CHECK: 49,
};

export function estimateServiceRange(source: ServiceRequestSource, issues: ServiceRequestIssue[]) {
    const weight = issues.reduce((total, issue) => total + (issue.status === 'fail' ? 2 : 1), 0);
    const base = baseBySource[source];
    const min = Math.min(399, base + Math.max(0, weight - 1) * 10);
    const max = Math.min(599, min + 40 + Math.max(1, weight) * 10);
    return { min, max, currency: 'EUR' as const };
}
