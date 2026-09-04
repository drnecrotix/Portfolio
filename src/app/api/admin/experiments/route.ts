import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { experimentDefinitions, type ExperimentEvent, type ExperimentVariant } from '@/lib/experiments';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.experimentMetric.findMany({
        orderBy: [{ experimentId: 'asc' }, { variant: 'asc' }, { event: 'asc' }],
    });

    const experiments = experimentDefinitions.map((definition) => {
        const variants = (['A', 'B'] as ExperimentVariant[]).map((variant) => {
            const eventCounts: Partial<Record<ExperimentEvent, number>> = {};
            for (const row of rows) {
                if (row.experimentId === definition.id && row.variant === variant) {
                    eventCounts[row.event as ExperimentEvent] = row.count;
                }
            }
            const exposure = eventCounts.exposure ?? 0;
            const primary = eventCounts[definition.primaryEvent] ?? 0;
            return {
                variant,
                label: definition.variants[variant],
                exposure,
                primary,
                conversionRate: exposure > 0 ? primary / exposure : 0,
                events: eventCounts,
            };
        });

        const a = variants[0].conversionRate;
        const b = variants[1].conversionRate;
        const lift = a > 0 ? (b - a) / a : null;

        return {
            ...definition,
            variants,
            lift,
        };
    });

    return NextResponse.json({ experiments, updatedAt: new Date().toISOString() }, {
        headers: { 'cache-control': 'no-store, max-age=0' },
    });
}
