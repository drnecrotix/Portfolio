export type SeoIntelligenceMode = 'keywords' | 'serp' | 'competitors' | 'backlinks';

export const SEO_LOCATION_CODE_BG = 2100;
export const SEO_LANGUAGE_CODE_BG = 'bg';

export function normalizeSeoTarget(value: string) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const url = new URL(candidate);
        return url.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
        return raw
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .split('/')[0]
            .trim()
            .toLowerCase();
    }
}

export function targetMatchesDomain(target: string, domain: string) {
    const wanted = normalizeSeoTarget(target);
    const candidate = normalizeSeoTarget(domain);
    return Boolean(wanted && candidate && (candidate === wanted || candidate.endsWith(`.${wanted}`)));
}

export function finiteNumber(value: unknown, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
