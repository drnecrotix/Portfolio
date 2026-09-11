import { domainToASCII } from 'node:url';

export function normalizeDomainCandidate(value: string) {
    const raw = String(value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/\.$/, '');
    const domain = domainToASCII(raw);
    if (!domain || domain.length > 253 || !domain.includes('.')) return '';
    const labels = domain.split('.');
    if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return '';
    return domain;
}

export function domainTld(domain: string) {
    return domain.split('.').at(-1)?.toLowerCase() ?? '';
}
