import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { socialVideoSourceUrl } from '@/lib/gallery-settings';

const allowedRoles = new Set(['OWNER', 'ADMIN', 'EDITOR']);
const allowedHosts = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'instagram.com',
  'facebook.com', 'fb.watch', 'x.com', 'twitter.com', 'pinterest.com', 'pin.it',
  'dailymotion.com', 'dai.ly',
];
const allowedThumbnailHosts = [
  'ytimg.com', 'vimeocdn.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com',
  'cdninstagram.com', 'fbcdn.net', 'twimg.com', 'pinimg.com', 'dmcdn.net',
];

function matchesHost(hostname: string, allowedHostsList: string[]) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return allowedHostsList.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function hostAllowed(hostname: string) {
  return matchesHost(hostname, allowedHosts);
}

function thumbnailHostAllowed(hostname: string) {
  return matchesHost(hostname, allowedThumbnailHosts);
}

function safeUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'https:' && hostAllowed(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

function safeThumbnailUrl(value: unknown, base?: URL) {
  try {
    const url = base ? new URL(String(value ?? '').trim(), base) : new URL(String(value ?? '').trim());
    return url.protocol === 'https:' && thumbnailHostAllowed(url.hostname) ? url.toString() : '';
  } catch {
    return '';
  }
}

function youtubeId(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be') return parts[0] || '';
  if (host.endsWith('youtube.com')) {
    return url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(parts[0] || '') ? parts[1] || '' : '');
  }
  return '';
}

function metaImage(html: string) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) return match.replaceAll('&amp;', '&');
  }
  return '';
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NecrotixLabThumbnailBot/1.1)',
      Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

async function fetchMetadataImage(url: URL) {
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NecrotixLabThumbnailBot/1.1)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return '';
  const finalUrl = safeUrl(response.url);
  if (!finalUrl) return '';
  const html = (await response.text()).slice(0, 1_000_000);
  const image = metaImage(html);
  return image ? safeThumbnailUrl(image, finalUrl) : '';
}

async function resolveThumbnail(input: URL) {
  const canonicalValue = socialVideoSourceUrl(input.toString()) || input.toString();
  const url = safeUrl(canonicalValue) || input;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  const yt = youtubeId(url);
  if (yt) return { thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(yt)}/hqdefault.jpg`, source: 'youtube' };

  if (host.endsWith('vimeo.com')) {
    const data = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}`);
    const thumbnailUrl = safeThumbnailUrl(data?.thumbnail_url);
    if (thumbnailUrl) return { thumbnailUrl, source: 'vimeo-oembed' };
  }

  if (host.endsWith('tiktok.com')) {
    const data = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`);
    const thumbnailUrl = safeThumbnailUrl(data?.thumbnail_url);
    if (thumbnailUrl) return { thumbnailUrl, source: 'tiktok-oembed' };
  }

  if (host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it') {
    const data = await fetchJson(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url.toString())}`);
    const thumbnailUrl = safeThumbnailUrl(data?.thumbnail_url);
    if (thumbnailUrl) return { thumbnailUrl, source: 'pinterest-oembed' };
  }

  if (host === 'dailymotion.com' || host === 'dai.ly') {
    const data = await fetchJson(`https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url.toString())}&format=json`);
    const thumbnailUrl = safeThumbnailUrl(data?.thumbnail_url);
    if (thumbnailUrl) return { thumbnailUrl, source: 'dailymotion-oembed' };
  }

  const metadataThumbnail = await fetchMetadataImage(url).catch(() => '');
  if (metadataThumbnail) return { thumbnailUrl: metadataThumbnail, source: 'metadata' };

  return { thumbnailUrl: '', source: 'none' };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!allowedRoles.has(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json().catch(() => null) as { url?: unknown } | null;
    const url = safeUrl(body?.url);
    if (!url) return NextResponse.json({ error: 'Use a supported public HTTPS social-media URL.' }, { status: 400 });

    const result = await resolveThumbnail(url);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to resolve thumbnail.' }, { status: 500 });
  }
}
