import type { SiteMode, SiteModeSettings } from '@prisma/client';

export type EffectiveSiteMode = {
    mode: SiteMode;
    isScheduled: boolean;
    isActive: boolean;
};

export function resolveSiteMode(
    settings: Pick<SiteModeSettings, 'mode' | 'startsAt' | 'endsAt'>,
    now = new Date(),
): EffectiveSiteMode {
    const hasStarted = !settings.startsAt || settings.startsAt <= now;
    const hasNotEnded = !settings.endsAt || settings.endsAt > now;
    const isScheduled = Boolean(settings.startsAt || settings.endsAt);
    const isActive = hasStarted && hasNotEnded;

    return {
        mode: isActive ? settings.mode : 'NORMAL',
        isScheduled,
        isActive,
    };
}

export function isReadOnlyMode(mode: SiteMode) {
    return mode === 'ARCHIVE';
}

export function requiresPublicGate(mode: SiteMode) {
    return mode === 'MAINTENANCE' || mode === 'COMING_SOON' || mode === 'PRIVATE';
}
