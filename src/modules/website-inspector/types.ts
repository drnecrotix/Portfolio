export type WebsiteInspectorCategory = 'delivery' | 'security' | 'seo' | 'privacy' | 'performance';
export type WebsiteInspectorStatus = 'pass' | 'warning' | 'fail' | 'info';

export type WebsiteInspectorCheck = {
    id: string;
    category: WebsiteInspectorCategory;
    label: string;
    status: WebsiteInspectorStatus;
    summary: string;
};

export type WebsiteInspection = {
    requestedUrl: string;
    finalUrl: string;
    checkedAt: string;
    statusCode: number;
    responseTimeMs: number;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    page: {
        title?: string;
        description?: string;
        canonical?: string;
        language?: string;
        contentType?: string;
        server?: string;
        h1Count: number;
        capturedBytes: number;
        truncated: boolean;
    };
    checks: WebsiteInspectorCheck[];
};
