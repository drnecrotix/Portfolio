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
};

export type FootprintScan = {
    email: string;
    checkedAt: string;
    providersChecked: number;
    providersAvailable: number;
    findings: FootprintFinding[];
    riskScore: number;
    notice: string;
};

export type ProviderContext = {
    email: string;
    usernames: string[];
    signal: AbortSignal;
};

export type FootprintProvider = {
    id: string;
    label: string;
    category: FootprintCategory;
    configured(): boolean;
    check(context: ProviderContext): Promise<FootprintFinding[]>;
};
