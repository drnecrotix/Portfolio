import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deleteMediaFile, uploadMediaFile } from '@/lib/media-storage';

const allowedRoles = new Set(['OWNER', 'ADMIN', 'EDITOR']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif',
    'mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v',
    'pdf', 'zip',
]);

async function requireEditor() {
    const session = await auth();
    if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    if (!allowedRoles.has(session.user.role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    return { session };
}

function safeFileName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
}

function extension(fileName: string) {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
}

function typeAllowed(file: File) {
    const ext = extension(file.name);
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return false;
    if (!file.type || file.type === 'application/octet-stream') return true;
    return ALLOWED_UPLOAD_TYPES.has(file.type);
}

function normalizedMimeType(file: File) {
    if (extension(file.name) === 'pdf') return 'application/pdf';
    return file.type || 'application/octet-stream';
}

export async function GET() {
    const access = await requireEditor();
    if (access.error) return access.error;

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

export async function POST(request: Request) {
    const access = await requireEditor();
    if (access.error) return access.error;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'Maximum upload size is 10 MB.' }, { status: 413 });
        }
        if (!typeAllowed(file)) {
            return NextResponse.json({ error: 'Unsupported file type. Upload an image, video, PDF document, or ZIP archive.' }, { status: 415 });
        }

        const fileName = safeFileName(file.name) || `asset-${Date.now()}`;
        const requestedKey = `media/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${fileName}`;
        const stored = await uploadMediaFile(file, requestedKey);

        try {
            const asset = await prisma.mediaAsset.create({
                data: {
                    key: stored.key,
                    fileName,
                    mimeType: normalizedMimeType(file),
                    size: file.size,
                    altText: String(formData.get('altText') ?? '').trim().slice(0, 500) || null,
                    caption: String(formData.get('caption') ?? '').trim().slice(0, 2000) || null,
                    url: stored.url,
                },
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

            return NextResponse.json(asset, {
                status: 201,
                headers: {
                    'Cache-Control': 'private, no-store',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        } catch (error) {
            try { await deleteMediaFile(stored.key); } catch { /* best-effort cleanup */ }
            throw error;
        }
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unable to upload media.' },
            { status: 500 },
        );
    }
}
