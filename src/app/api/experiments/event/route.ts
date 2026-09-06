import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    EXPERIMENT_SESSION_COOKIE,
    EXPERIMENT_SESSION_RETENTION_DAYS,
    EXPERIMENT_VARIANT_COOKIE,
    experimentEvents,
    experimentIds,
    parseExperimentVariants,
    type ExperimentEvent,
    type ExperimentId,
    type ExperimentVariant,
} from '@/lib/experiments';
import { isLikelyBot } from '@/lib/traffic-analytics';

export const dynamic = 'force-dynamic';

function isSameOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    if (!origin) return true;

    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim() || request.nextUrl.host;
    if (!host) return false;

    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

function hashExperimentSession(value: string) {
    const secret = process.env.AUTH_SECRET || 'necrotix-experiment-session';
    return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

export async function POST(request: NextRequest) {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (request.headers.get('dnt') === '1') return new NextResponse(null, { status: 204 });
    if (isLikelyBot(request.headers.get('user-agent'))) return new NextResponse(null, { status: 204 });

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const experimentId = source.experimentId as ExperimentId;
    const submittedVariant = source.variant as ExperimentVariant;
    const event = source.event as ExperimentEvent;

    if (!experimentIds.has(experimentId) || (submittedVariant !== 'A' && submittedVariant !== 'B') || !experimentEvents.has(event)) {
        return NextResponse.json({ error: 'Invalid experiment event' }, { status: 400 });
    }

    const cookieValue = request.cookies.get(EXPERIMENT_SESSION_COOKIE)?.value || randomUUID();
    const sessionHash = hashExperimentSession(cookieValue);
    const existingExposure = await prisma.experimentSessionEvent.findUnique({
        where: {
            experimentId_sessionHash_event: {
                experimentId,
                sessionHash,
                event: 'exposure',
            },
        },
        select: { variant: true },
    }).catch(() => null);

    const assignedVariants = parseExperimentVariants(request.cookies.get(EXPERIMENT_VARIANT_COOKIE)?.value);
    const cookieVariant = assignedVariants?.[experimentId];
    const effectiveVariant: ExperimentVariant = existingExposure?.variant === 'A' || existingExposure?.variant === 'B'
        ? existingExposure.variant
        : cookieVariant === 'A' || cookieVariant === 'B'
            ? cookieVariant
            : submittedVariant;

    const eventsToRecord: ExperimentEvent[] = event === 'exposure' ? ['exposure'] : ['exposure', event];

    await prisma.$transaction(async (tx) => {
        for (const eventName of eventsToRecord) {
            const inserted = await tx.experimentSessionEvent.createMany({
                data: [{ experimentId, sessionHash, variant: effectiveVariant, event: eventName }],
                skipDuplicates: true,
            });

            if (!inserted.count) continue;

            await tx.experimentMetric.upsert({
                where: {
                    experimentId_variant_event: {
                        experimentId,
                        variant: effectiveVariant,
                        event: eventName,
                    },
                },
                create: { experimentId, variant: effectiveVariant, event: eventName, count: 1 },
                update: { count: { increment: 1 } },
            });
        }
    });

    if (Math.random() < 0.02) {
        const cutoff = new Date(Date.now() - EXPERIMENT_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        void prisma.experimentSessionEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
    }

    const response = new NextResponse(null, { status: 204 });
    if (!request.cookies.get(EXPERIMENT_SESSION_COOKIE)?.value) {
        response.cookies.set(EXPERIMENT_SESSION_COOKIE, cookieValue, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
    }
    return response;
}
