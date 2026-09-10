import 'server-only';

import { normalizePublicUrl, requestPublicPage, WebHealthError, type PublicPageResponse } from '@/modules/web-health/http';
import { extractKeywordCandidates, normalizeSeoTarget, scoreSeoPages, tokenizeSeoText, type SeoIntelligenceMode, type SeoPageSignals } from './core';

const MAX_PAGES = 6;
const MAX_DISCOVERED_LINKS = 60;
const MAX_LINK_CHECKS = 10;
const MAX_COMPETITORS = 3;
const SKIP_ASSET = /\.(?:jpe?g|png|gif|webp|svg|pdf|zip|rar|7z|mp[34]|webm|css|js|xml)(?:$|\?)/i;
const GENERIC_ANCHORS = new Set(['click here', 'read more', 'learn more', 'more', 'link', 'тук', 'повече', 'прочети повече', 'научи повече', 'виж още']);

type LinkSignal = { url: string; anchor: string; internal: boolean; nofollow: boolean };
type PageAnalysis = SeoPageSignals & { links: LinkSignal[] };
type ScanResult = { requestedUrl: string; origin: string; pages: PageAnalysis[]; brokenTargets: string[]; checkedAt: string };

export class SeoIntelligenceError extends Error {
    constructor(message: string, public readonly status = 400) {
        super(message);
        this.name = 'SeoIntelligenceError';
    }
}

function decodeHtml(value: string) {
    return value
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function attr(tag: string, name: string) {
    const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    if (quoted?.[2] !== undefined) return decodeHtml(quoted[2]);
    const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'));
    return bare?.[1] ? decodeHtml(bare[1]) : undefined;
}

function tagTexts(html: string, name: string) {
    const regex = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi');
    return [...html.matchAll(regex)]
        .map((match) => decodeHtml(String(match[1] ?? '').replace(/<[^>]*>/g, ' ')))
        .filter(Boolean);
}

function metaContent(html: string, name: string) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
        if (String(attr(tag, 'name') ?? '').toLowerCase() === name.toLowerCase()) return attr(tag, 'content');
    }
    return undefined;
}

function canonicalHref(html: string) {
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
        const rel = String(attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
        if (rel.includes('canonical')) return attr(tag, 'href');
    }
    return undefined;
}

function visibleText(html: string) {
    return decodeHtml(html
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<!--([\s\S]*?)-->/g, ' ')
        .replace(/<[^>]+>/g, ' '));
}

function pageLinks(html: string, base: URL, origin: string) {
    const links: LinkSignal[] = [];
    const regex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(regex)) {
        const tag = `<a${match[1] ?? ''}>`;
        const href = attr(tag, 'href');
        if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href) || href.startsWith('#')) continue;
        try {
            const url = new URL(href, base);
            url.hash = '';
            if (!['http:', 'https:'].includes(url.protocol) || SKIP_ASSET.test(url.pathname)) continue;
            const anchor = decodeHtml(String(match[2] ?? '').replace(/<[^>]*>/g, ' '));
            const rel = String(attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
            links.push({ url: url.toString(), anchor, internal: url.origin === origin, nofollow: rel.includes('nofollow') });
            if (links.length >= 120) break;
        } catch {
            // Ignore malformed href values in the bounded native scan.
        }
    }
    return links;
}

function analyzePage(response: PublicPageResponse, origin: string): PageAnalysis {
    const html = response.body;
    const title = tagTexts(html, 'title')[0];
    const description = metaContent(html, 'description');
    const h1 = tagTexts(html, 'h1');
    const h2 = tagTexts(html, 'h2');
    const canonical = canonicalHref(html);
    const robots = String(metaContent(html, 'robots') ?? '').toLowerCase();
    const text = visibleText(html).slice(0, 80_000);
    const links = pageLinks(html, response.finalUrl, origin);
    return {
        url: response.finalUrl.toString(),
        statusCode: response.statusCode,
        title,
        description,
        h1,
        h2,
        canonical,
        noindex: /(?:^|[,\s])noindex(?:$|[,\s])/.test(robots),
        schemaCount: (html.match(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1/gi) ?? []).length,
        wordCount: tokenizeSeoText(text).length,
        internalLinks: links.filter((link) => link.internal).length,
        externalLinks: links.filter((link) => !link.internal).length,
        genericAnchors: links.filter((link) => GENERIC_ANCHORS.has(link.anchor.toLowerCase().trim())).length,
        nofollowLinks: links.filter((link) => link.nofollow).length,
        redirects: response.redirects.length,
        text,
        links,
    };
}

