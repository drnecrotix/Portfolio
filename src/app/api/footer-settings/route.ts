import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultFooterSettings, normalizeFooterSettings } from '@/lib/footer-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { footerContent: true } });
        return NextResponse.json(normalizeFooterSettings(settings?.footerContent), {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    } catch {
        return NextResponse.json(defaultFooterSettings, {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
    }
}
