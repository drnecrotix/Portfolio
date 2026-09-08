import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { contentReferencesMedia } from '@/lib/blog-media-protection';
import { normalizeContentWatermarkSettings, CONTENT_WATERMARK_CONFIG_SLUG } from '@/lib/content-watermark';
import { readMediaFile } from '@/lib/media-storage';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function watermarkSvg(text: string, width: number, opacity: number) {
    const fontSize = Math.max(16, Math.min(44, Math.round(width * 0.026)));
    const padding = Math.round(fontSize * 0.65);
    const safeText = text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
    return Buffer.from(`<svg width="${width}" height="${fontSize + padding * 2}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${Math.round(fontSize * 0.4)}" fill="rgba(0,0,0,0.34)"/><text x="${padding}" y="${padding + fontSize * 0.78}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="white" fill-opacity="${opacity}">© ${safeText}</text></svg>`);
}

const gravity = {
    'top-left': 'northwest',
    'top-right': 'northeast',
    'bottom-left': 'southwest',
    'bottom-right': 'southeast',
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [asset, posts, watermarkPage] = await Promise.all([
        prisma.mediaAsset.findUnique({ where: { id }, select: { key: true, url: true, mimeType: true } }),
        prisma.post.findMany({
            where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
            select: { content: true },
        }),
        prisma.page.findUnique({ where: { slug: CONTENT_WATERMARK_CONFIG_SLUG }, select: { content: true } }),
    ]);

    if (!asset || !asset.mimeType.startsWith('image/') || !posts.some((post) => contentReferencesMedia(post.content, asset.url))) {
        return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const settings = normalizeContentWatermarkSettings(watermarkPage?.content);
        const source = await readMediaFile(asset.key);
        const pipeline = sharp(source, { animated: false }).rotate();
        const metadata = await pipeline.metadata();
        const width = Math.max(320, metadata.width ?? 1200);
        const labelWidth = Math.min(width - 24, Math.max(190, Math.round(width * 0.25)));
        const overlay = watermarkSvg(settings.text, labelWidth, settings.enabled ? settings.opacity : 0);
        const output = await pipeline
            .composite([{ input: overlay, gravity: gravity[settings.position] }])
            .webp({ quality: 88, effort: 4 })
            .toBuffer();

        return new NextResponse(new Uint8Array(output), {
            headers: {
                'Content-Type': 'image/webp',
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, no-store, max-age=0',
                'X-Content-Type-Options': 'nosniff',
                'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
                'Referrer-Policy': 'same-origin',
            },
        });
    } catch {
        return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
}
