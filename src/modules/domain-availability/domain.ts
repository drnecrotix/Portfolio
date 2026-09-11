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

export function domainSuggestions(domain: string) {
    const normalized = normalizeDomainCandidate(domain);
    if (!normalized) return [];
    const labels = normalized.split('.');
    const tld = labels.pop()!;
    const name = labels.join('.');
    const alternatives = [
        `${name}-studio.${tld}`,
        `${name}-digital.${tld}`,
        `get${name}.${tld}`,
        `${name}.com`,
        `${name}.bg`,
        `${name}.eu`,
    ];
    return [...new Set(alternatives)].filter((candidate) => candidate !== normalized && normalizeDomainCandidate(candidate)).slice(0, 5);
}
