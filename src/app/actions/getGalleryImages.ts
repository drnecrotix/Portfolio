'use server';

import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { normalizeGallerySettings } from '@/lib/gallery-settings';

export interface GalleryImage {
    src: string;
    filename: string;
}

export async function getAllGalleryImages(): Promise<GalleryImage[]> {
    try {
        const site = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { galleryContent: true } }).catch(() => null);
        const settings = normalizeGallerySettings(site?.galleryContent);
        const selected = settings.items
            .filter((item) => item.isVisible && item.type === 'image' && item.mediaUrl)
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
                src: item.mediaUrl,
                filename: `${item.title || 'gallery-item'}.jpg`,
            }));

        if (selected.length) return selected;
    } catch (error) {
        console.error('Error loading selected gallery media:', error);
    }

    const publicDir = path.join(process.cwd(), 'public');
    const galleryDir = path.join(publicDir, 'gallery');

    try {
        if (!fs.existsSync(galleryDir)) return [];
        const files = fs.readdirSync(galleryDir);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        return files
            .filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()))
            .map((file) => ({ src: `/gallery/${file}`, filename: file }));
    } catch (error) {
        console.error('Error reading gallery directory:', error);
        return [];
    }
}
