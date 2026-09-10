import 'server-only';

import { lookup as dnsLookup } from 'node:dns';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import type { WebsiteInspection, WebsiteInspectorCheck, WebsiteInspectorStatus } from './types';

const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;

export class WebsiteInspectorError extends Error {
    constructor(message: string, public readonly status = 400) {
        super(message);
        this.name = 'WebsiteInspectorError';
    }
}

function normalizedHostname(url: URL) {
    return url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function isBlockedIpv4(address: string) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
    const [a, b, c] = parts;
    return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 0 && (c === 0 || c === 2))
        || (a === 192 && b === 88 && c === 99)
        || (a === 192 && b === 168)
        || (a === 198 && (b === 18 || b === 19))
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
}

function isBlockedIp(address: string) {
    const value = address.toLowerCase().split('%')[0];
    const family = isIP(value);
    if (family === 4) return isBlockedIpv4(value);
    if (family !== 6) return true;

    if (value === '::' || value === '::1') return true;
    if (value.startsWith('::ffff:')) {
        const mapped = value.slice('::ffff:'.length);
        return isIP(mapped) === 4 ? isBlockedIpv4(mapped) : true;
    }

    const first = value.split(':')[0];
    if (first === 'fc' || first === 'fd' || first.startsWith('fc') || first.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(first)) return true;
    if (first.startsWith('ff')) return true;
    if (value.startsWith('2001:db8:')) return true;
    return false;
}

function validateTarget(url: URL) {
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new WebsiteInspectorError('Only public HTTP and HTTPS websites can be inspected.');
    }
    if (url.username || url.password) {
        throw new WebsiteInspectorError('URLs containing embedded credentials are not supported.');
    }

    const defaultPort = url.protocol === 'https:' ? '443' : '80';
    if (url.port && url.port !== defaultPort) {
        throw new WebsiteInspectorError('Website Inspector v1 supports only standard HTTP/HTTPS ports.');
    }

    const hostname = normalizedHostname(url);
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        throw new WebsiteInspectorError('Private or local network targets are not allowed.');
    }
    if (isIP(hostname) && isBlockedIp(hostname)) {
        throw new WebsiteInspectorError('Private, loopback, link-local and reserved IP ranges are not allowed.');
    }
}

function normalizeInput(input: string) {
    const raw = input.trim();
    if (!raw) throw new WebsiteInspectorError('Enter a website URL.');
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        throw new WebsiteInspectorError('Enter a valid public website URL.');
    }
    url.hash = '';
    validateTarget(url);
    return url;
}

const safeLookup: LookupFunction = (hostname, options, callback) => {
    const lookupOptions = typeof options === 'number'
        ? { family: options, all: false as const }
        : { ...options, all: false as const };

    dnsLookup(hostname, lookupOptions, (error, address, family) => {
        if (error) {
            callback(error, '', family);
            return;
        }
        if (isBlockedIp(address)) {
            const blocked = Object.assign(new Error('Target resolved to a private or reserved IP address.'), { code: 'EACCES' });
            callback(blocked, '', family);
            return;
        }
        callback(null, address, family);
    });
};

function firstHeader(headers: IncomingHttpHeaders, name: string) {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
}

type RawPage = {
    finalUrl: URL;
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: string;
    capturedBytes: number;
    truncated: boolean;
    responseTimeMs: number;
};

