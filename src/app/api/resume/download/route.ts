import { NextResponse } from 'next/server';
import { loadResumePdf, pdfResponseHeaders } from '@/lib/resume-pdf';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const pdf = await loadResumePdf('download', request.url);
        return new NextResponse(pdf.bytes, { headers: pdfResponseHeaders('attachment', pdf.downloadFileName) });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to download CV.' }, { status: 502 });
    }
}
