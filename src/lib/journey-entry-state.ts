export type JourneyEntryList = 'education' | 'journey' | 'experience';

export type JourneyEntryFlags = {
    hidden: boolean;
    archived: boolean;
};

export type JourneyEntryState = Record<JourneyEntryList, Record<string, JourneyEntryFlags>>;

export const defaultJourneyEntryState: JourneyEntryState = {
    education: {},
    journey: {},
    experience: {},
};

function normalizeFlags(value: unknown): JourneyEntryFlags {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<JourneyEntryFlags>
        : {};
    return {
        hidden: source.hidden === true,
        archived: source.archived === true,
    };
}

function normalizeList(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, JourneyEntryFlags>;
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .map(([id, flags]) => [id.trim().slice(0, 120), normalizeFlags(flags)] as const)
            .filter(([id]) => Boolean(id)),
    );
}

export function normalizeJourneyEntryState(value: unknown): JourneyEntryState {
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Partial<Record<JourneyEntryList, unknown>>
        : {};
    return {
        education: normalizeList(source.education),
        journey: normalizeList(source.journey),
        experience: normalizeList(source.experience),
    };
}

export function entryIsPublic(state: JourneyEntryState, list: JourneyEntryList, id: string) {
    const flags = state[list][id];
    return !flags?.hidden && !flags?.archived;
}
