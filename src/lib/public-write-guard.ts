import { prisma } from '@/lib/prisma';
import { resolveSiteMode } from '@/lib/site-mode';

export async function isPublicWriteBlocked() {
    try {
        const settings = await prisma.siteModeSettings.findUnique({ where: { id: 'default' } });
        if (!settings) return false;
        return resolveSiteMode(settings).mode === 'ARCHIVE';
    } catch {
        // Preserve the existing fail-open Site Mode behavior if storage is unavailable.
        return false;
    }
}