function emptyPage(url: string, statusCode = 0): PageAnalysis {
    return { url, statusCode, h1: [], h2: [], noindex: false, schemaCount: 0, wordCount: 0, internalLinks: 0, externalLinks: 0, genericAnchors: 0, nofollowLinks: 0, redirects: 0, text: '', links: [] };
}

function isHtml(response: PublicPageResponse) {
    return /text\/html|application\/xhtml\+xml/i.test(String(response.headers['content-type'] ?? ''));
}

function looksBroken(statusCode: number) {
    return statusCode >= 400 && ![401, 403, 405, 429].includes(statusCode);
}

async function scanSite(input: string): Promise<ScanResult> {
    const requested = normalizePublicUrl(input);
    const first = await requestPublicPage(requested, { maxBodyBytes: 384 * 1024, timeoutMs: 6_000, maxRedirects: 3 });
    if (!isHtml(first)) throw new SeoIntelligenceError('The target did not return an HTML page.', 422);

    const origin = first.finalUrl.origin;
    const firstUrl = first.finalUrl.toString();
    const queue = [firstUrl];
    const queued = new Set(queue);
    const visited = new Set<string>();
    const pages: PageAnalysis[] = [];
    let firstPending: PublicPageResponse | null = first;

    while (queue.length && pages.length < MAX_PAGES) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        try {
            const response = firstPending && current === firstUrl
                ? firstPending
                : await requestPublicPage(new URL(current), { maxBodyBytes: 384 * 1024, timeoutMs: 5_000, maxRedirects: 2, allowedOrigin: origin });
            firstPending = null;
            if (!isHtml(response)) {
                pages.push(emptyPage(response.finalUrl.toString(), response.statusCode));
                continue;
            }
            const page = analyzePage(response, origin);
            pages.push(page);
            if (page.statusCode >= 400) continue;

            for (const link of page.links) {
                if (!link.internal || queued.size >= MAX_DISCOVERED_LINKS || queued.has(link.url) || visited.has(link.url)) continue;
                queued.add(link.url);
                queue.push(link.url);
            }
        } catch {
            firstPending = null;
            pages.push(emptyPage(current));
        }
    }

    const broken = new Set(pages.filter((page) => looksBroken(page.statusCode)).map((page) => page.url));
    const uncheckedInternal = [...new Set(pages.flatMap((page) => page.links.filter((link) => link.internal).map((link) => link.url)))]
        .filter((url) => !visited.has(url))
        .slice(0, MAX_LINK_CHECKS);

    for (const url of uncheckedInternal) {
        try {
            const response = await requestPublicPage(new URL(url), { method: 'HEAD', timeoutMs: 3_000, maxRedirects: 2, allowedOrigin: origin });
            if (looksBroken(response.statusCode)) broken.add(url);
        } catch {
            // An inconclusive HEAD check is not labelled as a broken link.
        }
    }

    return { requestedUrl: requested.toString(), origin, pages, brokenTargets: [...broken].slice(0, 10), checkedAt: new Date().toISOString() };
}

