export type SeoIntelligenceMode = 'overview' | 'keywords' | 'competitors' | 'links';

export type SeoPageSignals = {
    url: string;
    statusCode: number;
    title?: string;
    description?: string;
    h1: string[];
    h2: string[];
    canonical?: string;
    noindex: boolean;
    schemaCount: number;
    wordCount: number;
    internalLinks: number;
    externalLinks: number;
    genericAnchors: number;
    nofollowLinks: number;
    redirects: number;
    text: string;
};

export type SeoScoreBreakdown = {
    technical: number;
    onPage: number;
    content: number;
    internalLinks: number;
    indexability: number;
    structuredData: number;
};

export type KeywordCandidate = {
    keyword: string;
    occurrences: number;
    pages: number;
    coverage: number;
    relevance: 'High' | 'Medium' | 'Low';
    cannibalization: boolean;
};

const STOP_WORDS = new Set(`
а аз ако ала без беше би бил била били било близо бъда бъдат бъде бях във вие винаги все всеки всички всяка всяко всякакви всякакъв всякаква всякакво всякакъв вид до докато е една едно един едни за заедно и или им има имах имаха като как каква какви какво какъв къде към ли ме между ми много може могат мой моя мое мои му на над най не него нея ни ние но от по под поне при през пред с са само се си след сме сте съм също тази тези този това така там те теб ти то той тя тук че чрез
about after again against all also an and any are as at be because been before being between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves
`.trim().split(/\s+/));

export function normalizeSeoTarget(value: string) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
        const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const url = new URL(candidate);
        return url.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
        return raw
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .split('/')[0]
            .trim()
            .toLowerCase();
    }
}

export function targetMatchesDomain(target: string, domain: string) {
    const wanted = normalizeSeoTarget(target);
    const candidate = normalizeSeoTarget(domain);
    return Boolean(wanted && candidate && (candidate === wanted || candidate.endsWith(`.${wanted}`)));
}

export function finiteNumber(value: unknown, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

export function tokenizeSeoText(value: string) {
    return (String(value ?? '').toLocaleLowerCase('bg-BG').match(/[\p{L}\p{N}]+/gu) ?? [])
        .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !STOP_WORDS.has(token));
}

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function scoreSeoPages(pages: SeoPageSignals[], brokenInternal = 0) {
    const successful = pages.filter((page) => page.statusCode > 0 && page.statusCode < 400);
    if (!successful.length) {
        const breakdown: SeoScoreBreakdown = { technical: 0, onPage: 0, content: 0, internalLinks: 0, indexability: 0, structuredData: 0 };
        return { score: 0, breakdown };
    }

    const titles = successful.map((page) => page.title?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
    const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index).filter((title, index, all) => all.indexOf(title) === index).length;
    const thinPages = successful.filter((page) => page.wordCount < 200).length;
    const genericAnchors = successful.reduce((sum, page) => sum + page.genericAnchors, 0);
    const internalLinks = successful.reduce((sum, page) => sum + page.internalLinks, 0);

    const technical = clampScore(average(successful.map((page) => (page.statusCode < 400 ? 70 : 0) + (new URL(page.url).protocol === 'https:' ? 20 : 0) + (page.redirects <= 1 ? 10 : 4))));
    const onPage = clampScore(average(successful.map((page) => (page.title ? 34 : 0) + (page.description ? 33 : 0) + (page.h1.length === 1 ? 33 : page.h1.length > 0 ? 18 : 0))));
    const content = clampScore(100 - (thinPages / successful.length) * 55 - Math.min(35, duplicateTitles * 15));
    const linkPenalty = Math.min(70, brokenInternal * 22 + genericAnchors * 2);
    const links = clampScore(100 - linkPenalty - (internalLinks ? 0 : 25));
    const indexability = clampScore(average(successful.map((page) => (page.noindex ? 0 : 72) + (page.canonical ? 28 : 16))));
    const structuredData = clampScore(average(successful.map((page) => page.schemaCount > 0 ? 100 : 35)));
    const breakdown: SeoScoreBreakdown = { technical, onPage, content, internalLinks: links, indexability, structuredData };
    const score = clampScore(technical * 0.25 + onPage * 0.25 + content * 0.20 + links * 0.15 + indexability * 0.10 + structuredData * 0.05);

    return { score, breakdown };
}

export function extractKeywordCandidates(pages: SeoPageSignals[], limit = 20): KeywordCandidate[] {
    type Entry = { score: number; occurrences: number; pages: Set<number>; importantPages: Set<number> };
    const store = new Map<string, Entry>();

    function add(keyword: string, pageIndex: number, weight: number, important: boolean) {
        const normalized = keyword.trim().replace(/\s+/g, ' ');
        if (!normalized || normalized.length < 3 || normalized.length > 80) return;
        const entry = store.get(normalized) ?? { score: 0, occurrences: 0, pages: new Set<number>(), importantPages: new Set<number>() };
        entry.score += weight;
        entry.occurrences += 1;
        entry.pages.add(pageIndex);
        if (important) entry.importantPages.add(pageIndex);
        store.set(normalized, entry);
    }

    pages.forEach((page, pageIndex) => {
        for (const token of tokenizeSeoText(page.text).slice(0, 5000)) add(token, pageIndex, 1, false);

        const importantParts = [page.title ?? '', ...page.h1, ...page.h2].filter(Boolean);
        for (const part of importantParts) {
            const tokens = tokenizeSeoText(part).slice(0, 16);
            for (const token of tokens) add(token, pageIndex, 5, true);
            for (let index = 0; index < tokens.length - 1; index += 1) add(`${tokens[index]} ${tokens[index + 1]}`, pageIndex, 8, true);
            for (let index = 0; index < tokens.length - 2; index += 1) add(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`, pageIndex, 10, true);
        }
    });

    const ranked = [...store.entries()]
        .filter(([keyword, entry]) => keyword.includes(' ') || entry.occurrences >= 2 || entry.importantPages.size > 0)
        .sort((left, right) => right[1].score - left[1].score || right[1].occurrences - left[1].occurrences)
        .slice(0, Math.max(1, limit));
    const maxScore = ranked[0]?.[1].score ?? 1;

    return ranked.map(([keyword, entry]) => {
        const ratio = entry.score / maxScore;
        return {
            keyword,
            occurrences: entry.occurrences,
            pages: entry.pages.size,
            coverage: pages.length ? Math.round((entry.pages.size / pages.length) * 100) : 0,
            relevance: ratio >= 0.55 ? 'High' : ratio >= 0.25 ? 'Medium' : 'Low',
            cannibalization: entry.importantPages.size > 1,
        };
    });
}