async function requestPage(initialUrl: URL): Promise<RawPage> {
    const startedAt = Date.now();

    async function follow(url: URL, redirects: number): Promise<RawPage> {
        validateTarget(url);
        if (redirects > MAX_REDIRECTS) throw new WebsiteInspectorError('The website redirected too many times.', 422);

        return new Promise<RawPage>((resolve, reject) => {
            const requester = url.protocol === 'https:' ? httpsRequest : httpRequest;
            let settled = false;
            const chunks: Buffer[] = [];
            let capturedBytes = 0;
            let truncated = false;

            const req = requester(url, {
                method: 'GET',
                lookup: safeLookup,
                headers: {
                    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
                    'Accept-Encoding': 'identity',
                    'User-Agent': 'NecrotixLab-Website-Inspector/1.0 (+https://necrotixlab.com/website-inspector)',
                },
            }, (response) => {
                const statusCode = response.statusCode ?? 0;
                const location = firstHeader(response.headers, 'location');

                if (statusCode >= 300 && statusCode < 400 && location) {
                    response.resume();
                    let next: URL;
                    try {
                        next = new URL(location, url);
                    } catch {
                        if (!settled) {
                            settled = true;
                            reject(new WebsiteInspectorError('The website returned an invalid redirect.', 422));
                        }
                        return;
                    }
                    validateTarget(next);
                    settled = true;
                    resolve(follow(next, redirects + 1));
                    return;
                }

                response.on('data', (chunk: Buffer | string) => {
                    if (settled) return;
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    const remaining = MAX_BODY_BYTES - capturedBytes;
                    if (remaining > 0) {
                        const slice = buffer.subarray(0, remaining);
                        chunks.push(slice);
                        capturedBytes += slice.length;
                    }
                    if (buffer.length > remaining || capturedBytes >= MAX_BODY_BYTES) {
                        truncated = true;
                        settled = true;
                        resolve({
                            finalUrl: url,
                            statusCode,
                            headers: response.headers,
                            body: Buffer.concat(chunks).toString('utf8'),
                            capturedBytes,
                            truncated,
                            responseTimeMs: Date.now() - startedAt,
                        });
                        response.destroy();
                    }
                });

                response.on('end', () => {
                    if (settled) return;
                    settled = true;
                    resolve({
                        finalUrl: url,
                        statusCode,
                        headers: response.headers,
                        body: Buffer.concat(chunks).toString('utf8'),
                        capturedBytes,
                        truncated,
                        responseTimeMs: Date.now() - startedAt,
                    });
                });

                response.on('error', (error) => {
                    if (settled) return;
                    settled = true;
                    reject(error);
                });
            });

            req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('Request timed out.')));
            req.on('error', (error) => {
                if (settled) return;
                settled = true;
                reject(error);
            });
            req.end();
        });
    }

    try {
        return await follow(initialUrl, 0);
    } catch (error) {
        if (error instanceof WebsiteInspectorError) throw error;
        const message = error instanceof Error ? error.message : 'The website could not be reached.';
        throw new WebsiteInspectorError(`Unable to inspect this website: ${message}`, 422);
    }
}

function decodeHtml(value: string) {
    return value
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function attribute(tag: string, name: string) {
    const quoted = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
    if (quoted?.[2] !== undefined) return decodeHtml(quoted[2]);
    const bare = tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'));
    return bare?.[1] ? decodeHtml(bare[1]) : undefined;
}

function metaContent(html: string, key: string) {
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const identifier = attribute(tag, 'name') || attribute(tag, 'property');
        if (identifier?.toLowerCase() === key.toLowerCase()) return attribute(tag, 'content');
    }
    return undefined;
}

function canonicalUrl(html: string) {
    const tags = html.match(/<link\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
        if (rel.includes('canonical')) return attribute(tag, 'href');
    }
    return undefined;
}

function pageTitle(html: string) {
    const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    return match?.[1] ? decodeHtml(match[1].replace(/<[^>]*>/g, ' ')) : undefined;
}

function htmlLanguage(html: string) {
    const tag = html.match(/<html\b[^>]*>/i)?.[0];
    return tag ? attribute(tag, 'lang') : undefined;
}

function hasPolicyLink(html: string, kind: 'privacy' | 'cookie') {
    const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? [];
    const pattern = kind === 'privacy' ? /(privacy|gdpr|data protection)/i : /(cookie|cookies)/i;
    return anchors.some((anchor) => pattern.test(`${attribute(anchor, 'href') || ''} ${anchor.replace(/<[^>]*>/g, ' ')}`));
}

function addCheck(checks: WebsiteInspectorCheck[], check: WebsiteInspectorCheck) {
    checks.push(check);
}

