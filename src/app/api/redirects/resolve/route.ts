import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function normalizePath(path: string) {
    if (!path.startsWith('/')) return null;
    const normalized = path.replace(/\/+/g, '/');
    return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const path = normalizePath(url.searchParams.get('path') ?? '');
    if (!path) return NextResponse.json({ redirect: null }, { headers: { 'Cache-Control': 'no-store' } });

    try {
        const redirect = await prisma.redirect.findUnique({ where: { source: path } });
        return NextResponse.json(
            redirect ? { redirect: { target: redirect.target, permanent: redirect.permanent } } : { redirect: null },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch {
        return NextResponse.json({ redirect: null, degraded: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
}
