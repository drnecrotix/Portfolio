import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';

export const SERVICE_PRICING_CONFIG_SLUG = '__service-pricing-config';
export type WebsiteBuildBase = Partial<Record<keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType, { min: number; max: number }>>;

export function normalizeWebsiteBuildBase(value: unknown): WebsiteBuildBase {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const source = (value as { websiteBuildBase?: unknown }).websiteBuildBase;
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    const result: WebsiteBuildBase = {};
    for (const key of Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType) as (keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType)[]) {
        const row = (source as Record<string, unknown>)[key];
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const min = Number((row as Record<string, unknown>).min);
        const max = Number((row as Record<string, unknown>).max);
        if (Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min && max <= 50000) result[key] = { min, max };
    }
    return result;
}

export function websiteBuildBaseWithDefaults(overrides: WebsiteBuildBase) {
    return Object.fromEntries(Object.entries(WEBSITE_BUILD_RATE_CARD.baseByType).map(([key, value]) => [key, overrides[key as keyof WebsiteBuildBase] ?? value])) as Record<keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType, { min: number; max: number }>;
}
