export type ExperimentVariant = 'A' | 'B';

export type ExperimentId =
    | 'niko-loader-duration'
    | 'home-section-order'
    | 'hero-micro-cta';

export type ExperimentEvent =
    | 'exposure'
    | 'engaged'
    | 'projects_seen'
    | 'project_open'
    | 'blog_open'
    | 'gallery_open';

export type ExperimentVariantMap = Record<ExperimentId, ExperimentVariant>;

export type ExperimentDefinition = {
    id: ExperimentId;
    name: string;
    hypothesis: string;
    primaryEvent: ExperimentEvent;
    variants: Record<ExperimentVariant, string>;
};

export const EXPERIMENT_VARIANT_COOKIE = 'necrotix_experiment_variants';

export const experimentDefinitions: readonly ExperimentDefinition[] = [
    {
        id: 'niko-loader-duration',
        name: 'Niko intro duration',
        hypothesis: 'A shorter first-visit intro should increase early engagement without losing the visual identity.',
        primaryEvent: 'engaged',
        variants: {
            A: 'Current 2.5s intro',
            B: 'Faster 2.0s intro',
        },
    },
    {
        id: 'home-section-order',
        name: 'Homepage section order',
        hypothesis: 'Showing Projects before Journal should increase project discovery on a portfolio-focused visit.',
        primaryEvent: 'project_open',
        variants: {
            A: 'Journal before Projects',
            B: 'Projects before Journal',
        },
    },
    {
        id: 'hero-micro-cta',
        name: 'Hero micro navigation',
        hypothesis: 'Two restrained text links in the hero should improve discovery without turning the hero into a conventional CTA block.',
        primaryEvent: 'project_open',
        variants: {
            A: 'Current hero without text CTA',
            B: 'View projects + Explore gallery links',
        },
    },
] as const;

export const experimentIds = new Set<ExperimentId>(experimentDefinitions.map((item) => item.id));
export const experimentEvents = new Set<ExperimentEvent>(['exposure', 'engaged', 'projects_seen', 'project_open', 'blog_open', 'gallery_open']);

export function getExperimentDefinition(id: ExperimentId) {
    return experimentDefinitions.find((definition) => definition.id === id)!;
}

export function assignHomepageExperimentVariants(): ExperimentVariantMap {
    const pick = (): ExperimentVariant => Math.random() < 0.5 ? 'A' : 'B';
    return {
        'niko-loader-duration': pick(),
        'home-section-order': pick(),
        'hero-micro-cta': pick(),
    };
}

export function serializeExperimentVariants(variants: ExperimentVariantMap) {
    return [
        `n:${variants['niko-loader-duration']}`,
        `o:${variants['home-section-order']}`,
        `h:${variants['hero-micro-cta']}`,
    ].join(',');
}

export function parseExperimentVariants(value: string | null | undefined): ExperimentVariantMap | null {
    if (!value) return null;
    const entries = new Map(value.split(',').map((entry) => entry.split(':', 2) as [string, string]));
    const niko = entries.get('n');
    const order = entries.get('o');
    const hero = entries.get('h');
    if (![niko, order, hero].every((variant) => variant === 'A' || variant === 'B')) return null;
    return {
        'niko-loader-duration': niko as ExperimentVariant,
        'home-section-order': order as ExperimentVariant,
        'hero-micro-cta': hero as ExperimentVariant,
    };
}
