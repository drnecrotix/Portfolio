import { WEBSITE_BUILD_RATE_CARD } from '@/modules/service-requests/estimate';
import { SERVICE_PRICING } from '@/modules/service-requests/pricing';

export const SERVICE_PRICING_CONFIG_SLUG = '__service-pricing-config';
export type PriceRange = { min: number; max: number };
export type WebsiteBuildBase = Partial<Record<keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType, PriceRange>>;
export type ServicePricingOverrides = {
    websiteBuildBase: WebsiteBuildBase;
    oneOff: Record<string, { min: number; max: number | null }>;
    monthly: Record<string, number>;
    supportOneOff: Record<string, PriceRange>;
    supportMonthly: Record<string, number>;
};

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function amount(value: unknown, fallback: number, nullable = false) {
    if (nullable && (value === null || value === '')) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 50000 ? parsed : fallback;
}

function supportRange(price: string): PriceRange {
    const values = price.match(/\d+/g)?.map(Number) ?? [0];
    return { min: values[0], max: values[1] ?? values[0] };
}

export function normalizeServicePricing(value: unknown): ServicePricingOverrides {
    const root = record(value);
    const buildSource = record(root.websiteBuildBase);
    const websiteBuildBase: WebsiteBuildBase = {};
    for (const key of Object.keys(WEBSITE_BUILD_RATE_CARD.baseByType) as (keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType)[]) {
        const row = record(buildSource[key]);
        const defaults = WEBSITE_BUILD_RATE_CARD.baseByType[key];
        const min = amount(row.min, defaults.min) as number;
        const max = amount(row.max, defaults.max) as number;
        websiteBuildBase[key] = max >= min ? { min, max } : defaults;
    }
    const oneOffSource = record(root.oneOff);
    const oneOff = Object.fromEntries(SERVICE_PRICING.oneOff.map((item) => {
        const row = record(oneOffSource[item.id]);
        const min = amount(row.min, item.priceFrom) as number;
        const max = amount(row.max, item.priceTo ?? item.priceFrom, item.priceTo === null);
        return [item.id, { min, max: max === null || max >= min ? max : min }];
    }));
    const monthlySource = record(root.monthly);
    const monthly = Object.fromEntries(SERVICE_PRICING.monthly.map((item) => [item.id, amount(monthlySource[item.id], item.price) as number]));
    const supportSource = record(root.supportOneOff);
    const supportOneOff = Object.fromEntries(SERVICE_PRICING.supportOneOff.map((item) => {
        const defaults = supportRange(item.price);
        const row = record(supportSource[item.id]);
        const min = amount(row.min, defaults.min) as number;
        const max = amount(row.max, defaults.max) as number;
        return [item.id, max >= min ? { min, max } : defaults];
    }));
    const supportMonthlySource = record(root.supportMonthly);
    const supportMonthly = Object.fromEntries(SERVICE_PRICING.supportMonthly.map((item) => [item.id, amount(supportMonthlySource[item.id], item.price) as number]));
    return { websiteBuildBase, oneOff, monthly, supportOneOff, supportMonthly };
}

export function normalizeWebsiteBuildBase(value: unknown): WebsiteBuildBase {
    return normalizeServicePricing(value).websiteBuildBase;
}

export function websiteBuildBaseWithDefaults(overrides: WebsiteBuildBase) {
    return Object.fromEntries(Object.entries(WEBSITE_BUILD_RATE_CARD.baseByType).map(([key, value]) => [key, overrides[key as keyof WebsiteBuildBase] ?? value])) as Record<keyof typeof WEBSITE_BUILD_RATE_CARD.baseByType, PriceRange>;
}
