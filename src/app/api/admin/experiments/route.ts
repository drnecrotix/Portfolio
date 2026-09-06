import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    EXPERIMENT_SESSION_RETENTION_DAYS,
    experimentDefinitions,
    experimentEventLabels,
    type ExperimentEvent,
    type ExperimentVariant,
} from '@/lib/experiments';
import {
    compareBinomialVariants,
    experimentDecision,
    sampleRatioMismatch,
} from '@/lib/experiment-statistics';

export const dynamic = 'force-dynamic';

const variants: ExperimentVariant[] = ['A', 'B'];

function startOfUtcDay(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function evidenceLabel(pValue: number | null, minimumArm: number) {
    if (pValue === null || minimumArm < 20) return 'Not enough data';
    if (pValue < 0.01) return 'Strong evidence';
    if (pValue < 0.05) return 'Statistically significant';
    if (pValue < 0.15) return 'Directional signal';
    return 'No clear difference';
}

export async function GET() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - EXPERIMENT_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.experimentSessionEvent.findMany({
        where: { createdAt: { gte: cutoff } },
        select: {
            experimentId: true,
            variant: true,
            event: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const counts = new Map<string, number>();
    let measurementStartedAt: Date | null = null;
    for (const row of rows) {
        const key = `${row.experimentId}:${row.variant}:${row.event}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!measurementStartedAt || row.createdAt < measurementStartedAt) measurementStartedAt = row.createdAt;
    }

    const count = (experimentId: string, variant: ExperimentVariant, event: ExperimentEvent) => (
        counts.get(`${experimentId}:${variant}:${event}`) || 0
    );

    const trendStart = startOfUtcDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));

    const experiments = experimentDefinitions.map((definition) => {
        const variantRows = variants.map((variant) => {
            const exposure = count(definition.id, variant, 'exposure');
            const primary = count(definition.id, variant, definition.primaryEvent);
            const eventCounts = Object.fromEntries(
                ['exposure', definition.primaryEvent, ...definition.secondaryEvents]
                    .filter((event, index, all) => all.indexOf(event) === index)
                    .map((event) => [event, count(definition.id, variant, event as ExperimentEvent)]),
            );
            return {
                variant,
                label: definition.variants[variant],
                exposure,
                primary,
                conversionRate: exposure > 0 ? primary / exposure : 0,
                events: eventCounts,
            };
        });

        const control = variantRows[0];
        const treatment = variantRows[1];
        const comparison = compareBinomialVariants(
            control.primary,
            control.exposure,
            treatment.primary,
            treatment.exposure,
        );
        const srm = sampleRatioMismatch(
            control.exposure,
            treatment.exposure,
            definition.expectedAllocation.A,
            definition.expectedAllocation.B,
        );
        const decision = experimentDecision({
            controlTotal: control.exposure,
            variantTotal: treatment.exposure,
            minimumSamplePerVariant: definition.minimumSamplePerVariant,
            comparison,
            srm,
        });

        const secondaryMetrics = definition.secondaryEvents.map((event) => {
            const controlSuccesses = count(definition.id, 'A', event);
            const variantSuccesses = count(definition.id, 'B', event);
            const stats = compareBinomialVariants(
                controlSuccesses,
                control.exposure,
                variantSuccesses,
                treatment.exposure,
            );
            return {
                event,
                label: experimentEventLabels[event],
                controlSuccesses,
                variantSuccesses,
                ...stats,
                evidence: evidenceLabel(stats.pValue, Math.min(control.exposure, treatment.exposure)),
            };
        });

        const trend = Array.from({ length: 14 }, (_, index) => {
            const date = new Date(trendStart.getTime() + index * 24 * 60 * 60 * 1000);
            const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
            const dailyRows = rows.filter((row) => (
                row.experimentId === definition.id
                && row.createdAt >= date
                && row.createdAt < next
            ));
            const dailyCount = (variant: ExperimentVariant, event: ExperimentEvent) => dailyRows.filter((row) => row.variant === variant && row.event === event).length;
            return {
                key: date.toISOString().slice(0, 10),
                label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
                exposureA: dailyCount('A', 'exposure'),
                exposureB: dailyCount('B', 'exposure'),
                primaryA: dailyCount('A', definition.primaryEvent),
                primaryB: dailyCount('B', definition.primaryEvent),
            };
        });

        return {
            id: definition.id,
            name: definition.name,
            hypothesis: definition.hypothesis,
            scope: definition.scope,
            status: definition.status,
            primaryEvent: definition.primaryEvent,
            primaryLabel: experimentEventLabels[definition.primaryEvent],
            minimumSamplePerVariant: definition.minimumSamplePerVariant,
            expectedAllocation: definition.expectedAllocation,
            variants: variantRows.map((item) => ({
                ...item,
                interval: item.variant === 'A' ? comparison.controlInterval : comparison.variantInterval,
            })),
            comparison: {
                ...comparison,
                evidence: evidenceLabel(comparison.pValue, Math.min(control.exposure, treatment.exposure)),
            },
            srm,
            decision,
            secondaryMetrics,
            trend,
        };
    });

    const totalExposures = experiments.reduce((sum, experiment) => (
        sum + experiment.variants.reduce((variantSum, variant) => variantSum + variant.exposure, 0)
    ), 0);
    const qualityIssues = experiments.filter((experiment) => experiment.decision.state === 'QUALITY_ISSUE').length;
    const decisionReady = experiments.filter((experiment) => (
        experiment.decision.state === 'FAVORS_A'
        || experiment.decision.state === 'FAVORS_B'
        || experiment.decision.state === 'INCONCLUSIVE'
    )).length;

    return NextResponse.json({
        summary: {
            running: experiments.filter((experiment) => experiment.status === 'RUNNING').length,
            totalExposures,
            decisionReady,
            qualityIssues,
            retentionDays: EXPERIMENT_SESSION_RETENTION_DAYS,
            measurementStartedAt: measurementStartedAt?.toISOString() || null,
        },
        experiments,
        updatedAt: now.toISOString(),
    }, {
        headers: { 'cache-control': 'no-store, max-age=0' },
    });
}
