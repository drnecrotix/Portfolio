'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { deleteMediaFile, isManagedMediaKey, uploadMediaFile } from '@/lib/media-storage';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'jpg','jpeg','png','webp','gif','avif',
  'mp4','webm','ogg','ogv','mov','m4v',
  'zip',
]);
const ALLOWED_TYPES = new Set([
  'image/jpeg','image/png','image/webp','image/gif','image/avif',
  'video/mp4','video/webm','video/ogg','video/quicktime','video/x-m4v',
  'application/zip','application/x-zip-compressed',
]);

async function user() {
  const session = await auth();
  if (!session?.user || !['OWNER','ADMIN','EDITOR'].includes(session.user.role)) throw new Error('Forbidden');
  return session.user;
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
}

function ext(name: string) { return name.toLowerCase().split('.').pop() || ''; }

function allowed(file: File) {
  if (!ALLOWED_EXTENSIONS.has(ext(file.name))) return false;
  if (!file.type || file.type === 'application/octet-stream') return true;
  return ALLOWED_TYPES.has(file.type);
}

export async function uploadMediaAssets(formData: FormData) {
  let destination = '/admin/media?saved=uploaded';
  try {
    await user();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File && value.size > 0).slice(0, 30);
    if (!files.length) throw new Error('Choose one or more files to upload.');

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: maximum upload size is 10 MB.`);
      if (!allowed(file)) throw new Error(`${file.name}: unsupported file type. Upload images, videos, or ZIP archives only.`);
      const fileName = safeFileName(file.name) || `asset-${Date.now()}`;
      const requestedKey = `media/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${fileName}`;
      const stored = await uploadMediaFile(file, requestedKey);
      try {
        await prisma.mediaAsset.create({ data: { key: stored.key, fileName, mimeType: file.type || 'application/octet-stream', size: file.size, url: stored.url } });
      } catch (error) {
        try { await deleteMediaFile(stored.key); } catch { /* best effort */ }
        throw error;
      }
    }
    revalidatePath('/admin/media');
    revalidatePath('/api/media');
  } catch (error) {
    destination = `/admin/media?error=${encodeURIComponent(error instanceof Error ? error.message : 'Upload failed.')}`;
  }
  redirect(destination);
}

export async function bulkDeleteMediaAssets(formData: FormData) {
  let destination = '/admin/media?saved=removed';
  try {
    const currentUser = await user();
    if (currentUser.role === 'EDITOR') throw new Error('Editors cannot delete media assets.');
    const ids = String(formData.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean).slice(0, 100);
    if (!ids.length) throw new Error('Select at least one media item.');
    const deleteStored = formData.get('deleteStoredObject') === 'on';
    const assets = await prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
    if (deleteStored) {
      for (const asset of assets) {
        if (isManagedMediaKey(asset.key)) await deleteMediaFile(asset.key);
      }
    }
    await prisma.mediaAsset.deleteMany({ where: { id: { in: ids } } });
    revalidatePath('/admin/media');
    revalidatePath('/api/media');
  } catch (error) {
    destination = `/admin/media?error=${encodeURIComponent(error instanceof Error ? error.message : 'Bulk delete failed.')}`;
  }
  redirect(destination);
}
