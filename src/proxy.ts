import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type SiteModePayload = {
    mode: 'NORMAL' | 'MAINTENANCE' | 'COMING_SOON' | 'PRIVATE' | 'ARCHIVE';
    bypassAdmins: boolean;
};

type RedirectPayload = {
    redirect: null | {
        target: string;
        permanent: boolean;
    };
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/api') ||
        pathname === '/site-status'
    ) {
        return NextResponse.next();
    }

    try {
        const redirectEndpoint = new URL('/api/redirects/resolve', request.url);
        redirectEndpoint.searchParams.set('path', pathname);
        const redirectResponse = await fetch(redirectEndpoint, { cache: 'no-store' });

        if (redirectResponse.ok) {
            const payload = (await redirectResponse.json()) as RedirectPayload;
            if (payload.redirect) {
                const target = payload.redirect.target.startsWith('/')
                    ? new URL(payload.redirect.target, request.url)
                    : new URL(payload.redirect.target);

                if (target.toString() !== request.nextUrl.toString()) {
                    return NextResponse.redirect(target, payload.redirect.permanent ? 308 : 307);
                }
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
        const hasAdminBypass = request.cookies.get('portfolio-admin-bypass')?.value === '1';

        if (settings.bypassAdmins && hasAdminBypass) {
            return NextResponse.next();
        }

        if (settings.mode === 'MAINTENANCE' || settings.mode === 'COMING_SOON' || settings.mode === 'PRIVATE') {
            const target = request.nextUrl.clone();
            target.pathname = '/site-status';
            target.search = '';
            return NextResponse.redirect(target);
        }

        const next = NextResponse.next();
        if (settings.mode === 'ARCHIVE') {
            next.headers.set('x-portfolio-archive-mode', '1');
        }
        return next;
    } catch {
        // Site mode must fail open if the database is temporarily unavailable.
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
