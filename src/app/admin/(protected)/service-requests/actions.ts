'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const statuses = new Set(['NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED', 'REJECTED']);

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role)) throw new Error('Forbidden');
}

export async function updateServiceRequest(id: string, formData: FormData) {
    await requireAdmin();
    const status = String(formData.get('status') ?? 'NEW').trim();
    if (!statuses.has(status)) throw new Error('Invalid service request status.');
    const quote = Number(formData.get('finalQuote') ?? 0);
    const internalNotes = String(formData.get('internalNotes') ?? '').trim().slice(0, 5000);

    await prisma.serviceRequest.update({
        where: { id },
        data: {
            status: status as 'NEW' | 'REVIEWING' | 'QUOTE_SENT' | 'ACCEPTED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'COMPLETED' | 'REJECTED',
            finalQuoteCents: Number.isFinite(quote) && quote > 0 ? Math.round(quote * 100) : null,
            internalNotes: internalNotes || null,
        },
    });
    revalidatePath('/admin/service-requests');
}
