'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deleteMediaFile, isManagedMediaKey, uploadMediaFile } from '@/lib/media-storage';

async function requireEditor() {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    if (!['OWNER', 'ADMIN', 'EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
    return session.user;
}

function normalizeUrl(value: FormDataEntryValue | null) {
    const url = String(value ?? '').trim();
    if (!url) throw new Error('Media URL is required.');
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Only HTTPS media URLs are allowed.');
    return parsed.toString();
}

function normalizeKey(value: FormDataEntryValue | null, fileName: string) {
    const key = String(value ?? '').trim();
    return (key || `external/${Date.now()}-${fileName}`)
        .replace(/^\/+/, '')
        .replace(/\s+/g, '-');
}

function safeFileName(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
}

function shortText(value: FormDataEntryValue | null, max: number) {
    const text = String(value ?? '').trim();
    return text ? text.slice(0, max) : null;
}

export async function uploadMediaAsset(formData: FormData) {
    await requireEditor();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file to upload.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Maximum upload size is 10 MB.');

    // SVG is intentionally excluded because active content can execute when opened directly from a public bucket.
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) throw new Error('Unsupported file type.');

    const fileName = safeFileName(file.name) || `asset-${Date.now()}`;
    const key = `media/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${fileName}`;
    const url = await uploadMediaFile(file, key);

    try {
        await prisma.mediaAsset.create({
            data: {
                key,
                fileName,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                altText: shortText(formData.get('altText'), 500),
                caption: shortText(formData.get('caption'), 2000),
                url,
            },
        });
    } catch (error) {
        try {
            await deleteMediaFile(key);
        } catch {
            // Best-effort cleanup if DB registration fails after a successful upload.
        }
        throw error;
    }

    revalidatePath('/admin/media');
}

export async function createMediaAsset(formData: FormData) {
    await requireEditor();
    const fileName = safeFileName(String(formData.get('fileName') ?? '').trim());
    if (!fileName) throw new Error('File name is required.');

    await prisma.mediaAsset.create({
        data: {
            key: normalizeKey(formData.get('key'), fileName),
            fileName,
            mimeType: String(formData.get('mimeType') ?? 'application/octet-stream').trim().slice(0, 120) || 'application/octet-stream',
            size: Math.max(0, Number(formData.get('size') ?? 0) || 0),
            width: Math.max(0, Number(formData.get('width') ?? 0) || 0) || null,
            height: Math.max(0, Number(formData.get('height') ?? 0) || 0) || null,
            altText: shortText(formData.get('altText'), 500),
            caption: shortText(formData.get('caption'), 2000),
            url: normalizeUrl(formData.get('url')),
        },
    });

    revalidatePath('/admin/media');
}

export async function updateMediaAsset(id: string, formData: FormData) {
    await requireEditor();
    const current = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!current) throw new Error('Media asset not found.');

    await prisma.mediaAsset.update({
        where: { id },
        data: {
            fileName: safeFileName(String(formData.get('fileName') ?? current.fileName).trim()) || current.fileName,
            mimeType: String(formData.get('mimeType') ?? current.mimeType).trim().slice(0, 120) || current.mimeType,
            altText: shortText(formData.get('altText'), 500),
            caption: shortText(formData.get('caption'), 2000),
            width: Math.max(0, Number(formData.get('width') ?? 0) || 0) || null,
            height: Math.max(0, Number(formData.get('height') ?? 0) || 0) || null,
        },
    });

    revalidatePath('/admin/media');
}

export async function deleteMediaAsset(id: string, formData: FormData) {
    const user = await requireEditor();
    if (user.role === 'EDITOR') throw new Error('Editors cannot delete media assets.');

    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return;

    const deleteStoredObject = formData.get('deleteStoredObject') === 'on';
    if (deleteStoredObject) {
        if (!isManagedMediaKey(asset.key)) {
            throw new Error('Only files uploaded by this CMS can be deleted from R2. External assets are library references only.');
        }
        await deleteMediaFile(asset.key);
    }

    await prisma.mediaAsset.delete({ where: { id } });
    revalidatePath('/admin/media');
}
