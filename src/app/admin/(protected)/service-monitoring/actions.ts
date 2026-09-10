'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    runServiceMonitoring,
    updateMonitoringState,
    type ServiceMonitoringCadence,
    type ServiceMonitoringStatus,
} from '@/modules/service-requests/monitoring';

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

function refresh(reference?: string) {
    revalidatePath('/admin/service-monitoring');
    revalidatePath('/admin/service-requests');
    if (reference) revalidatePath(`/service/${reference}`);
}

export async function updateServiceMonitoring(requestId: string, formData: FormData) {
    await requireAdmin();
    const statusValue = String(formData.get('status') ?? 'REQUESTED').toUpperCase();
    const cadenceValue = String(formData.get('cadence') ?? 'MONTHLY').toUpperCase();
    const statuses = new Set<ServiceMonitoringStatus>(['REQUESTED', 'ACTIVE', 'PAUSED', 'CANCELLED']);
    const cadences = new Set<ServiceMonitoringCadence>(['WEEKLY', 'MONTHLY']);
    if (!statuses.has(statusValue as ServiceMonitoringStatus) || !cadences.has(cadenceValue as ServiceMonitoringCadence)) throw new Error('Invalid monitoring settings.');

    const price = Number(formData.get('price') ?? 0);
    const priceCents = Number.isFinite(price) && price >= 0 && price <= 10_000 ? Math.round(price * 100) : undefined;
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { reference: true } });
    if (!request) throw new Error('Service request not found.');

    await updateMonitoringState(requestId, {
        status: statusValue as ServiceMonitoringStatus,
        cadence: cadenceValue as ServiceMonitoringCadence,
        priceCents,
    });
    refresh(request.reference);
}

export async function runServiceMonitoringNow(requestId: string) {
    await requireAdmin();
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { reference: true } });
    if (!request) throw new Error('Service request not found.');
    await runServiceMonitoring(requestId, { force: true });
    refresh(request.reference);
}
