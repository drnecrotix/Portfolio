export type HealthStatus = 'pass' | 'warning' | 'fail' | 'info';

export type HealthCheck = {
    id: string;
    label: string;
    status: HealthStatus;
    summary: string;
    recommendation?: string;
};

export type EmailDomainReport = {
    domain: string;
    checkedAt: string;
    score: number;
    checks: HealthCheck[];
    records: {
        mx: string[];
        spf?: string;
        dmarc?: string;
        dkim?: string;
        mtaSts?: string;
        tlsRpt?: string;
        bimi?: string;
        caaCount: number;
    };
};

export type AccessibilityReport = {
    requestedUrl: string;
    finalUrl: string;
    checkedAt: string;
    statusCode: number;
    responseTimeMs: number;
    score: number;
    checks: HealthCheck[];
    stats: {
        images: number;
        missingAlt: number;
        controls: number;
        unlabeledControls: number;
        headings: number;
        duplicateIds: number;
    };
};

export type SiteCrawlPage = {
    url: string;
    statusCode: number;
    title?: string;
    linksFound: number;
    redirects: number;
    error?: string;
};

export type SiteCrawlReport = {
    requestedUrl: string;
    origin: string;
    checkedAt: string;
    score: number;
    checks: HealthCheck[];
    pages: SiteCrawlPage[];
    brokenLinks: Array<{ url: string; source?: string; statusCode: number; error?: string }>;
    redirects: Array<{ from: string; statusCode: number; to: string }>;
};
