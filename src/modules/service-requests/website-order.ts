export function validWebsiteUrl(value: string) {
    try {
        const candidate = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
        return ['http:', 'https:'].includes(candidate.protocol) && candidate.hostname.includes('.') && !candidate.hostname.includes(' ');
    } catch {
        return false;
    }
}
