import 'server-only';

import { normalizePublicUrl, requestPublicPage, type PublicPageResponse, type SafeRedirectHop } from './http';
import { scoreHealthChecks } from './scoring';
import type { HealthCheck, SiteCrawlPage, SiteCrawlReport } from './types';

const MAX_PAGES = 8;
const MAX_DISCOVERED_LINKS = 80;

function decodeHtml(value: string) {
    return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

function attr(tag: string, name: string) {
    const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    if (quoted?.[2] !== undefined) return decodeHtml(quoted[2]);
    const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'));
    return bare?.[1] ? decodeHtml(bare[1]) : undefined;
}

function pageTitle(html: string) {
    const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    return match?.[1] ? decodeHtml(match[1].replace(/<[^>]*>/g, ' ')) : undefined;
}

function internalLinks(html: string, base: URL, origin: string) {
    const result = new Set<string>();
    for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
        const href = attr(tag, 'href');
        if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href) || href.startsWith('#')) continue;
        try {
            const url = new URL(href, base);
            url.hash = '';
            if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) continue;
            if (/\.(?:jpe?g|png|gif|webp|svg|pdf|zip|rar|7z|mp[34]|webm|css|js|xml)(?:$|\?)/i.test(url.pathname)) continue;
            result.add(url.toString());
            if (result.size >= MAX_DISCOVERED_LINKS) break;
        } catch {
            // Ignore malformed links in the bounded crawl queue.
        }
    }
    return [...result];
}

function toPage(response: PublicPageResponse, linksFound: number): SiteCrawlPage {
    return {
        url: response.finalUrl.toString(),
        statusCode: response.statusCode,
        title: pageTitle(response.body),
        linksFound,
        redirects: response.redirects.length,
    };
}

export async function crawlSite(input: string): Promise<SiteCrawlReport> {
    const requested = normalizePublicUrl(input);
    const first = await requestPublicPage(requested, { maxBodyBytes: 256 * 1024, timeoutMs: 6_000, maxRedirects: 3 });
    const origin = first.finalUrl.origin;
    const queue: string[] = [first.finalUrl.toString()];
    const queued = new Set(queue);
    const visited = new Set<string>();
    const sourceByUrl = new Map<string, string>();
    const pages: SiteCrawlPage[] = [];
    const brokenLinks: SiteCrawlReport['brokenLinks'] = [];
    const redirects: SafeRedirectHop[] = [];
    let firstPending: PublicPageResponse | null = first;

    while (queue.length && pages.length < MAX_PAGES) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        try {
            const response = firstPending && current === first.finalUrl.toString()
                ? firstPending
                : await requestPublicPage(new URL(current), { maxBodyBytes: 256 * 1024, timeoutMs: 5_000, maxRedirects: 2, allowedOrigin: origin });
            firstPending = null;
            redirects.push(...response.redirects);
            const contentType = String(response.headers['content-type'] ?? '');
            const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
            const links = isHtml ? internalLinks(response.body, response.finalUrl, origin) : [];
            pages.push(toPage(response, links.length));

            if (response.statusCode >= 400 || response.statusCode === 0) {
                brokenLinks.push({ url: current, source: sourceByUrl.get(current), statusCode: response.statusCode });
                continue;
            }

            for (const link of links) {
                if (queued.size >= MAX_DISCOVERED_LINKS) break;
                if (!queued.has(link) && !visited.has(link)) {
                    queued.add(link);
                    sourceByUrl.set(link, response.finalUrl.toString());
                    queue.push(link);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Request failed.';
            pages.push({ url: current, statusCode: 0, linksFound: 0, redirects: 0, error: message });
            brokenLinks.push({ url: current, source: sourceByUrl.get(current), statusCode: 0, error: message });
        }
    }

    const missingTitles = pages.filter((page) => page.statusCode > 0 && !page.title).length;
    const titles = pages.map((page) => page.title?.trim().toLowerCase()).filter((value): value is string => Boolean(value));
    const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index).filter((title, index, all) => all.indexOf(title) === index).length;
    const checks: HealthCheck[] = [];

    checks.push({
        id: 'reachable-pages', label: 'Crawled pages', status: pages.length ? 'pass' : 'fail',
        summary: `${pages.length} of at most ${MAX_PAGES} same-origin HTML targets were requested.`,
    });
    checks.push({
        id: 'broken-links', label: 'Broken internal pages', status: brokenLinks.length === 0 ? 'pass' : 'fail',
        summary: brokenLinks.length ? `${brokenLinks.length} crawled internal target${brokenLinks.length === 1 ? '' : 's'} returned an error or HTTP 4xx/5xx.` : 'No broken targets were found inside the bounded crawl sample.',
        recommendation: brokenLinks.length ? 'Repair or redirect broken internal URLs, then update links that still point at obsolete locations.' : undefined,
    });
    checks.push({
        id: 'redirects', label: 'Redirect hops', status: redirects.length <= 2 ? 'pass' : 'warning',
        summary: `${redirects.length} redirect hop${redirects.length === 1 ? '' : 's'} observed across the crawled sample.`,
        recommendation: redirects.length > 2 ? 'Link directly to canonical destinations where possible to reduce unnecessary redirect chains.' : undefined,
    });
    checks.push({
        id: 'page-titles', label: 'Page titles', status: missingTitles === 0 ? 'pass' : 'warning',
        summary: missingTitles ? `${missingTitles} crawled page${missingTitles === 1 ? '' : 's'} did not expose a title in the captured HTML.` : 'Every successfully crawled HTML page exposed a title.',
        recommendation: missingTitles ? 'Add concise, page-specific <title> elements to crawlable HTML documents.' : undefined,
    });
    checks.push({
        id: 'duplicate-titles', label: 'Duplicate titles', status: duplicateTitles === 0 ? 'pass' : 'warning',
        summary: duplicateTitles ? `${duplicateTitles} duplicated title value${duplicateTitles === 1 ? '' : 's'} detected in the sample.` : 'No duplicate page titles were detected in the bounded sample.',
        recommendation: duplicateTitles ? 'Use unique titles that describe each page’s purpose.' : undefined,
    });
    checks.push({
        id: 'crawl-scope', label: 'Crawl scope', status: 'info',
        summary: `This is a resource-bounded same-origin sample capped at ${MAX_PAGES} pages. External links, assets, authenticated pages and exhaustive crawling are not checked.`,
    });

    return {
        requestedUrl: requested.toString(),
        origin,
        checkedAt: new Date().toISOString(),
        score: scoreHealthChecks(checks),
        checks,
        pages,
        brokenLinks,
        redirects,
    };
}
