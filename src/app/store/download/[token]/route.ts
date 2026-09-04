import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    fetchExternalDigitalProduct,
    isExternalDigitalProductStorageKey,
    readDigitalProductFile,
} from '@/lib/store-storage';

export const dynamic = 'force-dynamic';

function safeFileName(value: string) {
    return value.replace(/[\r\n"\\]/g, '_').slice(0, 180) || 'download';
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const fileId = new URL(request.url).searchParams.get('file') || '';

    const grant = await prisma.storeDownloadGrant.findUnique({
        where: { token },
        include: { order: true, product: { include: { files: true } } },
    });

    const expired = Boolean(grant?.expiresAt && grant.expiresAt.getTime() <= Date.now());
    if (!grant || grant.order.status !== 'PAID' || grant.revokedAt || expired || grant.downloads >= grant.maxDownloads) {
        return NextResponse.json({ error: 'This download is unavailable or has reached its download limit.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    const file = grant.product.files.find((item) => item.id === fileId);
    if (!file) return NextResponse.json({ error: 'File not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

    try {
        if (isExternalDigitalProductStorageKey(file.storageKey)) {
            const remote = await fetchExternalDigitalProduct(file.storageKey);
            await prisma.storeDownloadGrant.update({ where: { id: grant.id }, data: { downloads: { increment: 1 } } });
            const headers = new Headers({
                'Content-Type': remote.headers.get('content-type') || file.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${safeFileName(file.fileName)}"`,
                'Cache-Control': 'private, no-store, max-age=0',
                'X-Content-Type-Options': 'nosniff',
            });
            const contentLength = remote.headers.get('content-length');
            if (contentLength && /^\d+$/.test(contentLength)) headers.set('Content-Length', contentLength);
            return new Response(remote.body, { status: 200, headers });
        }

        const stored = await readDigitalProductFile(file.storageKey);
        const responseBody = new ArrayBuffer(stored.bytes.byteLength);
        new Uint8Array(responseBody).set(stored.bytes);
        await prisma.storeDownloadGrant.update({ where: { id: grant.id }, data: { downloads: { increment: 1 } } });
        return new Response(responseBody, {
            status: 200,
            headers: {
                'Content-Type': stored.contentType || file.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${safeFileName(file.fileName)}"`,
                'Content-Length': String(responseBody.byteLength),
                'Cache-Control': 'private, no-store, max-age=0',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('[Store] Download failed:', error);
        return NextResponse.json({ error: 'The file could not be downloaded.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}