function buildFindings(scan: ScanResult) {
    const successful = scan.pages.filter((page) => page.statusCode > 0 && page.statusCode < 400);
    const findings: Array<{ id: string; severity: 'fail' | 'warning' | 'info'; label: string; summary: string; recommendation?: string }> = [];
    const missingTitles = successful.filter((page) => !page.title).length;
    const missingDescriptions = successful.filter((page) => !page.description).length;
    const missingH1 = successful.filter((page) => page.h1.length === 0).length;
    const multipleH1 = successful.filter((page) => page.h1.length > 1).length;
    const thinPages = successful.filter((page) => page.wordCount < 200).length;
    const noindexPages = successful.filter((page) => page.noindex).length;
    const missingCanonical = successful.filter((page) => !page.canonical).length;
    const genericAnchors = successful.reduce((sum, page) => sum + page.genericAnchors, 0);
    const titles = successful.map((page) => page.title?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
    const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index).filter((title, index, all) => all.indexOf(title) === index).length;

    if (scan.brokenTargets.length) findings.push({ id: 'broken-internal', severity: 'fail', label: 'Broken internal targets', summary: `${scan.brokenTargets.length} internal target${scan.brokenTargets.length === 1 ? '' : 's'} returned a confirmed error in the bounded sample.`, recommendation: 'Repair, redirect or remove links to broken internal URLs.' });
    if (missingTitles) findings.push({ id: 'missing-title', severity: 'fail', label: 'Missing page titles', summary: `${missingTitles} crawled page${missingTitles === 1 ? '' : 's'} did not expose a <title>.`, recommendation: 'Add a unique, descriptive title to every indexable page.' });
    if (missingDescriptions) findings.push({ id: 'missing-description', severity: 'warning', label: 'Missing meta descriptions', summary: `${missingDescriptions} page${missingDescriptions === 1 ? '' : 's'} did not expose a meta description.`, recommendation: 'Write concise descriptions that accurately summarize each page.' });
    if (missingH1 || multipleH1) findings.push({ id: 'heading-structure', severity: 'warning', label: 'H1 structure', summary: `${missingH1} page${missingH1 === 1 ? '' : 's'} without an H1; ${multipleH1} with multiple H1 elements.`, recommendation: 'Use a clear primary heading and keep the document hierarchy intentional.' });
    if (duplicateTitles) findings.push({ id: 'duplicate-title', severity: 'warning', label: 'Duplicate titles', summary: `${duplicateTitles} duplicated title value${duplicateTitles === 1 ? '' : 's'} found in the sample.`, recommendation: 'Differentiate titles so each page has a distinct search intent.' });
    if (thinPages) findings.push({ id: 'thin-content', severity: 'warning', label: 'Thin content signal', summary: `${thinPages} page${thinPages === 1 ? '' : 's'} contained fewer than 200 meaningful words in captured HTML.`, recommendation: 'Expand pages only where additional useful content answers real user intent.' });
    if (noindexPages) findings.push({ id: 'noindex', severity: 'warning', label: 'Noindex detected', summary: `${noindexPages} crawled page${noindexPages === 1 ? '' : 's'} declared noindex.`, recommendation: 'Confirm that noindex is intentional for every affected page.' });
    if (missingCanonical) findings.push({ id: 'canonical', severity: 'warning', label: 'Canonical coverage', summary: `${missingCanonical} page${missingCanonical === 1 ? '' : 's'} did not expose a canonical link.`, recommendation: 'Use canonicals where duplicate or alternate URL paths can occur.' });
    if (genericAnchors) findings.push({ id: 'generic-anchor', severity: 'warning', label: 'Generic anchor text', summary: `${genericAnchors} generic internal/external anchor${genericAnchors === 1 ? '' : 's'} found.`, recommendation: 'Prefer descriptive anchor text when it helps users understand the destination.' });
    if (successful.length && successful.every((page) => page.schemaCount === 0)) findings.push({ id: 'structured-data', severity: 'info', label: 'Structured data', summary: 'No JSON-LD structured data was detected in the bounded sample.', recommendation: 'Add schema only when a supported type accurately represents the page content.' });
    if (!findings.length) findings.push({ id: 'clean-sample', severity: 'info', label: 'Clean bounded sample', summary: 'No high-confidence SEO hygiene issue was detected in the pages sampled by the native engine.' });
    return findings;
}

function pageRows(scan: ScanResult) {
    return scan.pages.map((page) => ({
        url: page.url,
        statusCode: page.statusCode,
        title: page.title ?? '',
        words: page.wordCount,
        h1: page.h1.length,
        internalLinks: page.internalLinks,
        externalLinks: page.externalLinks,
    }));
}

async function homepageSnapshot(input: string) {
    const requested = normalizePublicUrl(input);
    const response = await requestPublicPage(requested, { maxBodyBytes: 384 * 1024, timeoutMs: 6_000, maxRedirects: 3 });
    if (!isHtml(response)) throw new SeoIntelligenceError(`${requested.hostname} did not return an HTML page.`, 422);
    return analyzePage(response, response.finalUrl.origin);
}

