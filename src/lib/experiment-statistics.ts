import {
    EXPERIMENT_SIGNIFICANCE_THRESHOLD,
    EXPERIMENT_SRM_THRESHOLD,
} from '@/lib/experiments';

export type ConfidenceInterval = readonly [number, number];

export type BinomialComparison = {
    controlRate: number;
    variantRate: number;
    absoluteDelta: number;
    relativeLift: number | null;
    pValue: number | null;
    confidence: number | null;
    controlInterval: ConfidenceInterval;
    variantInterval: ConfidenceInterval;
    differenceInterval: ConfidenceInterval;
    significant: boolean;
};

export type SampleRatioCheck = {
    expectedA: number;
    expectedB: number;
    observedA: number;
    observedB: number;
    shareA: number;
    shareB: number;
    chiSquare: number | null;
    pValue: number | null;
    healthy: boolean;
};

function erf(value: number) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - polynomial * Math.exp(-x * x));
}

function normalCdf(value: number) {
    return 0.5 * (1 + erf(value / Math.sqrt(2)));
}

function twoSidedNormalPValue(z: number) {
    return Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
}

export function wilsonInterval(successes: number, total: number, z = 1.96): ConfidenceInterval {
    if (total <= 0) return [0, 0];
    const p = successes / total;
    const denominator = 1 + (z * z) / total;
    const center = (p + (z * z) / (2 * total)) / denominator;
    const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export function compareBinomialVariants(
    controlSuccesses: number,
    controlTotal: number,
    variantSuccesses: number,
    variantTotal: number,
): BinomialComparison {
    const controlRate = controlTotal > 0 ? controlSuccesses / controlTotal : 0;
    const variantRate = variantTotal > 0 ? variantSuccesses / variantTotal : 0;
    const absoluteDelta = variantRate - controlRate;
    const relativeLift = controlRate > 0 ? absoluteDelta / controlRate : null;
    const controlInterval = wilsonInterval(controlSuccesses, controlTotal);
    const variantInterval = wilsonInterval(variantSuccesses, variantTotal);

    if (controlTotal <= 0 || variantTotal <= 0) {
        return {
            controlRate,
            variantRate,
            absoluteDelta,
            relativeLift,
            pValue: null,
            confidence: null,
            controlInterval,
            variantInterval,
            differenceInterval: [0, 0],
            significant: false,
        };
    }

    const pooled = (controlSuccesses + variantSuccesses) / (controlTotal + variantTotal);
    const pooledVariance = pooled * (1 - pooled) * (1 / controlTotal + 1 / variantTotal);
    const pValue = pooledVariance > 0
        ? twoSidedNormalPValue(absoluteDelta / Math.sqrt(pooledVariance))
        : absoluteDelta === 0 ? 1 : 0;

    const unpooledVariance = (
        controlRate * (1 - controlRate) / controlTotal
        + variantRate * (1 - variantRate) / variantTotal
    );
    const margin = 1.96 * Math.sqrt(Math.max(0, unpooledVariance));
    const differenceInterval: ConfidenceInterval = [
        Math.max(-1, absoluteDelta - margin),
        Math.min(1, absoluteDelta + margin),
    ];

    return {
        controlRate,
        variantRate,
        absoluteDelta,
        relativeLift,
        pValue,
        confidence: 1 - pValue,
        controlInterval,
        variantInterval,
        differenceInterval,
        significant: pValue < EXPERIMENT_SIGNIFICANCE_THRESHOLD,
    };
}

export function sampleRatioMismatch(
    observedA: number,
    observedB: number,
    expectedA = 0.5,
    expectedB = 0.5,
): SampleRatioCheck {
    const total = observedA + observedB;
    const normalizedTotal = expectedA + expectedB;
    const aWeight = normalizedTotal > 0 ? expectedA / normalizedTotal : 0.5;
    const bWeight = normalizedTotal > 0 ? expectedB / normalizedTotal : 0.5;
    const expectedCountA = total * aWeight;
    const expectedCountB = total * bWeight;

    if (total <= 0 || expectedCountA <= 0 || expectedCountB <= 0) {
        return {
            expectedA: aWeight,
            expectedB: bWeight,
            observedA,
            observedB,
            shareA: total ? observedA / total : aWeight,
            shareB: total ? observedB / total : bWeight,
            chiSquare: null,
            pValue: null,
            healthy: true,
        };
    }

    const chiSquare = (
        ((observedA - expectedCountA) ** 2) / expectedCountA
        + ((observedB - expectedCountB) ** 2) / expectedCountB
    );
    // For one degree of freedom, P(ChiSq >= x) = erfc(sqrt(x / 2)).
    const pValue = Math.max(0, Math.min(1, 1 - erf(Math.sqrt(chiSquare / 2))));

    return {
        expectedA: aWeight,
        expectedB: bWeight,
        observedA,
        observedB,
        shareA: observedA / total,
        shareB: observedB / total,
        chiSquare,
        pValue,
        healthy: pValue >= EXPERIMENT_SRM_THRESHOLD,
    };
}

export type ExperimentDecisionState = 'COLLECTING' | 'QUALITY_ISSUE' | 'FAVORS_A' | 'FAVORS_B' | 'INCONCLUSIVE';

export function experimentDecision({
    controlTotal,
    variantTotal,
    minimumSamplePerVariant,
    comparison,
    srm,
}: {
    controlTotal: number;
    variantTotal: number;
    minimumSamplePerVariant: number;
    comparison: BinomialComparison;
    srm: SampleRatioCheck;
}) {
    const minimumArm = Math.min(controlTotal, variantTotal);
    const progress = Math.max(0, Math.min(1, minimumArm / Math.max(1, minimumSamplePerVariant)));

    if (!srm.healthy && controlTotal + variantTotal >= 40) {
        return {
            state: 'QUALITY_ISSUE' as ExperimentDecisionState,
            label: 'Check data quality',
            note: 'The observed A/B split is statistically inconsistent with the configured allocation. Investigate assignment before interpreting the result.',
            progress,
        };
    }

    if (minimumArm < minimumSamplePerVariant) {
        return {
            state: 'COLLECTING' as ExperimentDecisionState,
            label: 'Keep collecting',
            note: `Minimum evaluation sample is ${minimumSamplePerVariant} exposed sessions per variant. Statistical signals before that point are treated as early evidence only.`,
            progress,
        };
    }

    const [differenceLow, differenceHigh] = comparison.differenceInterval;
    if (comparison.significant && differenceLow > 0) {
        return {
            state: 'FAVORS_B' as ExperimentDecisionState,
            label: 'Primary metric favors B',
            note: 'Variant B shows a statistically reliable improvement on the primary metric at the configured 95% confidence level.',
            progress,
        };
    }

    if (comparison.significant && differenceHigh < 0) {
        return {
            state: 'FAVORS_A' as ExperimentDecisionState,
            label: 'Primary metric favors A',
            note: 'Variant B shows a statistically reliable decline on the primary metric, so the control is currently safer on this metric.',
            progress,
        };
    }

    return {
        state: 'INCONCLUSIVE' as ExperimentDecisionState,
        label: 'No clear difference',
        note: 'The minimum sample has been reached, but the confidence interval still includes no effect. Keep running or treat the variants as practically similar.',
        progress,
    };
}
