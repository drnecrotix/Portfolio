import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { inspectWebsite } from '@/modules/website-inspector/inspect';
import { inspectEmailDomain } from '@/modules/web-health/email-domain';
import { crawlSite } from '@/modules/web-health/site-crawl';
import { inspectAccessibility } from '@/modules/web-health/accessibility';
import type { ServiceRequestSource } from './estimate';

export type ServiceMonitoringCadence = 'WEEKLY' | 'MONTHLY';
export type ServiceMonitoringStatus = 'REQUESTED' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type ServiceMonitoringState = {
    requested: true;
    status: ServiceMonitoringStatus;
    cadence: ServiceMonitoringCadence;
    requestedAt: string;
    activatedAt?: string;
    priceCents?: number;
    baselineScore?: number;
    lastScore?: number;
    lastRunAt?: string;
    nextRunAt?: string;
    lastError?: string;
    history?: Array<{ checkedAt: string; score?: number; ok: boolean }>;
    lastSnapshot?: Record<string, unknown>;
};

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function source(value: string): ServiceRequestSource {
    if (value === 'WEBSITE_INSPECTOR' || value === 'EMAIL_DOMAIN_SECURITY' || value === 'SITE_CRAWL' || value === 'ACCESSIBILITY_CHECK' || value === 'WEBSITE_CREATION') return value;
    throw new Error('Unsupported monitoring source.');
}

function scoreFrom(value: unknown) {
    const score = Number(object(value).score);
    return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : undefined;
}

function isoOrUndefined(value: unknown) {
    const text = String(value ?? '').trim();
    if (!text || Number.isNaN(Date.parse(text))) return undefined;
    return new Date(text).toISOString();
}

function cadenceFrom(value: unknown): ServiceMonitoringCadence {
    return String(value ?? '').toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY';
}

function statusFrom(value: unknown): ServiceMonitoringStatus {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'PAUSED' || normalized === 'CANCELLED') return normalized;
    return 'REQUESTED';
}

