import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json(assets);
}
