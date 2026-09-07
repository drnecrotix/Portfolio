export type BlogTitleEffect = 'none' | 'fade' | 'slide' | 'gradient' | 'glitch';

export type BlogSettings = {
    eyebrow: string;
    title: string;
    subtitle: string;
    titleEffect: BlogTitleEffect;
    rotatingEnabled: boolean;
    titlePrefix: string;
    rotatingWords: string[];
    titleSuffix: string;
    rotationIntervalMs: number;
};

export const defaultBlogSettings: BlogSettings = {
    eyebrow: 'NecrotixLab Journal',
    title: 'Writing, notes & field logs.',
    subtitle: 'A visual archive of publications, notes, poetry and project logs.',
    titleEffect: 'none',
    rotatingEnabled: false,
    titlePrefix: 'Writing,',
    rotatingWords: ['notes & field logs', 'poetry & field logs', 'thoughts & field logs'],
    titleSuffix: '.',
    rotationIntervalMs: 2600,
};

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback: string, max = 500) {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function boolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
}

const titleEffects = new Set<BlogTitleEffect>(['none', 'fade', 'slide', 'gradient', 'glitch']);

export function normalizeBlogSettings(value: unknown): BlogSettings {
    const source = object(value);
    const effect = typeof source.titleEffect === 'string' && titleEffects.has(source.titleEffect as BlogTitleEffect)
        ? source.titleEffect as BlogTitleEffect
        : defaultBlogSettings.titleEffect;
    const rotatingWords = Array.isArray(source.rotatingWords)
        ? source.rotatingWords
            .slice(0, 8)
            .map((item) => typeof item === 'string' ? item.trim().slice(0, 100) : '')
            .filter(Boolean)
        : defaultBlogSettings.rotatingWords;

    return {
        eyebrow: text(source.eyebrow, defaultBlogSettings.eyebrow, 120),
        title: text(source.title, defaultBlogSettings.title, 180),
        subtitle: text(source.subtitle, defaultBlogSettings.subtitle, 320),
        titleEffect: effect,
        rotatingEnabled: boolean(source.rotatingEnabled, defaultBlogSettings.rotatingEnabled),
        titlePrefix: typeof source.titlePrefix === 'string' ? source.titlePrefix.trim().slice(0, 120) : defaultBlogSettings.titlePrefix,
        rotatingWords: rotatingWords.length ? rotatingWords : defaultBlogSettings.rotatingWords,
        titleSuffix: typeof source.titleSuffix === 'string' ? source.titleSuffix.trim().slice(0, 40) : defaultBlogSettings.titleSuffix,
        rotationIntervalMs: integer(source.rotationIntervalMs, defaultBlogSettings.rotationIntervalMs, 1200, 10000),
    };
}
