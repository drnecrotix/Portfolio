import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { normalizeResumeSettings, RESUME_CONFIG_SLUG } from '@/lib/resume-settings';

export const dynamic = 'force-dynamic';

function downloadHeaders(fileName: string) {
    return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-') || 'cv.pdf'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    };
}

export async function GET() {
    const page = await prisma.page.findUnique({
        where: { slug: RESUME_CONFIG_SLUG },
        select: { content: true },
    }).catch(() => null);
    const settings = normalizeResumeSettings(page?.content);
    const url = settings.downloadPdfUrl;

    if (url === '/resume.pdf') {
        try {
            const bytes = await readFile(path.join(process.cwd(), 'public', 'resume.pdf'));
            return new NextResponse(bytes, { headers: downloadHeaders('Nikola-Stoyanov-CV.pdf') });
        } catch {
            return NextResponse.json({ error: 'Default CV PDF is unavailable.' }, { status: 404 });
        }
    }

    const asset = await prisma.mediaAsset.findFirst({
        where: { url },
        select: { fileName: true, mimeType: true, url: true },
    }).catch(() => null);
    if (!asset || (asset.mimeType !== 'application/pdf' && !asset.fileName.toLowerCase().endsWith('.pdf'))) {
        return NextResponse.json({ error: 'Configured CV PDF is not available in Media Library.' }, { status: 404 });
    }

    try {
        const upstream = await fetch(asset.url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!upstream.ok) throw new Error(`PDF source returned ${upstream.status}`);
        const bytes = await upstream.arrayBuffer();
        return new NextResponse(bytes, { headers: downloadHeaders(asset.fileName) });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to download CV.' }, { status: 502 });
    }
}
