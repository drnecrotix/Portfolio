'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https media URLs are allowed.');
    return parsed.toString();
}

function normalizeKey(value: FormDataEntryValue | null, fileName: string) {
    const key = String(value ?? '').trim();
    return (key || `external/${Date.now()}-${fileName}`)
        .replace(/^\/+/, '')
        .replace(/\s+/g, '-');
}

export async function createMediaAsset(formData: FormData) {
    await requireEditor();
    const fileName = String(formData.get('fileName') ?? '').trim();
    if (!fileName) throw new Error('File name is required.');

    await prisma.mediaAsset.create({
        data: {
            key: normalizeKey(formData.get('key'), fileName),
            fileName,
            mimeType: String(formData.get('mimeType') ?? 'application/octet-stream').trim() || 'application/octet-stream',
            size: Math.max(0, Number(formData.get('size') ?? 0) || 0),
            width: Math.max(0, Number(formData.get('width') ?? 0) || 0) || null,
            height: Math.max(0, Number(formData.get('height') ?? 0) || 0) || null,
            altText: String(formData.get('altText') ?? '').trim() || null,
            caption: String(formData.get('caption') ?? '').trim() || null,
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
            fileName: String(formData.get('fileName') ?? current.fileName).trim() || current.fileName,
            mimeType: String(formData.get('mimeType') ?? current.mimeType).trim() || current.mimeType,
            altText: String(formData.get('altText') ?? '').trim() || null,
            caption: String(formData.get('caption') ?? '').trim() || null,
            width: Math.max(0, Number(formData.get('width') ?? 0) || 0) || null,
            height: Math.max(0, Number(formData.get('height') ?? 0) || 0) || null,
        },
    });

    revalidatePath('/admin/media');
}

export async function deleteMediaAsset(id: string) {
    const user = await requireEditor();
    if (user.role === 'EDITOR') throw new Error('Editors cannot delete media assets.');
    await prisma.mediaAsset.delete({ where: { id } });
    revalidatePath('/admin/media');
}
