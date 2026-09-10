'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyServiceStatusToken } from '@/modules/service-requests/status-access';

function object(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Prisma.JsonObject) } : {};
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
        const cadence = String(formData.get('cadence') ?? 'monthly') === 'weekly' ? 'weekly' : 'monthly';
        const current = object(request.auditSnapshot);
        await prisma.serviceRequest.update({
            where: { id: request.id },
            data: {
                auditSnapshot: {
                    ...current,
                    monitoring: { requested: true, cadence, requestedAt: new Date().toISOString() },
                } as Prisma.InputJsonValue,
            },
        });
    } else {
        throw new Error('Unsupported service request action.');
    }

    revalidatePath(`/service/${reference}`);
    revalidatePath('/admin/service-requests');
}
