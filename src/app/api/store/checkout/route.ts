import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createCreemCheckout } from '@/lib/creem';
import { createLemonSqueezyCheckout } from '@/lib/lemonsqueezy';
import { canAccessManagedPage, getManagedPageAccessSettings } from '@/lib/page-access';
import { getPublicSiteUrl } from '@/lib/social-metadata';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const [pageAccess, session] = await Promise.all([
            getManagedPageAccessSettings(),
            auth().catch(() => null),
        ]);
        const isAdmin = Boolean(session?.user && ['OWNER', 'ADMIN'].includes(session.user.role));
        if (!canAccessManagedPage(pageAccess, 'store', isAdmin)) {
            return NextResponse.json({ error: 'Store is unavailable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 8_000) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });

        const body = await request.json() as { slug?: string };
        const slug = String(body.slug ?? '').trim().toLowerCase();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            return NextResponse.json({ error: 'Invalid product.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
        }

        const product = await prisma.storeProduct.findUnique({
            where: { slug },
            include: { files: { select: { id: true }, take: 1 } },
        });
        const providerReady = product?.paymentProvider === 'CREEM'
            ? Boolean(product.creemProductId)
            : Boolean(product?.lemonSqueezyVariantId);
        if (!product || product.status !== 'PUBLISHED' || !product.files.length || !providerReady) {
            return NextResponse.json({ error: 'This product is not available for purchase.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
        }

        const sessionToken = randomBytes(24).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await prisma.storeCheckoutSession.create({
            data: { token: sessionToken, productId: product.id, expiresAt },
        });

        try {
            const baseUrl = getPublicSiteUrl().replace(/\/$/, '');
            const redirectUrl = `${baseUrl}/store/thanks?session=${encodeURIComponent(sessionToken)}`;
            const checkoutUrl = product.paymentProvider === 'CREEM'
                ? await createCreemCheckout({
                    creemProductId: product.creemProductId!,
                    productId: product.id,
                    sessionToken,
                    redirectUrl,
                })
                : await createLemonSqueezyCheckout({
                    variantId: product.lemonSqueezyVariantId!,
                    productId: product.id,
                    sessionToken,
                    redirectUrl,
                });
            return NextResponse.json({ url: checkoutUrl }, { headers: { 'Cache-Control': 'no-store' } });
        } catch (error) {
            await prisma.storeCheckoutSession.delete({ where: { token: sessionToken } }).catch(() => null);
            throw error;
        }
    } catch (error) {
        console.error('[Store] Checkout creation failed:', error);
        return NextResponse.json({ error: 'Checkout could not be started. Please try again.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
