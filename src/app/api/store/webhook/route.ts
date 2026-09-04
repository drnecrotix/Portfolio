import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRuntimeLemonSqueezyConfig } from '@/lib/integration-runtime';

export const dynamic = 'force-dynamic';

function validSignature(rawBody: string, signature: string, secret: string) {
    if (!signature || !secret) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function text(value: unknown) {
    return String(value ?? '').trim();
}

function cents(value: unknown) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export async function POST(request: Request) {
    const rawBody = await request.text();
    try {
        const config = await getRuntimeLemonSqueezyConfig();
        const signature = request.headers.get('x-signature') || '';
        if (!validSignature(rawBody, signature, config.webhookSecret)) {
            return NextResponse.json({ error: 'Invalid signature.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
        }

        const payload = JSON.parse(rawBody) as {
            meta?: { event_name?: string; custom_data?: Record<string, unknown> };
            data?: { id?: string; attributes?: Record<string, unknown> };
        };
        const eventName = text(payload.meta?.event_name);
        const providerOrderId = text(payload.data?.id);
        if (!providerOrderId) return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });

        if (eventName === 'order_refunded') {
            const existing = await prisma.storeOrder.findUnique({ where: { providerOrderId } });
            if (existing && existing.provider === 'lemonsqueezy') {
                await prisma.$transaction([
                    prisma.storeOrder.update({ where: { id: existing.id }, data: { status: 'REFUNDED' } }),
                    prisma.storeDownloadGrant.updateMany({ where: { orderId: existing.id }, data: { revokedAt: new Date() } }),
                ]);
            }
            return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
        }

        if (eventName !== 'order_created') {
            return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
        }

        const custom = payload.meta?.custom_data ?? {};
        const productId = text(custom.product_id);
        const sessionToken = text(custom.checkout_session);
        if (!productId || !sessionToken) throw new Error('Store checkout custom data is missing.');

        const [product, checkoutSession] = await Promise.all([
            prisma.storeProduct.findUnique({ where: { id: productId } }),
            prisma.storeCheckoutSession.findUnique({ where: { token: sessionToken } }),
        ]);
        if (!product || product.paymentProvider !== 'LEMON_SQUEEZY' || !checkoutSession || checkoutSession.productId !== product.id) {
            throw new Error('Store checkout session could not be matched.');
        }

        const attributes = payload.data?.attributes ?? {};
        const email = text(attributes.user_email).toLowerCase();
        if (!email) throw new Error('Order email is missing.');
        const now = new Date();

        await prisma.$transaction(async (tx) => {
            const order = await tx.storeOrder.upsert({
                where: { providerOrderId },
                create: {
                    provider: 'lemonsqueezy',
                    providerOrderId,
                    email,
                    customerName: text(attributes.user_name) || null,
                    currency: text(attributes.currency) || product.currency,
                    subtotalCents: cents(attributes.subtotal),
                    totalCents: cents(attributes.total),
                    status: 'PAID',
                    paidAt: now,
                },
                update: {
                    provider: 'lemonsqueezy',
                    email,
                    customerName: text(attributes.user_name) || null,
                    currency: text(attributes.currency) || product.currency,
                    subtotalCents: cents(attributes.subtotal),
                    totalCents: cents(attributes.total),
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
        console.error('[Store] Webhook processing failed:', error);
        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
