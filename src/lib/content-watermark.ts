export const CONTENT_WATERMARK_CONFIG_SLUG = '__content-watermark-config';

export type ContentWatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type ContentWatermarkSize = 'small' | 'medium';
export type ContentWatermarkRenderMode = 'css' | 'pixel';

export type ContentWatermarkSettings = {
    enabled: boolean;
    text: string;
    opacity: number;
    position: ContentWatermarkPosition;
    size: ContentWatermarkSize;
    renderMode: ContentWatermarkRenderMode;
};

export const defaultContentWatermarkSettings: ContentWatermarkSettings = {
    enabled: true,
    text: 'NecrotixLab',
    opacity: 0.35,
    position: 'bottom-right',
    size: 'small',
    renderMode: 'pixel',
};

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function bool(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback: string, max = 120) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function opacity(value: unknown, fallback: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(0.8, Math.max(0.12, numeric));
}

export function normalizeContentWatermarkSettings(value: unknown): ContentWatermarkSettings {
    const source = object(value);
    const position = source.position === 'top-left'
        || source.position === 'top-right'
        || source.position === 'bottom-left'
        || source.position === 'bottom-right'
        ? source.position
        : defaultContentWatermarkSettings.position;
    const size = source.size === 'medium' ? 'medium' : 'small';
    const renderMode = source.renderMode === 'css' ? 'css' : 'pixel';

    return {
        enabled: bool(source.enabled, defaultContentWatermarkSettings.enabled),
        text: text(source.text, defaultContentWatermarkSettings.text),
        opacity: opacity(source.opacity, defaultContentWatermarkSettings.opacity),
        position,
        size,
        renderMode,
    };
}
