export type ExperimentVariant = 'A' | 'B';
export type ExperimentStatus = 'RUNNING' | 'PAUSED' | 'ENDED';

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
    scope: string;
    status: ExperimentStatus;
    primaryEvent: ExperimentEvent;
    secondaryEvents: readonly ExperimentEvent[];
    minimumSamplePerVariant: number;
    expectedAllocation: Record<ExperimentVariant, number>;
    variants: Record<ExperimentVariant, string>;
};

export const EXPERIMENT_VARIANT_COOKIE = 'necrotix_experiment_variants';
export const EXPERIMENT_SESSION_COOKIE = 'necrotix_experiment_session';
export const EXPERIMENT_SESSION_RETENTION_DAYS = 31;
export const EXPERIMENT_CONFIDENCE_LEVEL = 0.95;
export const EXPERIMENT_SIGNIFICANCE_THRESHOLD = 0.05;
export const EXPERIMENT_SRM_THRESHOLD = 0.01;

export const experimentEventLabels: Record<ExperimentEvent, string> = {
    exposure: 'Exposed sessions',
    engaged: 'Engaged sessions',
    projects_seen: 'Projects section reached',
    project_open: 'Project opened',
    blog_open: 'Blog post opened',
    gallery_open: 'Gallery opened',
};

export const experimentDefinitions: readonly ExperimentDefinition[] = [
    {
        id: 'niko-loader-duration',
        name: 'Niko intro duration',
        hypothesis: 'A shorter first-visit intro should increase early engagement without losing the visual identity.',
        scope: 'First homepage visit',
        status: 'RUNNING',
        primaryEvent: 'engaged',
        secondaryEvents: ['projects_seen', 'project_open', 'blog_open'],
        minimumSamplePerVariant: 60,
        expectedAllocation: { A: 0.5, B: 0.5 },
        variants: {
            A: 'Current 2.5s intro',
            B: 'Faster 2.0s intro',
        },
    },
    {
        id: 'home-section-order',
        name: 'Homepage section order',
        hypothesis: 'Showing Projects before Journal should increase project discovery on a portfolio-focused visit.',
        scope: 'Homepage sessions where Projects and Journal are both visible',
        status: 'RUNNING',
        primaryEvent: 'project_open',
        secondaryEvents: ['projects_seen', 'blog_open'],
        minimumSamplePerVariant: 80,
        expectedAllocation: { A: 0.5, B: 0.5 },
        variants: {
            A: 'Journal before Projects',
            B: 'Projects before Journal',
        },
    },
    {
        id: 'hero-micro-cta',
        name: 'Hero micro navigation',
        hypothesis: 'Two restrained text links in the hero should improve project discovery without turning the hero into a conventional CTA block.',
        scope: 'Homepage sessions after the hero becomes interactive',
        status: 'RUNNING',
        primaryEvent: 'project_open',
        secondaryEvents: ['projects_seen', 'blog_open'],
        minimumSamplePerVariant: 80,
        expectedAllocation: { A: 0.5, B: 0.5 },
        variants: {
            A: 'Current hero without text CTA',
            B: 'View projects + Explore gallery links',
        },
    },
] as const;

export const experimentIds = new Set<ExperimentId>(experimentDefinitions.map((item) => item.id));
export const experimentEvents = new Set<ExperimentEvent>(Object.keys(experimentEventLabels) as ExperimentEvent[]);

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