export function parseMonitoringState(snapshot: unknown): ServiceMonitoringState | null {
    const monitoring = object(object(snapshot).monitoring);
    if (monitoring.requested !== true) return null;

    const history = Array.isArray(monitoring.history)
        ? monitoring.history.slice(-12).map((entry) => {
            const item = object(entry);
            const checkedAt = isoOrUndefined(item.checkedAt);
            if (!checkedAt) return null;
            const itemScore = Number(item.score);
            return {
                checkedAt,
                ...(Number.isFinite(itemScore) ? { score: Math.max(0, Math.min(100, Math.round(itemScore))) } : {}),
                ok: item.ok !== false,
            };
        }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        : [];

    const priceCents = Number(monitoring.priceCents);
    const baselineScore = Number(monitoring.baselineScore);
    const lastScore = Number(monitoring.lastScore);
    const activatedAt = isoOrUndefined(monitoring.activatedAt);
    const lastRunAt = isoOrUndefined(monitoring.lastRunAt);
    const nextRunAt = isoOrUndefined(monitoring.nextRunAt);

    return {
        requested: true,
        status: statusFrom(monitoring.status),
        cadence: cadenceFrom(monitoring.cadence),
        requestedAt: isoOrUndefined(monitoring.requestedAt) ?? new Date().toISOString(),
        ...(activatedAt ? { activatedAt } : {}),
        ...(Number.isFinite(priceCents) && priceCents >= 0 ? { priceCents: Math.round(priceCents) } : {}),
        ...(Number.isFinite(baselineScore) && baselineScore >= 0 && baselineScore <= 100 ? { baselineScore: Math.round(baselineScore) } : {}),
        ...(Number.isFinite(lastScore) && lastScore >= 0 && lastScore <= 100 ? { lastScore: Math.round(lastScore) } : {}),
        ...(lastRunAt ? { lastRunAt } : {}),
        ...(nextRunAt ? { nextRunAt } : {}),
        ...(typeof monitoring.lastError === 'string' && monitoring.lastError.trim() ? { lastError: monitoring.lastError.trim().slice(0, 500) } : {}),
        ...(history.length ? { history } : {}),
        ...(Object.keys(object(monitoring.lastSnapshot)).length ? { lastSnapshot: object(monitoring.lastSnapshot) } : {}),
    };
}

export function nextMonitoringRun(from: Date, cadence: ServiceMonitoringCadence) {
    const next = new Date(from);
    if (cadence === 'WEEKLY') next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
}

export function monitoringRequestState(snapshot: unknown, cadence: ServiceMonitoringCadence, baselineScore?: number) {
    const current = object(snapshot);
    return jsonValue({
        ...current,
        monitoring: {
            requested: true,
            status: 'REQUESTED',
            cadence,
            requestedAt: new Date().toISOString(),
            ...(baselineScore !== undefined ? { baselineScore } : {}),
        },
    });
}

function compactReport(report: unknown) {
    const value = object(report);
    const score = scoreFrom(report);
    const checks = Array.isArray(value.checks)
        ? value.checks.slice(0, 40).map((check) => {
            const item = object(check);
            return {
                id: String(item.id ?? '').slice(0, 100),
                label: String(item.label ?? '').slice(0, 160),
                status: String(item.status ?? '').slice(0, 20),
                summary: String(item.summary ?? '').slice(0, 500),
            };
        })
        : [];
    return {
        ...(score !== undefined ? { score } : {}),
        checkedAt: typeof value.checkedAt === 'string' ? value.checkedAt : new Date().toISOString(),
        checks,
    };
}

async function runAudit(requestSource: string, target: string) {
    const normalized = source(requestSource);
    if (normalized === 'WEBSITE_INSPECTOR' || normalized === 'WEBSITE_CREATION') return inspectWebsite(target);
    if (normalized === 'EMAIL_DOMAIN_SECURITY') return inspectEmailDomain(target);
    if (normalized === 'SITE_CRAWL') return crawlSite(target);
    return inspectAccessibility(target);
}

export async function runServiceMonitoring(requestId: string, options: { force?: boolean } = {}) {
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Service request not found.');
    const snapshot = object(request.auditSnapshot);
    const monitoring = parseMonitoringState(snapshot);
    if (!monitoring) throw new Error('Monitoring has not been requested for this service request.');
    if (!options.force && monitoring.status !== 'ACTIVE') throw new Error('Monitoring is not active.');

    const startedAt = new Date();
    try {
        const report = await runAudit(request.source, request.target);
        const compact = compactReport(report);
        const score = scoreFrom(compact);
        const history = [...(monitoring.history ?? []), { checkedAt: startedAt.toISOString(), ...(score !== undefined ? { score } : {}), ok: true }].slice(-12);
        const nextRunAt = monitoring.status === 'ACTIVE' ? nextMonitoringRun(startedAt, monitoring.cadence).toISOString() : undefined;
        const { lastError: _lastError, ...withoutLastError } = monitoring;
        const nextMonitoring: ServiceMonitoringState = {
            ...withoutLastError,
            ...(monitoring.baselineScore === undefined && score !== undefined ? { baselineScore: score } : {}),
            ...(score !== undefined ? { lastScore: score } : {}),
            lastRunAt: startedAt.toISOString(),
            ...(nextRunAt ? { nextRunAt } : {}),
            history,
            lastSnapshot: compact,
        };
        await prisma.serviceRequest.update({
            where: { id: request.id },
            data: { auditSnapshot: jsonValue({ ...snapshot, monitoring: nextMonitoring }) },
        });
        return { ok: true as const, reference: request.reference, score, nextRunAt };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Monitoring check failed.';
        const history = [...(monitoring.history ?? []), { checkedAt: startedAt.toISOString(), ok: false }].slice(-12);
        const nextRunAt = monitoring.status === 'ACTIVE' ? nextMonitoringRun(startedAt, monitoring.cadence).toISOString() : undefined;
        await prisma.serviceRequest.update({
            where: { id: request.id },
            data: {
                auditSnapshot: jsonValue({
                    ...snapshot,
                    monitoring: {
                        ...monitoring,
                        lastRunAt: startedAt.toISOString(),
                        ...(nextRunAt ? { nextRunAt } : {}),
                        lastError: message.slice(0, 500),
                        history,
                    },
                }),
            },
        });
        return { ok: false as const, reference: request.reference, error: message, nextRunAt };
    }
}

export async function updateMonitoringState(requestId: string, input: { status: ServiceMonitoringStatus; cadence: ServiceMonitoringCadence; priceCents?: number }) {
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('Service request not found.');
    const snapshot = object(request.auditSnapshot);
    const current = parseMonitoringState(snapshot);
    if (!current) throw new Error('Monitoring has not been requested for this service request.');

    const now = new Date();
    const activating = input.status === 'ACTIVE' && current.status !== 'ACTIVE';
    const nextRunAt = input.status === 'ACTIVE'
        ? (activating || !current.nextRunAt ? nextMonitoringRun(now, input.cadence).toISOString() : current.nextRunAt)
        : undefined;
    const monitoring: ServiceMonitoringState = {
        ...current,
        status: input.status,
        cadence: input.cadence,
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
        ...(activating ? { activatedAt: now.toISOString() } : {}),
        ...(nextRunAt ? { nextRunAt } : {}),
    };
    if (!nextRunAt) delete monitoring.nextRunAt;

    await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { auditSnapshot: jsonValue({ ...snapshot, monitoring }) },
    });
    return monitoring;
}

export async function runDueServiceMonitoring(limit = 3) {
    const requests = await prisma.serviceRequest.findMany({
        where: { status: 'COMPLETED', auditSnapshot: { not: Prisma.JsonNull } },
        orderBy: { updatedAt: 'asc' },
        take: 200,
    });
    const now = Date.now();
    const due = requests.filter((request) => {
        const monitoring = parseMonitoringState(request.auditSnapshot);
        return monitoring?.status === 'ACTIVE' && Boolean(monitoring.nextRunAt) && Date.parse(monitoring.nextRunAt!) <= now;
    }).slice(0, Math.max(1, Math.min(5, limit)));

    const results = [];
    for (const request of due) results.push(await runServiceMonitoring(request.id));
    return {
        checked: results.length,
        succeeded: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
        results,
    };
}
