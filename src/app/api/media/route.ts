import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deleteMediaFile, uploadMediaFile } from '@/lib/media-storage';

const allowedRoles = new Set(['OWNER', 'ADMIN', 'EDITOR']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 30;
const ALLOWED = new Set(['jpg','jpeg','png','webp','gif','avif','pdf','txt','md','csv','json','zip','docx','xlsx','pptx']);

async function authorize() {
    const session = await auth();
    if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
    if (!allowedRoles.has(session.user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
    return { user: session.user } as const;
}

function safeFileName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
}

function ext(name: string) {
    return name.toLowerCase().split('.').pop() || '';
}

function assetSelect() {
    return {
        id: true,
        fileName: true,
        mimeType: true,
        url: true,
        altText: true,
        width: true,
        height: true,
    } as const;
}

export async function GET() {
    const access = await authorize();
    if ('error' in access) return access.error;

    const assets = await prisma.mediaAsset.findMany({
        orderBy: { createdAt: 'desc' },
        select: assetSelect(),
    });

    return NextResponse.json(assets, {
        headers: {
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

export async function POST(request: Request) {
    const access = await authorize();
    if ('error' in access) return access.error;

    try {
        const formData = await request.formData();
        const files = formData.getAll('files').filter((value): value is File => value instanceof File && value.size > 0).slice(0, MAX_FILES);
        if (!files.length) return NextResponse.json({ error: 'Choose one or more files to upload.' }, { status: 400 });

        const created = [];
        for (const file of files) {
            if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `${file.name}: maximum upload size is 10 MB.` }, { status: 400 });
            if (!ALLOWED.has(ext(file.name))) return NextResponse.json({ error: `${file.name}: unsupported file type.` }, { status: 400 });

            const fileName = safeFileName(file.name) || `asset-${Date.now()}`;
            const requestedKey = `media/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${fileName}`;
            const stored = await uploadMediaFile(file, requestedKey);
            try {
                const asset = await prisma.mediaAsset.create({
                    data: {
                        key: stored.key,
                        fileName,
                        mimeType: file.type || 'application/octet-stream',
                        size: file.size,
                        url: stored.url,
                    },
                    select: assetSelect(),
                });
                created.push(asset);
            } catch (error) {
                try { await deleteMediaFile(stored.key); } catch { /* best effort cleanup */ }
                throw error;
            }
        }

        return NextResponse.json({ assets: created }, {
            status: 201,
            headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
        });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 });
    }
}
