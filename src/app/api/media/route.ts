import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const allowedRoles = new Set(['OWNER', 'ADMIN', 'EDITOR']);

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!allowedRoles.has(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assets = await prisma.mediaAsset.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            fileName: true,
            mimeType: true,
            url: true,
            altText: true,
            width: true,
            height: true,
        },
    });

    return NextResponse.json(assets, {
        headers: {
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
