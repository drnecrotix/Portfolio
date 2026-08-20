import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { galleryContent: true },
    });
    return NextResponse.json(normalizeGallerySettings(settings?.galleryContent), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json(normalizeGallerySettings(null), {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }
}
