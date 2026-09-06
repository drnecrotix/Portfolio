export function plainTextFromHtml(value: string) {
    return value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function estimateReadingMinutes(value: string, wordsPerMinute = 220) {
    const plainText = plainTextFromHtml(value);
    if (!plainText) return 1;
    const words = plainText.split(/\s+/u).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function readingTimeLabel(minutes: number) {
    const safeMinutes = Math.max(1, Math.round(minutes));
    return `${safeMinutes} min read`;
}
