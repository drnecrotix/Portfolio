import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type SiteModePayload = {
    mode: 'NORMAL' | 'MAINTENANCE' | 'COMING_SOON' | 'PRIVATE' | 'ARCHIVE';
    bypassAdmins: boolean;
    updatedAt: string;
};

type RedirectPayload = {
    redirect: null | { target: string; permanent: boolean };
};

function contentSecurityPolicy() {
    // CSP belongs to the current document and is not replaced during Next.js
    // client-side navigation. The Lab can therefore load inside a document that
    // originated on any public route, so its WebAssembly permission must travel
    // with every document. This does not permit JavaScript eval().
    const scripts = ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"];
    if (process.env.NODE_ENV !== 'production') scripts.push("'unsafe-eval'");

    return [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        `script-src ${scripts.join(' ')}`,
        "style-src 'self' 'unsafe-inline' https:",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "media-src 'self' data: blob: https:",
        "connect-src 'self' https: wss:",
        "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com https://www.facebook.com https://platform.twitter.com https://assets.pinterest.com https://www.dailymotion.com",
        'upgrade-insecure-requests',
    ].join('; ');
}

function withCsp(response: NextResponse) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy());
    return response;
}

function nextWithCsp() {
    return withCsp(NextResponse.next());
}

function bytesToBase64Url(bytes: Uint8Array) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hasValidPrivateAccess(request: NextRequest) {
    const raw = request.cookies.get('portfolio-private-access')?.value;
    const secret = process.env.AUTH_SECRET;
    if (!raw || !secret) return false;

    const [expiryRaw, signature] = raw.split('.');
    const expiry = Number(expiryRaw);
    if (!expiry || expiry <= Math.floor(Date.now() / 1000) || !signature) return false;

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`private:${expiry}`));
    return bytesToBase64Url(new Uint8Array(signed)) === signature;
}

async function fetchSiteMode(request: NextRequest): Promise<SiteModePayload | null> {
    const bases = [process.env.SITE_URL, process.env.AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL, request.nextUrl.origin]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.replace(/\/$/, ''));
    const uniqueBases = [...new Set(bases)];

    for (const base of uniqueBases) {
        try {
            const endpoint = new URL('/api/site-mode', base);
            endpoint.searchParams.set('_siteModeCheck', Date.now().toString());
            const response = await fetch(endpoint, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, max-age=0',
                    Pragma: 'no-cache',
                    Accept: 'application/json',
                },
                signal: AbortSignal.timeout(5_000),
            });
            if (!response.ok) continue;
            return await response.json() as SiteModePayload;
        } catch {
            // Try the next origin. Some Passenger/N0C setups cannot loop back through request.url reliably.
        }
    }

    return null;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api')) return NextResponse.next();
    if (pathname.startsWith('/admin') || pathname === '/site-status') return nextWithCsp();

    try {
        const redirectEndpoint = new URL('/api/redirects/resolve', request.url);
        redirectEndpoint.searchParams.set('path', pathname);
        const redirectResponse = await fetch(redirectEndpoint, { cache: 'no-store' });
        if (redirectResponse.ok) {
            const payload = (await redirectResponse.json()) as RedirectPayload;
            if (payload.redirect) {
                const target = payload.redirect.target.startsWith('/') ? new URL(payload.redirect.target, request.url) : new URL(payload.redirect.target);
                if (target.toString() !== request.nextUrl.toString()) return withCsp(NextResponse.redirect(target, payload.redirect.permanent ? 308 : 307));
            }
        }
    } catch {
        // Redirect resolution fails open so routing remains available if storage is down.
    }

    const settings = await fetchSiteMode(request);
    if (!settings) return nextWithCsp();

    const adminBypassRevision = request.cookies.get('portfolio-admin-bypass')?.value;
    const hasAdminBypass = Boolean(adminBypassRevision && adminBypassRevision === settings.updatedAt);
    if (settings.bypassAdmins && hasAdminBypass) return nextWithCsp();

    if (settings.mode === 'PRIVATE' && await hasValidPrivateAccess(request)) return nextWithCsp();

    if (settings.mode === 'MAINTENANCE' || settings.mode === 'COMING_SOON' || settings.mode === 'PRIVATE' || settings.mode === 'ARCHIVE') {
        const target = request.nextUrl.clone();
        target.pathname = '/site-status';
        target.search = '';
        return withCsp(NextResponse.redirect(target));
    }

    return nextWithCsp();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