async function competitorComparison(targetInput: string, competitorInputs: string[]) {
    const targetDomain = normalizeSeoTarget(targetInput);
    const unique = [...new Set(competitorInputs.map(normalizeSeoTarget).filter((domain) => domain && domain.includes('.') && domain !== targetDomain))].slice(0, MAX_COMPETITORS);
    if (!targetDomain || !targetDomain.includes('.')) throw new SeoIntelligenceError('Enter a valid website domain.', 400);
    if (!unique.length) throw new SeoIntelligenceError('Add at least one competitor domain to compare.', 400);

    const targetPage = await homepageSnapshot(targetInput);
    const targetKeywords = new Set(extractKeywordCandidates([targetPage], 30).map((row) => row.keyword));
    const pages = [targetPage];
    for (const domain of unique) pages.push(await homepageSnapshot(domain));

    return pages.map((page, index) => {
        const keywordSet = new Set(extractKeywordCandidates([page], 30).map((row) => row.keyword));
        const overlap = index === 0 ? 100 : Math.round(([...targetKeywords].filter((keyword) => keywordSet.has(keyword)).length / Math.max(1, targetKeywords.size)) * 100);
        return {
            domain: normalizeSeoTarget(page.url),
            isTarget: index === 0,
            score: scoreSeoPages([page], 0).score,
            title: page.title ?? '',
            words: page.wordCount,
            h1: page.h1.length,
            schema: page.schemaCount,
            keywordOverlap: overlap,
        };
    });
}

export async function runNativeSeoIntelligence(input: { mode: SeoIntelligenceMode; query: string; competitors?: string[] }) {
    try {
        if (input.mode === 'competitors') {
            return { mode: input.mode, rows: await competitorComparison(input.query, input.competitors ?? []), provider: 'native' as const };
        }

        const scan = await scanSite(input.query);
        if (input.mode === 'keywords') {
            const rows = extractKeywordCandidates(scan.pages, 24);
            return { mode: input.mode, rows, pagesAnalyzed: scan.pages.length, cannibalizationCount: rows.filter((row) => row.cannibalization).length, provider: 'native' as const };
        }

        if (input.mode === 'links') {
            const allLinks = scan.pages.flatMap((page) => page.links);
            const internal = allLinks.filter((link) => link.internal);
            const external = allLinks.filter((link) => !link.internal);
            const externalDomains = new Set(external.map((link) => normalizeSeoTarget(link.url)).filter(Boolean));
            return {
                mode: input.mode,
                provider: 'native' as const,
                summary: {
                    internalLinks: internal.length,
                    externalLinks: external.length,
                    uniqueInternalTargets: new Set(internal.map((link) => link.url)).size,
                    externalDomains: externalDomains.size,
                    brokenInternal: scan.brokenTargets.length,
                    genericAnchors: allLinks.filter((link) => GENERIC_ANCHORS.has(link.anchor.toLowerCase().trim())).length,
                    nofollowLinks: allLinks.filter((link) => link.nofollow).length,
                },
                rows: scan.pages.map((page) => ({ url: page.url, internalLinks: page.internalLinks, externalLinks: page.externalLinks, genericAnchors: page.genericAnchors, nofollowLinks: page.nofollowLinks })),
                brokenTargets: scan.brokenTargets,
            };
        }

        const scored = scoreSeoPages(scan.pages, scan.brokenTargets.length);
        return {
            mode: input.mode,
            provider: 'native' as const,
            score: scored.score,
            breakdown: scored.breakdown,
            findings: buildFindings(scan),
            pages: pageRows(scan),
            checkedAt: scan.checkedAt,
            scope: `Bounded native sample of up to ${MAX_PAGES} same-origin pages. Market-wide search volume, paid CPC, live Google rankings and global backlinks are intentionally not estimated.`,
        };
    } catch (error) {
        if (error instanceof SeoIntelligenceError) throw error;
        if (error instanceof WebHealthError) throw new SeoIntelligenceError(error.message, error.status);
        throw error;
    }
}
