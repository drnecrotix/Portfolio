import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { contentReferencesMedia } from '@/lib/blog-media-protection';
import { normalizeGallerySettings } from '@/lib/gallery-settings';
import { normalizeContentWatermarkSettings, CONTENT_WATERMARK_CONFIG_SLUG, type ContentWatermarkSize } from '@/lib/content-watermark';
import { readMediaFile } from '@/lib/media-storage';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function watermarkSvg(text: string, imageWidth: number, opacity: number, size: ContentWatermarkSize) {
    const scale = size === 'medium' ? 0.024 : 0.02;
    const fontSize = Math.max(size === 'medium' ? 15 : 12, Math.min(size === 'medium' ? 38 : 30, Math.round(imageWidth * scale)));
    const horizontalPadding = Math.round(fontSize * 0.8);
    const verticalPadding = Math.round(fontSize * 0.4);
    const letterSpacing = fontSize * 0.08;
    const label = `© ${text}`;
    const estimatedTextWidth = label.length * fontSize * 0.61 + Math.max(0, label.length - 1) * letterSpacing;
    const width = Math.min(Math.round(imageWidth * 0.68), Math.ceil(estimatedTextWidth + horizontalPadding * 2));
    const height = Math.ceil(fontSize * 1.2 + verticalPadding * 2);
    const safeText = text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
    const input = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g opacity="${opacity}"><rect width="100%" height="100%" rx="${Math.round(fontSize * 0.6)}" fill="rgba(0,0,0,0.34)"/><text x="${horizontalPadding}" y="${verticalPadding + fontSize * 0.92}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="500" letter-spacing="${letterSpacing}" fill="white">© ${safeText}</text></g></svg>`);
    return { input, width, height };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [asset, posts, projects, siteSettings, watermarkPage] = await Promise.all([
        prisma.mediaAsset.findUnique({ where: { id }, select: { key: true, url: true, mimeType: true } }),
        prisma.post.findMany({
            where: { status: 'PUBLISHED', OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] },
            select: { content: true },
        }),
        prisma.project.findMany({
            where: { status: { not: 'ARCHIVED' } },
            select: { content: true },
        }),
        prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }),
        prisma.page.findUnique({ where: { slug: CONTENT_WATERMARK_CONFIG_SLUG }, select: { content: true } }),
    ]);

    const gallery = normalizeGallerySettings(siteSettings?.galleryContent);
    const galleryReferencesAsset = gallery.items.some((item) => item.isVisible && [
        item.type === 'image' ? item.mediaUrl : '',
        item.thumbnailUrl,
        item.socialImageUrl,
        ...item.additionalImages,
    ].includes(asset?.url ?? ''));
    const publicContentReferencesAsset = asset && (
        posts.some((post) => contentReferencesMedia(post.content, asset.url))
        || projects.some((project) => contentReferencesMedia(project.content, asset.url))
        || galleryReferencesAsset
    );

    if (!asset || !asset.mimeType.startsWith('image/') || !publicContentReferencesAsset) {
        return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const settings = normalizeContentWatermarkSettings(watermarkPage?.content);
        const source = await readMediaFile(asset.key);
        const pipeline = sharp(source, { animated: false }).rotate();
        const metadata = await pipeline.metadata();
        const swapsDimensions = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
        const width = Math.max(1, (swapsDimensions ? metadata.height : metadata.width) ?? 1200);
        const height = Math.max(1, (swapsDimensions ? metadata.width : metadata.height) ?? 630);
        let rendered = pipeline;

        if (settings.enabled && settings.renderMode === 'pixel') {
            const overlay = watermarkSvg(settings.text, width, settings.opacity, settings.size);
            const inset = Math.max(8, Math.round(width * 0.0125));
            const left = settings.position.endsWith('left') ? inset : Math.max(0, width - overlay.width - inset);
            const top = settings.position.startsWith('top') ? inset : Math.max(0, height - overlay.height - inset);
            rendered = pipeline.composite([{ input: overlay.input, left, top }]);
        }

        const output = await rendered.webp({ quality: 88, effort: 4 }).toBuffer();

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
