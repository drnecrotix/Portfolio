import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { normalizeResumeSettings, RESUME_CONFIG_SLUG } from '@/lib/resume-settings';

export type ResumePdfKind = 'view' | 'download';

export type LoadedResumePdf = {
    bytes: Uint8Array;
    sourceFileName: string;
    downloadFileName: string;
};

export async function loadResumePdf(kind: ResumePdfKind, requestUrl: string): Promise<LoadedResumePdf> {
    const page = await prisma.page.findUnique({
        where: { slug: RESUME_CONFIG_SLUG },
        select: { content: true },
    }).catch(() => null);
    const settings = normalizeResumeSettings(page?.content);
    const url = kind === 'view' ? settings.webViewPdfUrl : settings.downloadPdfUrl;

    if (url === '/resume.pdf') {
        const bytes = await readFile(path.join(process.cwd(), 'public', 'resume.pdf'));
        return {
            bytes: new Uint8Array(bytes),
            sourceFileName: 'resume.pdf',
            downloadFileName: settings.downloadFileName,
        };
    }

    const asset = await prisma.mediaAsset.findFirst({
        where: { url },
        select: { fileName: true, mimeType: true, url: true },
    }).catch(() => null);
    if (!asset || (asset.mimeType !== 'application/pdf' && !asset.fileName.toLowerCase().endsWith('.pdf'))) {
        throw new Error('Configured CV PDF is not available in Media Library.');
    }

    const sourceUrl = new URL(asset.url, requestUrl);
    const upstream = await fetch(sourceUrl, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) throw new Error(`PDF source returned ${upstream.status}`);
    const bytes = await upstream.arrayBuffer();

    return {
        bytes: new Uint8Array(bytes),
        sourceFileName: asset.fileName,
        downloadFileName: settings.downloadFileName,
    };
}

export function pdfResponseHeaders(disposition: 'inline' | 'attachment', fileName: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-') || 'cv.pdf';
    return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    };
}
