'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { monitoringRequestState } from '@/modules/service-requests/monitoring';
import { verifyServiceStatusToken } from '@/modules/service-requests/status-access';

function scoreFrom(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const score = Number((value as Record<string, unknown>).score);
    return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : undefined;
}

function isPublicHttpTarget(value: string) {
    try {
        const url = new URL(value);
        return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
    } catch {
        return false;
    }
}

export async function customerServiceAction(formData: FormData) {
    const reference = String(formData.get('reference') ?? '').trim();
    const token = String(formData.get('token') ?? '').trim();
    const action = String(formData.get('action') ?? '').trim();
    if (!/^KT-[A-Z0-9-]{8,40}$/.test(reference) || !token) throw new Error('Invalid service request access.');

    const request = await prisma.serviceRequest.findUnique({ where: { reference } });
    if (!request || !verifyServiceStatusToken(request.reference, request.customerEmail, token)) throw new Error('Invalid service request access.');

    if (action === 'accept_quote') {
        if (request.status !== 'QUOTE_SENT' || !request.finalQuoteCents) throw new Error('There is no active quote to accept.');
        await prisma.serviceRequest.update({ where: { id: request.id }, data: { status: 'ACCEPTED' } });
    } else if (action === 'request_monitoring') {
        if (request.status !== 'COMPLETED') throw new Error('Monitoring can be requested after the service is completed.');
        if (request.source === 'WEBSITE_CREATION' && !isPublicHttpTarget(request.target)) throw new Error('The live website URL must be configured before monitoring can be requested.');
        const cadence = String(formData.get('cadence') ?? '').toLowerCase() === 'weekly' ? 'WEEKLY' : 'MONTHLY';
        const snapshot = request.auditSnapshot;
        const root = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
        const baselineScore = scoreFrom(root.after) ?? request.scanScore ?? undefined;
        await prisma.serviceRequest.update({
            where: { id: request.id },
            data: { auditSnapshot: monitoringRequestState(snapshot, cadence, baselineScore) },
        });
    } else {
        throw new Error('Unsupported service request action.');
    }

    revalidatePath(`/service/${reference}`);
    revalidatePath('/admin/service-requests');
    revalidatePath('/admin/service-monitoring');
}
