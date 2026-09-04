import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRuntimeCreemConfig } from '@/lib/integration-runtime';

export const dynamic = 'force-dynamic';

function validSignature(rawBody: string, signature: string, secret: string) {
    if (!signature || !secret || !/^[0-9a-f]+$/i.test(signature)) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const actualBuffer = Buffer.from(signature.toLowerCase(), 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function text(value: unknown) {
    return String(value ?? '').trim();
}

function cents(value: unknown) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

type CreemWebhookObject = {
    id?: string;
    status?: string;
    request_id?: string;
    metadata?: Record<string, unknown>;
    order?: {
        id?: string;
        amount?: number;
        currency?: string;
        product?: string;
        status?: string;
    };
    transaction?: {
        order?: string;
    };
    product?: {
        id?: string;
        price?: number;
        currency?: string;
    };
    customer?: {
        email?: string;
        name?: string;
    };
};

async function revokeOrder(providerOrderId: string) {
    if (!providerOrderId) return;
    const existing = await prisma.storeOrder.findUnique({ where: { providerOrderId } });
    if (!existing || existing.provider !== 'creem') return;
    await prisma.$transaction([
        prisma.storeOrder.update({ where: { id: existing.id }, data: { status: 'REFUNDED' } }),
        prisma.storeDownloadGrant.updateMany({ where: { orderId: existing.id }, data: { revokedAt: new Date() } }),
    ]);
}

export async function POST(request: Request) {
    const rawBody = await request.text();
    try {
        const config = await getRuntimeCreemConfig();
        const signature = request.headers.get('creem-signature') || '';
        if (!validSignature(rawBody, signature, config.webhookSecret)) {
            return NextResponse.json({ error: 'Invalid signature.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
        }

        const payload = JSON.parse(rawBody) as {
            id?: string;
            eventType?: string;
            object?: CreemWebhookObject;
        };
        const eventName = text(payload.eventType);
        const object = payload.object ?? {};

        if (eventName === 'refund.created' || eventName === 'dispute.created') {
            const providerOrderId = text(object.order?.id || object.transaction?.order);
            await revokeOrder(providerOrderId);
            return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
        }

        if (eventName !== 'checkout.completed') {
            return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
        }

        const metadata = object.metadata ?? {};
        const productId = text(metadata.product_id);
        const sessionToken = text(metadata.checkout_session || object.request_id);
        const providerOrderId = text(object.order?.id);
        if (!productId || !sessionToken || !providerOrderId) throw new Error('Creem checkout metadata is incomplete.');
        if (text(object.status) && text(object.status) !== 'completed') throw new Error('Creem checkout is not completed.');
        if (text(object.order?.status) && text(object.order?.status) !== 'paid') throw new Error('Creem order is not paid.');

        const [product, checkoutSession] = await Promise.all([
            prisma.storeProduct.findUnique({ where: { id: productId } }),
            prisma.storeCheckoutSession.findUnique({ where: { token: sessionToken } }),
        ]);
        if (!product || product.paymentProvider !== 'CREEM' || !checkoutSession || checkoutSession.productId !== product.id) {
            throw new Error('Creem checkout session could not be matched.');
        }
        if (product.creemProductId && text(object.product?.id || object.order?.product) !== product.creemProductId) {
            throw new Error('Creem product does not match the Store product.');
        }

        const email = text(object.customer?.email).toLowerCase();
        if (!email) throw new Error('Creem customer email is missing.');
        const now = new Date();
        const amount = cents(object.order?.amount || object.product?.price || product.priceCents);
        const currency = text(object.order?.currency || object.product?.currency || product.currency).toUpperCase();

        await prisma.$transaction(async (tx) => {
            const order = await tx.storeOrder.upsert({
                where: { providerOrderId },
                create: {
                    provider: 'creem',
                    providerOrderId,
                    email,
                    customerName: text(object.customer?.name) || null,
                    currency: currency || product.currency,
                    subtotalCents: amount,
                    totalCents: amount,
                    status: 'PAID',
                    paidAt: now,
                },
                update: {
                    provider: 'creem',
                    email,
                    customerName: text(object.customer?.name) || null,
                    currency: currency || product.currency,
                    subtotalCents: amount,
                    totalCents: amount,
                    status: 'PAID',
                    paidAt: now,
                },
            });

            const existingItem = await tx.storeOrderItem.findFirst({ where: { orderId: order.id, productId: product.id } });
            if (!existingItem) {
                await tx.storeOrderItem.create({
                    data: {
                        orderId: order.id,
                        productId: product.id,
                        title: product.title,
                        unitPriceCents: product.priceCents,
                    },
                });
            }

            await tx.storeDownloadGrant.upsert({
                where: { orderId_productId: { orderId: order.id, productId: product.id } },
                create: {
                    token: randomBytes(32).toString('base64url'),
                    orderId: order.id,
                    productId: product.id,
                    maxDownloads: product.downloadLimit,
                },
                update: {
                    revokedAt: null,
                    maxDownloads: product.downloadLimit,
                },
            });

            await tx.storeCheckoutSession.update({
                where: { token: sessionToken },
                data: { orderId: order.id, paidAt: now },
            });
        });

        return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[Store] Creem webhook processing failed:', error);
        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
