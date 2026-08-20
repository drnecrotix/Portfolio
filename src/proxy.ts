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

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname === '/site-status') {
        return NextResponse.next();
    }

    try {
        const redirectEndpoint = new URL('/api/redirects/resolve', request.url);
        redirectEndpoint.searchParams.set('path', pathname);
        const redirectResponse = await fetch(redirectEndpoint, { cache: 'no-store' });
        if (redirectResponse.ok) {
            const payload = (await redirectResponse.json()) as RedirectPayload;
            if (payload.redirect) {
                const target = payload.redirect.target.startsWith('/') ? new URL(payload.redirect.target, request.url) : new URL(payload.redirect.target);
                if (target.toString() !== request.nextUrl.toString()) return NextResponse.redirect(target, payload.redirect.permanent ? 308 : 307);
            }
        }
    } catch {
        // Redirect resolution fails open so routing remains available if storage is down.
    }

    try {
        const endpoint = new URL('/api/site-mode', request.url);
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) return NextResponse.next();

        const settings = (await response.json()) as SiteModePayload;
        const adminBypassRevision = request.cookies.get('portfolio-admin-bypass')?.value;
        const hasAdminBypass = Boolean(adminBypassRevision && adminBypassRevision === settings.updatedAt);
        if (settings.bypassAdmins && hasAdminBypass) return NextResponse.next();

        if (settings.mode === 'PRIVATE' && await hasValidPrivateAccess(request)) return NextResponse.next();

        if (settings.mode === 'MAINTENANCE' || settings.mode === 'COMING_SOON' || settings.mode === 'PRIVATE') {
            const target = request.nextUrl.clone();
            target.pathname = '/site-status';
            target.search = '';
            return NextResponse.redirect(target);
        }

        const next = NextResponse.next();
        if (settings.mode === 'ARCHIVE') next.headers.set('x-portfolio-archive-mode', '1');
        return next;
    } catch {
        // Site mode must fail open if the database is temporarily unavailable.
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