function gradeFor(score: number): WebsiteInspection['grade'] {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

function scoreChecks(checks: WebsiteInspectorCheck[]) {
    const graded = checks.filter((check) => check.status !== 'info');
    if (!graded.length) return 0;
    const points = graded.reduce((total, check) => total + (check.status === 'pass' ? 2 : check.status === 'warning' ? 1 : 0), 0);
    return Math.round((points / (graded.length * 2)) * 100);
}

function statusForLength(value: string | undefined, min: number, max: number): WebsiteInspectorStatus {
    if (!value) return 'fail';
    return value.length >= min && value.length <= max ? 'pass' : 'warning';
}

export async function inspectWebsite(input: string): Promise<WebsiteInspection> {
    const requested = normalizeInput(input);
    const raw = await requestPage(requested);
    const contentType = firstHeader(raw.headers, 'content-type') || '';
    const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
    const html = isHtml ? raw.body : '';
    const title = pageTitle(html);
    const description = metaContent(html, 'description');
    const viewport = metaContent(html, 'viewport');
    const robots = metaContent(html, 'robots')?.toLowerCase();
    const canonical = canonicalUrl(html);
    const language = htmlLanguage(html);
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    const checks: WebsiteInspectorCheck[] = [];

    addCheck(checks, {
        id: 'http-status', category: 'delivery', label: 'HTTP response',
        status: raw.statusCode >= 200 && raw.statusCode < 300 ? 'pass' : raw.statusCode >= 300 && raw.statusCode < 500 ? 'warning' : 'fail',
        summary: `Final response returned HTTP ${raw.statusCode || 'unknown'}.`,
    });
    addCheck(checks, {
        id: 'https', category: 'security', label: 'HTTPS',
        status: raw.finalUrl.protocol === 'https:' ? 'pass' : 'fail',
        summary: raw.finalUrl.protocol === 'https:' ? 'The final page is delivered over HTTPS.' : 'The final page is delivered over unencrypted HTTP.',
    });
    addCheck(checks, {
        id: 'content-type', category: 'delivery', label: 'HTML document',
        status: isHtml ? 'pass' : 'warning',
        summary: isHtml ? `HTML content detected (${contentType.split(';')[0]}).` : `The response is not an HTML document (${contentType || 'unknown content type'}).`,
    });

    const csp = firstHeader(raw.headers, 'content-security-policy');
    const hsts = firstHeader(raw.headers, 'strict-transport-security');
    const nosniff = firstHeader(raw.headers, 'x-content-type-options');
    const frame = firstHeader(raw.headers, 'x-frame-options');
    const referrer = firstHeader(raw.headers, 'referrer-policy');
    const permissions = firstHeader(raw.headers, 'permissions-policy');

    addCheck(checks, { id: 'csp', category: 'security', label: 'Content Security Policy', status: csp ? 'pass' : 'warning', summary: csp ? 'A Content-Security-Policy header is present.' : 'No Content-Security-Policy header was detected.' });
    addCheck(checks, { id: 'hsts', category: 'security', label: 'HSTS', status: raw.finalUrl.protocol !== 'https:' ? 'fail' : hsts ? 'pass' : 'warning', summary: hsts ? 'Strict-Transport-Security is enabled.' : 'Strict-Transport-Security was not detected.' });
    addCheck(checks, { id: 'nosniff', category: 'security', label: 'MIME sniffing protection', status: nosniff?.toLowerCase().includes('nosniff') ? 'pass' : 'warning', summary: nosniff ? `X-Content-Type-Options: ${nosniff}` : 'X-Content-Type-Options: nosniff was not detected.' });
    addCheck(checks, { id: 'frame-protection', category: 'security', label: 'Frame protection', status: frame || csp?.toLowerCase().includes('frame-ancestors') ? 'pass' : 'warning', summary: frame ? `X-Frame-Options: ${frame}` : csp?.toLowerCase().includes('frame-ancestors') ? 'CSP frame-ancestors protection is present.' : 'No X-Frame-Options or CSP frame-ancestors directive was detected.' });
    addCheck(checks, { id: 'referrer-policy', category: 'privacy', label: 'Referrer Policy', status: referrer ? 'pass' : 'warning', summary: referrer ? `Referrer-Policy: ${referrer}` : 'No Referrer-Policy header was detected.' });
    addCheck(checks, { id: 'permissions-policy', category: 'privacy', label: 'Permissions Policy', status: permissions ? 'pass' : 'warning', summary: permissions ? 'A Permissions-Policy header is present.' : 'No Permissions-Policy header was detected.' });

    if (isHtml) {
        const titleStatus = statusForLength(title, 15, 60);
        addCheck(checks, { id: 'title', category: 'seo', label: 'Page title', status: titleStatus, summary: !title ? 'No <title> element was found.' : titleStatus === 'pass' ? `Title length is ${title.length} characters.` : `Title exists but is ${title.length} characters; roughly 15-60 is a useful target.` });
        const descriptionStatus = statusForLength(description, 50, 160);
        addCheck(checks, { id: 'description', category: 'seo', label: 'Meta description', status: descriptionStatus, summary: !description ? 'No meta description was found.' : descriptionStatus === 'pass' ? `Description length is ${description.length} characters.` : `Description exists but is ${description.length} characters; roughly 50-160 is a useful target.` });
        addCheck(checks, { id: 'viewport', category: 'seo', label: 'Mobile viewport', status: viewport ? 'pass' : 'warning', summary: viewport ? 'A viewport meta tag is present.' : 'No viewport meta tag was detected.' });
        addCheck(checks, { id: 'canonical', category: 'seo', label: 'Canonical URL', status: canonical ? 'pass' : 'warning', summary: canonical ? `Canonical: ${canonical}` : 'No canonical link was detected.' });
        addCheck(checks, { id: 'h1', category: 'seo', label: 'Primary heading', status: h1Count === 1 ? 'pass' : 'warning', summary: h1Count === 1 ? 'Exactly one H1 heading was detected.' : `${h1Count} H1 headings were detected.` });
        if (robots?.includes('noindex')) {
            addCheck(checks, { id: 'robots-noindex', category: 'seo', label: 'Indexing directive', status: 'warning', summary: 'The page asks search engines not to index it (noindex).' });
        } else {
            addCheck(checks, { id: 'robots-noindex', category: 'seo', label: 'Indexing directive', status: 'pass', summary: 'No page-level noindex directive was detected.' });
        }
        const privacyLink = hasPolicyLink(html, 'privacy');
        const cookieLink = hasPolicyLink(html, 'cookie');
        addCheck(checks, { id: 'privacy-link', category: 'privacy', label: 'Privacy information', status: privacyLink ? 'pass' : 'info', summary: privacyLink ? 'A privacy/data-protection link was detected on the page.' : 'No obvious privacy-policy link was detected on this page. This is informational, not a compliance verdict.' });
        addCheck(checks, { id: 'cookie-link', category: 'privacy', label: 'Cookie information', status: cookieLink ? 'pass' : 'info', summary: cookieLink ? 'A cookie-related link was detected on the page.' : 'No obvious cookie-policy link was detected on this page. This is informational, not a compliance verdict.' });
    }

    addCheck(checks, {
        id: 'response-time', category: 'performance', label: 'Server response',
        status: raw.responseTimeMs <= 1_000 ? 'pass' : 'warning',
        summary: `The inspected request completed in ${raw.responseTimeMs} ms. This is a single server-side sample, not a Core Web Vitals measurement.`,
    });
    addCheck(checks, {
        id: 'document-size', category: 'performance', label: 'HTML transfer sample',
        status: raw.truncated ? 'warning' : raw.capturedBytes <= 200 * 1024 ? 'pass' : 'warning',
        summary: raw.truncated ? 'The HTML exceeded the 512 KB inspection cap; only the first 512 KB were analyzed.' : `${Math.max(1, Math.round(raw.capturedBytes / 1024))} KB of response body was inspected.`,
    });

    const score = scoreChecks(checks);
    return {
        requestedUrl: requested.toString(),
        finalUrl: raw.finalUrl.toString(),
        checkedAt: new Date().toISOString(),
        statusCode: raw.statusCode,
        responseTimeMs: raw.responseTimeMs,
        score,
        grade: gradeFor(score),
        page: {
            title,
            description,
            canonical,
            language,
            contentType: contentType || undefined,
            server: firstHeader(raw.headers, 'server'),
            h1Count,
            capturedBytes: raw.capturedBytes,
            truncated: raw.truncated,
        },
        checks,
    };
}
