export type FootprintCategory = 'account' | 'breach' | 'domain' | 'reputation';
export type FindingStatus = 'found' | 'not-found' | 'uncertain' | 'rate-limited' | 'unavailable' | 'error';
export type FindingRisk = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type FootprintFinding = {
    id: string;
    provider: string;
    category: FootprintCategory;
    title: string;
    status: FindingStatus;
    confidence: number;
    risk: FindingRisk;
    summary: string;
    sourceUrl?: string;
    exposedFields?: string[];
    occurredAt?: string;
    remediation: string[];
    relatedProviders?: string[];
    duplicateCount?: number;
};

export type FootprintProviderStatus = {
    id: string;
    label: string;
    status: 'available' | 'not-configured' | 'unsupported' | 'unavailable';
};

export type FootprintScan = {
    queryType: 'email' | 'phone' | 'username';
    query: string;
    checkedAt: string;
    providersChecked: number;
    providersAvailable: number;
    providerStatuses: FootprintProviderStatus[];
    findings: FootprintFinding[];
    riskScore: number;
    notice: string;
};

export type ProviderContext = {
    email?: string;
    phone?: string;
    usernames: string[];
    signal: AbortSignal;
};

export type FootprintProvider = {
    id: string;
    label: string;
    category: FootprintCategory;
    supports: Array<'email' | 'phone' | 'username'>;
    configured(): boolean;
    check(context: ProviderContext): Promise<FootprintFinding[]>;
};
