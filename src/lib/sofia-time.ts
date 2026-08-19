const SOFIA_TIME_ZONE = 'Europe/Sofia';

function partsFor(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: SOFIA_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

export function formatSofiaDateTimeLocal(value: Date | null) {
    if (!value) return '';
    const parts = partsFor(value);
    return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}T${parts.hour.toString().padStart(2, '0')}:${parts.minute.toString().padStart(2, '0')}`;
}

export function parseSofiaDateTimeLocal(raw: string) {
    const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) return null;

    const [, y, mo, d, h, mi] = match;
    const desiredUtcLike = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0);
    let candidate = new Date(desiredUtcLike);

    // Iterate to account for Europe/Sofia daylight-saving transitions without
    // relying on the server's own timezone.
    for (let i = 0; i < 3; i += 1) {
        const p = partsFor(candidate);
        const representedUtcLike = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
        candidate = new Date(candidate.getTime() + (desiredUtcLike - representedUtcLike));
    }

    return candidate;
}

export { SOFIA_TIME_ZONE };
