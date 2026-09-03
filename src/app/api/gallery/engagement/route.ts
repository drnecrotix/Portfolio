import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';

const COOKIE_NAME = 'necrotix_gallery_like_id';

function cleanSlug(value: unknown) {
  return String(value ?? '').trim().slice(0, 140).replace(/[^a-zA-Z0-9-_]/g, '');
}

function readCookie(request: Request, name: string) {
  const raw = request.headers.get('cookie') || '';
  const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

async function isPublicGalleryWork(slug: string) {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { galleryContent: true },
  }).catch(() => null);
  const content = normalizeGallerySettings(settings?.galleryContent);
  return content.items.some((item) => item.slug === slug && item.isVisible && item.mediaUrl);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const slug = cleanSlug(body.slug);
  const action = String(body.action ?? '');
  if (!slug || !['view', 'like'].includes(action)) {
    return NextResponse.json({ error: 'Invalid gallery engagement request.' }, { status: 400 });
  }

  if (!await isPublicGalleryWork(slug)) {
    return NextResponse.json({ error: 'Gallery work not found.' }, { status: 404 });
  }

  if (action === 'view') {
    const stats = await prisma.galleryWorkStats.upsert({
      where: { slug },
      create: { slug, viewCount: 1 },
      update: { viewCount: { increment: 1 } },
      select: { viewCount: true, _count: { select: { likes: true } } },
    });
    return NextResponse.json(
      { views: stats.viewCount, likes: stats._count.likes },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }

  await prisma.galleryWorkStats.upsert({
    where: { slug },
    create: { slug },
    update: {},
  });

  let visitorId = readCookie(request, COOKIE_NAME);
  let setVisitorCookie = false;
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    visitorId = randomUUID();
    setVisitorCookie = true;
  }

  const existing = await prisma.galleryWorkLike.findUnique({
    where: { slug_visitorId: { slug, visitorId } },
    select: { id: true },
  });

  let liked: boolean;
  if (existing) {
    await prisma.galleryWorkLike.delete({ where: { id: existing.id } });
    liked = false;
  } else {
    await prisma.galleryWorkLike.create({ data: { slug, visitorId } });
    liked = true;
  }

  const [likes, stats] = await Promise.all([
    prisma.galleryWorkLike.count({ where: { slug } }),
    prisma.galleryWorkStats.findUnique({ where: { slug }, select: { viewCount: true } }),
  ]);

  const response = NextResponse.json({ liked, likes, views: stats?.viewCount ?? 0 });
  if (setVisitorCookie) {
    response.cookies.set(COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }
  return response;
}
