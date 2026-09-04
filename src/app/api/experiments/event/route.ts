import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { experimentEvents, experimentIds, type ExperimentEvent, type ExperimentId, type ExperimentVariant } from '@/lib/experiments';

export const dynamic = 'force-dynamic';

function isSameOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    if (!origin) return true;
    try {
        return new URL(origin).host === request.nextUrl.host;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const experimentId = source.experimentId as ExperimentId;
    const variant = source.variant as ExperimentVariant;
    const event = source.event as ExperimentEvent;

    if (!experimentIds.has(experimentId) || (variant !== 'A' && variant !== 'B') || !experimentEvents.has(event)) {
        return NextResponse.json({ error: 'Invalid experiment event' }, { status: 400 });
    }

    await prisma.experimentMetric.upsert({
        where: { experimentId_variant_event: { experimentId, variant, event } },
        create: { experimentId, variant, event, count: 1 },
        update: { count: { increment: 1 } },
    });

    return new NextResponse(null, { status: 204 });
}
