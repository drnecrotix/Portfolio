import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const PAGE_ACCESS_CONFIG_SLUG = '__page-access-config';

export const MANAGED_PAGE_KEYS = ['wiki', 'blog', 'gallery', 'store'] as const;
export type ManagedPageKey = (typeof MANAGED_PAGE_KEYS)[number];
export type ManagedPageAccessMode = 'PUBLIC' | 'DISABLED' | 'ADMIN_ONLY';
export type ManagedPageAccessSettings = Record<ManagedPageKey, ManagedPageAccessMode>;

export const defaultManagedPageAccessSettings: ManagedPageAccessSettings = {
    wiki: 'PUBLIC',
    blog: 'PUBLIC',
    gallery: 'PUBLIC',
    store: 'PUBLIC',
};

const validModes = new Set<ManagedPageAccessMode>(['PUBLIC', 'DISABLED', 'ADMIN_ONLY']);

export function normalizeManagedPageAccessSettings(value: unknown): ManagedPageAccessSettings {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return Object.fromEntries(MANAGED_PAGE_KEYS.map((key) => {
        const raw = String(source[key] ?? '').toUpperCase() as ManagedPageAccessMode;
        return [key, validModes.has(raw) ? raw : defaultManagedPageAccessSettings[key]];
    })) as ManagedPageAccessSettings;
}

export async function getManagedPageAccessSettings() {
    try {
        const config = await prisma.page.findUnique({
            where: { slug: PAGE_ACCESS_CONFIG_SLUG },
            select: { content: true },
        });
        return normalizeManagedPageAccessSettings(config?.content);
    } catch {
        return defaultManagedPageAccessSettings;
    }
}

export function canAccessManagedPage(
    settings: ManagedPageAccessSettings,
    key: ManagedPageKey,
    isAdmin: boolean,
) {
    const mode = settings[key];
    if (mode === 'PUBLIC') return true;
    if (mode === 'ADMIN_ONLY') return isAdmin;
    return false;
}

export function isManagedPagePublic(settings: ManagedPageAccessSettings, key: ManagedPageKey) {
    return settings[key] === 'PUBLIC';
}

export async function requireManagedPageAccess(key: ManagedPageKey) {
    const settings = await getManagedPageAccessSettings();
    const mode = settings[key];
    if (mode === 'PUBLIC') return;

    if (mode === 'ADMIN_ONLY') {
        const session = await auth();
        if (session?.user && ['OWNER', 'ADMIN'].includes(session.user.role)) return;
    }

    notFound();
}
