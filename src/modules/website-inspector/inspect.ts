import 'server-only';

import { lookup as dnsLookup } from 'node:dns';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import type { TLSSocket } from 'node:tls';
import type { WebsiteInspection, WebsiteInspectorCheck, WebsiteInspectorStatus } from './types';

const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const PROBE_BODY_BYTES = 64 * 1024;
const PROBE_TIMEOUT_MS = 3_500;
const PROBE_REDIRECTS = 2;

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
        throw new WebsiteInspectorError('Website Inspector supports only standard HTTP/HTTPS ports.');
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
        if (!address || isBlockedIp(address)) {
            const blocked = Object.assign(new Error('Target resolved to an invalid, private or reserved IP address.'), { code: 'EACCES' });
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

function headerValues(headers: IncomingHttpHeaders, name: string) {
    const value = headers[name.toLowerCase()];
    if (!value) return [];
    return Array.isArray(value) ? value : [String(value)];
}

type RedirectHop = {
    from: string;
    statusCode: number;
    to: string;
};

type RawPage = {
    finalUrl: URL;
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: string;
    capturedBytes: number;
    truncated: boolean;
    responseTimeMs: number;
    redirects: RedirectHop[];
    tls?: WebsiteInspection['page']['tls'];
};

function tlsDetails(responseSocket: unknown): WebsiteInspection['page']['tls'] | undefined {
    const socket = responseSocket as TLSSocket;
    if (!socket || typeof socket.getProtocol !== 'function' || typeof socket.getPeerCertificate !== 'function') return undefined;

    const certificate = socket.getPeerCertificate();
    const validTo = certificate?.valid_to;
    const validToTime = validTo ? Date.parse(validTo) : Number.NaN;
    const daysRemaining = Number.isFinite(validToTime)
        ? Math.ceil((validToTime - Date.now()) / 86_400_000)
        : undefined;

    return {
        protocol: socket.getProtocol() || undefined,
        cipher: socket.getCipher()?.name,
        issuer: certificate?.issuer?.CN || certificate?.issuer?.O,
        validFrom: certificate?.valid_from,
        validTo,
        daysRemaining,
    };
}

async function requestPage(initialUrl: URL): Promise<RawPage> {
    const startedAt = Date.now();

    async function follow(url: URL, redirects: RedirectHop[]): Promise<RawPage> {
        validateTarget(url);
        if (redirects.length > MAX_REDIRECTS) {
            throw new WebsiteInspectorError('The website redirected too many times.', 422);
        }

        return new Promise<RawPage>((resolve, reject) => {
            const requester = url.protocol === 'https:' ? httpsRequest : httpRequest;
            let settled = false;
            const chunks: Buffer[] = [];
            let capturedBytes = 0;
            let truncated = false;

            const req = requester(url, {
                method: 'GET',
                lookup: safeLookup,
                autoSelectFamily: false,
                headers: {
                    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
                    'Accept-Encoding': 'identity',
                    'User-Agent': 'NecrotixLab-Website-Inspector/1.2 (+https://necrotixlab.com/website-inspector)',
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
                    if (redirects.length >= MAX_REDIRECTS) {
                        if (!settled) {
                            settled = true;
                            reject(new WebsiteInspectorError('The website redirected too many times.', 422));
                        }
                        return;
                    }
                    settled = true;
                    resolve(follow(next, [...redirects, { from: url.toString(), statusCode, to: next.toString() }]));
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
                            redirects,
                            tls: url.protocol === 'https:' ? tlsDetails(response.socket) : undefined,
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
                        redirects,
                        tls: url.protocol === 'https:' ? tlsDetails(response.socket) : undefined,
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
        return await follow(initialUrl, []);
    } catch (error) {
        if (error instanceof WebsiteInspectorError) throw error;
        const message = error instanceof Error ? error.message : 'The website could not be reached.';
        throw new WebsiteInspectorError(`Unable to inspect this website: ${message}`, 422);
    }
}

type ProbeResult = {
    finalUrl: URL;
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: string;
};

async function probeResource(
    initialUrl: URL,
    options: { method?: 'GET' | 'HEAD'; accept?: string; acceptEncoding?: string; maxBytes?: number } = {},
): Promise<ProbeResult> {
    const origin = initialUrl.origin;
    const method = options.method ?? 'GET';
    const maxBytes = options.maxBytes ?? PROBE_BODY_BYTES;

    async function follow(url: URL, redirects: number): Promise<ProbeResult> {
        validateTarget(url);
        if (url.origin !== origin) throw new Error('Cross-origin probe redirect was not followed.');
        if (redirects > PROBE_REDIRECTS) throw new Error('Probe redirect limit reached.');

        return new Promise<ProbeResult>((resolve, reject) => {
            const requester = url.protocol === 'https:' ? httpsRequest : httpRequest;
            let settled = false;
            const chunks: Buffer[] = [];
            let captured = 0;

            const req = requester(url, {
                method,
                lookup: safeLookup,
                autoSelectFamily: false,
                headers: {
                    Accept: options.accept ?? '*/*',
                    'Accept-Encoding': options.acceptEncoding ?? 'identity',
                    'User-Agent': 'NecrotixLab-Website-Inspector/1.2 (+https://necrotixlab.com/website-inspector)',
                },
            }, (response) => {
                const statusCode = response.statusCode ?? 0;
                const location = firstHeader(response.headers, 'location');

                if (statusCode >= 300 && statusCode < 400 && location && redirects < PROBE_REDIRECTS) {
                    response.resume();
                    let next: URL;
                    try {
                        next = new URL(location, url);
                    } catch {
                        reject(new Error('Invalid probe redirect.'));
                        return;
                    }
                    if (next.origin !== origin) {
                        settled = true;
                        resolve({ finalUrl: url, statusCode, headers: response.headers, body: '' });
                        return;
                    }
                    validateTarget(next);
                    settled = true;
                    resolve(follow(next, redirects + 1));
                    return;
                }

                if (method === 'HEAD') {
                    response.resume();
                    settled = true;
                    resolve({ finalUrl: url, statusCode, headers: response.headers, body: '' });
                    return;
                }

                response.on('data', (chunk: Buffer | string) => {
                    if (settled) return;
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    const remaining = maxBytes - captured;
                    if (remaining > 0) {
                        const slice = buffer.subarray(0, remaining);
                        chunks.push(slice);
                        captured += slice.length;
                    }
                    if (captured >= maxBytes) {
                        settled = true;
                        resolve({
                            finalUrl: url,
                            statusCode,
                            headers: response.headers,
                            body: Buffer.concat(chunks).toString('utf8'),
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
                    });
                });

                response.on('error', (error) => {
                    if (settled) return;
                    settled = true;
                    reject(error);
                });
            });

            req.setTimeout(PROBE_TIMEOUT_MS, () => req.destroy(new Error('Probe timed out.')));
            req.on('error', (error) => {
                if (settled) return;
                settled = true;
                reject(error);
            });
            req.end();
        });
    }

    return follow(initialUrl, 0);
}

async function optionalProbe(
    url: URL,
    options?: { method?: 'GET' | 'HEAD'; accept?: string; acceptEncoding?: string; maxBytes?: number },
) {
    try {
        return await probeResource(url, options);
    } catch {
        return undefined;
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

function linkHrefByRel(html: string, relName: string) {
    const tags = html.match(/<link\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
        if (rel.includes(relName.toLowerCase())) return attribute(tag, 'href');
    }
    return undefined;
}

function canonicalUrl(html: string) {
    return linkHrefByRel(html, 'canonical');
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

function robotsSitemap(body: string, base: URL) {
    const match = body.match(/^\s*sitemap\s*:\s*(\S+)/im);
    if (!match?.[1]) return undefined;
    try {
        const url = new URL(match[1], base);
        return url.origin === base.origin ? url : undefined;
    } catch {
        return undefined;
    }
}

function detectTechnologies(html: string, headers: IncomingHttpHeaders) {
    const technologies = new Set<string>();
    const server = (firstHeader(headers, 'server') || '').toLowerCase();
    const poweredBy = (firstHeader(headers, 'x-powered-by') || '').toLowerCase();

    if (server.includes('cloudflare') || firstHeader(headers, 'cf-ray')) technologies.add('Cloudflare');
    if (server.includes('litespeed') || firstHeader(headers, 'x-litespeed-cache')) technologies.add('LiteSpeed');
    if (server.includes('nginx')) technologies.add('nginx');
    if (server.includes('apache')) technologies.add('Apache');
    if (poweredBy.includes('next.js') || /\/_next\/static\//i.test(html)) technologies.add('Next.js');
    if (/\/wp-content\/|\/wp-includes\//i.test(html)) technologies.add('WordPress');
    if (/\/wp-content\/plugins\/woocommerce\/|wc-ajax=/i.test(html)) technologies.add('WooCommerce');
    if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) technologies.add('Shopify');
    if (firstHeader(headers, 'x-vercel-id')) technologies.add('Vercel');
    if (firstHeader(headers, 'x-nf-request-id')) technologies.add('Netlify');
    if (firstHeader(headers, 'x-amz-cf-id')) technologies.add('CloudFront');

    return [...technologies];
}

function wordpressSignals(html: string, finalUrl: URL) {
    const generator = metaContent(html, 'generator');
    const versionMatch = generator?.match(/WordPress\s*([0-9.]+)/i);
    const apiHref = linkHrefByRel(html, 'https://api.w.org/');
    const hasWpContent = /\/wp-content\//i.test(html);
    const hasWpIncludes = /\/wp-includes\//i.test(html);
    const detected = Boolean(
        generator?.toLowerCase().includes('wordpress')
        || hasWpContent
        || hasWpIncludes
        || apiHref
        || /\/wp-json(?:\/|\?|["'])/i.test(html),
    );

    let restApiUrl: string | undefined;
    if (detected) {
        try {
            const candidate = apiHref ? new URL(apiHref, finalUrl) : new URL('/wp-json/', finalUrl);
            if (candidate.origin === finalUrl.origin) restApiUrl = candidate.toString();
        } catch {
            restApiUrl = new URL('/wp-json/', finalUrl).toString();
        }
    }

    return {
        detected,
        version: versionMatch?.[1],
        restApiUrl,
        hasWpContent,
        hasWpIncludes,
    };
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

function cookieSummary(headers: IncomingHttpHeaders, https: boolean) {
    const cookies = headerValues(headers, 'set-cookie');
    if (!cookies.length) return undefined;
    const missingSecure = https ? cookies.filter((cookie) => !/;\s*secure\b/i.test(cookie)).length : 0;
    const missingSameSite = cookies.filter((cookie) => !/;\s*samesite=/i.test(cookie)).length;
    const missingHttpOnly = cookies.filter((cookie) => !/;\s*httponly\b/i.test(cookie)).length;
    return { total: cookies.length, missingSecure, missingSameSite, missingHttpOnly };
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
    const robotsMeta = metaContent(html, 'robots')?.toLowerCase();
    const canonical = canonicalUrl(html);
    const language = htmlLanguage(html);
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    const technologies = detectTechnologies(html, raw.headers);
    const wp = wordpressSignals(html, raw.finalUrl);
    const checks: WebsiteInspectorCheck[] = [];

    const robotsUrl = new URL('/robots.txt', raw.finalUrl);
    const robotsProbe = await optionalProbe(robotsUrl, { accept: 'text/plain,*/*;q=0.2' });
    const declaredSitemap = robotsProbe?.statusCode === 200 ? robotsSitemap(robotsProbe.body, raw.finalUrl) : undefined;
    const sitemapUrl = declaredSitemap ?? new URL('/sitemap.xml', raw.finalUrl);
    const [sitemapProbe, compressionProbe] = await Promise.all([
        optionalProbe(sitemapUrl, { accept: 'application/xml,text/xml,text/plain,*/*;q=0.2' }),
        optionalProbe(raw.finalUrl, { method: 'HEAD', acceptEncoding: 'br, gzip' }),
    ]);
    const wpRestProbe = wp.detected && wp.restApiUrl
        ? await optionalProbe(new URL(wp.restApiUrl), { accept: 'application/json,*/*;q=0.2' })
        : undefined;

    addCheck(checks, {
        id: 'http-status',
        category: 'delivery',
        label: 'HTTP response',
        status: raw.statusCode >= 200 && raw.statusCode < 300 ? 'pass' : raw.statusCode >= 300 && raw.statusCode < 500 ? 'warning' : 'fail',
        summary: `Final response returned HTTP ${raw.statusCode || 'unknown'}.`,
        recommendation: raw.statusCode >= 400 ? 'Resolve the final HTTP error so the public page consistently returns a successful 2xx response.' : undefined,
    });
    addCheck(checks, {
        id: 'content-type',
        category: 'delivery',
        label: 'HTML document',
        status: isHtml ? 'pass' : 'warning',
        summary: isHtml ? `HTML content detected (${contentType.split(';')[0]}).` : `The response is not an HTML document (${contentType || 'unknown content type'}).`,
    });
    addCheck(checks, {
        id: 'redirect-chain',
        category: 'delivery',
        label: 'Redirect chain',
        status: raw.redirects.length <= 1 ? 'pass' : 'warning',
        summary: raw.redirects.length === 0
            ? 'The requested URL reached the final page without redirects.'
            : `${raw.redirects.length} redirect${raw.redirects.length === 1 ? '' : 's'} occurred before the final page.`,
        recommendation: raw.redirects.length > 1 ? 'Collapse unnecessary redirect hops where possible to reduce latency and avoid redirect-chain SEO issues.' : undefined,
    });
    addCheck(checks, {
        id: 'technology-hints',
        category: 'delivery',
        label: 'Technology hints',
        status: 'info',
        summary: technologies.length ? `Observed public signals: ${technologies.join(', ')}.` : 'No reliable framework, CMS, CDN or server technology hints were identified from the public response.',
    });

    const csp = firstHeader(raw.headers, 'content-security-policy');
    const hsts = firstHeader(raw.headers, 'strict-transport-security');
    const nosniff = firstHeader(raw.headers, 'x-content-type-options');
    const frame = firstHeader(raw.headers, 'x-frame-options');
    const referrer = firstHeader(raw.headers, 'referrer-policy');
    const permissions = firstHeader(raw.headers, 'permissions-policy');

    addCheck(checks, {
        id: 'https',
        category: 'security',
        label: 'HTTPS',
        status: raw.finalUrl.protocol === 'https:' ? 'pass' : 'fail',
        summary: raw.finalUrl.protocol === 'https:' ? 'The final page is delivered over HTTPS.' : 'The final page is delivered over unencrypted HTTP.',
        recommendation: raw.finalUrl.protocol !== 'https:' ? 'Serve the site over HTTPS and redirect HTTP traffic to the canonical HTTPS origin.' : undefined,
    });
    addCheck(checks, {
        id: 'tls-session',
        category: 'security',
        label: 'TLS session',
        status: raw.finalUrl.protocol !== 'https:' ? 'fail' : raw.tls?.protocol ? 'pass' : 'info',
        summary: raw.finalUrl.protocol !== 'https:'
            ? 'No TLS session exists because the final page uses HTTP.'
            : raw.tls?.protocol
                ? `${raw.tls.protocol}${raw.tls.cipher ? ` · ${raw.tls.cipher}` : ''}.`
                : 'TLS is in use, but detailed session metadata was not available.',
    });
    if (raw.finalUrl.protocol === 'https:') {
        const days = raw.tls?.daysRemaining;
        addCheck(checks, {
            id: 'tls-certificate',
            category: 'security',
            label: 'TLS certificate',
            status: days === undefined ? 'info' : days <= 0 ? 'fail' : days <= 30 ? 'warning' : 'pass',
            summary: days === undefined
                ? 'Certificate expiry metadata was not available from the TLS socket.'
                : `${raw.tls?.issuer ? `Issuer: ${raw.tls.issuer}. ` : ''}Certificate expires in ${days} day${days === 1 ? '' : 's'}${raw.tls?.validTo ? ` (${raw.tls.validTo})` : ''}.`,
            recommendation: days !== undefined && days <= 30 ? 'Renew or verify automatic renewal before the certificate reaches its expiry date.' : undefined,
        });
    }
    addCheck(checks, {
        id: 'csp',
        category: 'security',
        label: 'Content Security Policy',
        status: csp ? 'pass' : 'warning',
        summary: csp ? 'A Content-Security-Policy header is present.' : 'No Content-Security-Policy header was detected.',
        recommendation: csp ? undefined : 'Deploy a Content-Security-Policy tailored to the site and tighten it gradually after testing required scripts, styles and frames.',
    });
    addCheck(checks, {
        id: 'hsts',
        category: 'security',
        label: 'HSTS',
        status: raw.finalUrl.protocol !== 'https:' ? 'fail' : hsts ? 'pass' : 'warning',
        summary: hsts ? 'Strict-Transport-Security is enabled.' : 'Strict-Transport-Security was not detected.',
        recommendation: raw.finalUrl.protocol === 'https:' && !hsts ? 'Enable HSTS after confirming the whole site and required subdomains work reliably over HTTPS.' : undefined,
    });
    addCheck(checks, {
        id: 'nosniff',
        category: 'security',
        label: 'MIME sniffing protection',
        status: nosniff?.toLowerCase().includes('nosniff') ? 'pass' : 'warning',
        summary: nosniff ? `X-Content-Type-Options: ${nosniff}` : 'X-Content-Type-Options: nosniff was not detected.',
        recommendation: nosniff?.toLowerCase().includes('nosniff') ? undefined : 'Send X-Content-Type-Options: nosniff on public responses.',
    });
    addCheck(checks, {
        id: 'frame-protection',
        category: 'security',
        label: 'Frame protection',
        status: frame || csp?.toLowerCase().includes('frame-ancestors') ? 'pass' : 'warning',
        summary: frame
            ? `X-Frame-Options: ${frame}`
            : csp?.toLowerCase().includes('frame-ancestors')
                ? 'CSP frame-ancestors protection is present.'
                : 'No X-Frame-Options or CSP frame-ancestors directive was detected.',
        recommendation: frame || csp?.toLowerCase().includes('frame-ancestors') ? undefined : 'Define CSP frame-ancestors (preferred) or X-Frame-Options to reduce clickjacking exposure.',
    });

    if (isHtml) {
        const titleStatus = statusForLength(title, 15, 60);
        addCheck(checks, {
            id: 'title',
            category: 'seo',
            label: 'Page title',
            status: titleStatus,
            summary: !title ? 'No <title> element was found.' : titleStatus === 'pass' ? `Title length is ${title.length} characters.` : `Title exists but is ${title.length} characters; roughly 15-60 is a useful target.`,
            recommendation: titleStatus === 'pass' ? undefined : 'Use one descriptive page title that clearly identifies the page and stays concise in search results.',
        });
        const descriptionStatus = statusForLength(description, 50, 160);
        addCheck(checks, {
            id: 'description',
            category: 'seo',
            label: 'Meta description',
            status: descriptionStatus,
            summary: !description ? 'No meta description was found.' : descriptionStatus === 'pass' ? `Description length is ${description.length} characters.` : `Description exists but is ${description.length} characters; roughly 50-160 is a useful target.`,
            recommendation: descriptionStatus === 'pass' ? undefined : 'Write a concise, page-specific meta description that summarizes the page for search and sharing contexts.',
        });
        addCheck(checks, {
            id: 'viewport',
            category: 'seo',
            label: 'Mobile viewport',
            status: viewport ? 'pass' : 'warning',
            summary: viewport ? 'A viewport meta tag is present.' : 'No viewport meta tag was detected.',
            recommendation: viewport ? undefined : 'Add a responsive viewport meta tag so mobile browsers render the page at the intended width.',
        });
        addCheck(checks, {
            id: 'canonical',
            category: 'seo',
            label: 'Canonical URL',
            status: canonical ? 'pass' : 'warning',
            summary: canonical ? `Canonical: ${canonical}` : 'No canonical link was detected.',
            recommendation: canonical ? undefined : 'Add a canonical URL for indexable pages to make the preferred URL explicit.',
        });
        addCheck(checks, {
            id: 'h1',
            category: 'seo',
            label: 'Primary heading',
            status: h1Count === 1 ? 'pass' : 'warning',
            summary: h1Count === 1 ? 'Exactly one H1 heading was detected.' : `${h1Count} H1 headings were detected.`,
            recommendation: h1Count === 1 ? undefined : 'Use a clear primary H1 for the page and keep the heading hierarchy semantically structured.',
        });
        addCheck(checks, {
            id: 'robots-noindex',
            category: 'seo',
            label: 'Indexing directive',
            status: robotsMeta?.includes('noindex') ? 'warning' : 'pass',
            summary: robotsMeta?.includes('noindex') ? 'The page asks search engines not to index it (noindex).' : 'No page-level noindex directive was detected.',
            recommendation: robotsMeta?.includes('noindex') ? 'Confirm noindex is intentional. Remove it if this page should appear in search results.' : undefined,
        });

        const ogTitle = metaContent(html, 'og:title');
        const ogDescription = metaContent(html, 'og:description');
        const ogImage = metaContent(html, 'og:image');
        const ogCount = [ogTitle, ogDescription, ogImage].filter(Boolean).length;
        addCheck(checks, {
            id: 'open-graph',
            category: 'seo',
            label: 'Open Graph preview',
            status: ogCount === 3 ? 'pass' : 'warning',
            summary: ogCount === 3
                ? 'og:title, og:description and og:image are all present.'
                : ogCount > 0
                    ? `${ogCount}/3 core Open Graph fields were detected.`
                    : 'No core Open Graph title, description or image metadata was detected.',
            recommendation: ogCount === 3 ? undefined : 'Provide og:title, og:description and a stable absolute og:image so shared links have predictable previews.',
        });
    }

    const robotsStatus = robotsProbe?.statusCode;
    addCheck(checks, {
        id: 'robots-txt',
        category: 'seo',
        label: 'robots.txt',
        status: robotsStatus === 200 ? 'pass' : robotsStatus === undefined ? 'info' : robotsStatus === 404 ? 'info' : 'warning',
        summary: robotsStatus === 200
            ? `robots.txt is reachable${declaredSitemap ? ' and declares a same-origin sitemap.' : '.'}`
            : robotsStatus === undefined
                ? 'robots.txt could not be confirmed within the bounded probe.'
                : `robots.txt returned HTTP ${robotsStatus}.`,
        recommendation: robotsStatus !== 200 && robotsStatus !== 404 && robotsStatus !== undefined ? 'Check the robots.txt response and make sure crawlers can retrieve the intended directives.' : undefined,
    });
    const sitemapStatus = sitemapProbe?.statusCode;
    const sitemapLooksValid = sitemapStatus === 200 && /<(urlset|sitemapindex)\b/i.test(sitemapProbe?.body ?? '');
    addCheck(checks, {
        id: 'sitemap',
        category: 'seo',
        label: 'XML sitemap',
        status: sitemapLooksValid ? 'pass' : sitemapStatus === undefined ? 'info' : 'warning',
        summary: sitemapLooksValid
            ? `A valid sitemap structure was detected at ${sitemapProbe?.finalUrl.toString()}.`
            : sitemapStatus === undefined
                ? 'A sitemap could not be confirmed within the bounded probe.'
                : sitemapStatus === 200
                    ? 'The sitemap candidate returned HTTP 200 but no urlset/sitemapindex root was detected in the inspected sample.'
                    : `The sitemap candidate returned HTTP ${sitemapStatus}.`,
        recommendation: sitemapLooksValid ? undefined : 'Expose a valid XML sitemap and reference it from robots.txt or the standard /sitemap.xml location.',
    });

    addCheck(checks, {
        id: 'referrer-policy',
        category: 'privacy',
        label: 'Referrer Policy',
        status: referrer ? 'pass' : 'warning',
        summary: referrer ? `Referrer-Policy: ${referrer}` : 'No Referrer-Policy header was detected.',
        recommendation: referrer ? undefined : 'Set an explicit Referrer-Policy such as strict-origin-when-cross-origin unless the site requires a different policy.',
    });
    addCheck(checks, {
        id: 'permissions-policy',
        category: 'privacy',
        label: 'Permissions Policy',
        status: permissions ? 'pass' : 'warning',
        summary: permissions ? 'A Permissions-Policy header is present.' : 'No Permissions-Policy header was detected.',
        recommendation: permissions ? undefined : 'Define a Permissions-Policy that disables browser capabilities the site does not need.',
    });

    if (isHtml) {
        const privacyLink = hasPolicyLink(html, 'privacy');
        const cookieLink = hasPolicyLink(html, 'cookie');
        addCheck(checks, {
            id: 'privacy-link',
            category: 'privacy',
            label: 'Privacy information',
            status: privacyLink ? 'pass' : 'info',
            summary: privacyLink ? 'A privacy/data-protection link was detected on the page.' : 'No obvious privacy-policy link was detected on this page. This is informational, not a compliance verdict.',
        });
        addCheck(checks, {
            id: 'cookie-link',
            category: 'privacy',
            label: 'Cookie information',
            status: cookieLink ? 'pass' : 'info',
            summary: cookieLink ? 'A cookie-related link was detected on the page.' : 'No obvious cookie-policy link was detected on this page. This is informational, not a compliance verdict.',
        });
    }

    const cookieFlags = cookieSummary(raw.headers, raw.finalUrl.protocol === 'https:');
    addCheck(checks, {
        id: 'cookie-flags',
        category: 'privacy',
        label: 'Response cookie flags',
        status: !cookieFlags ? 'info' : cookieFlags.missingSecure || cookieFlags.missingSameSite ? 'warning' : 'pass',
        summary: !cookieFlags
            ? 'The inspected response did not set cookies.'
            : `${cookieFlags.total} response cookie${cookieFlags.total === 1 ? '' : 's'} observed; ${cookieFlags.missingSecure} missing Secure, ${cookieFlags.missingSameSite} missing SameSite, ${cookieFlags.missingHttpOnly} missing HttpOnly.`,
        recommendation: cookieFlags && (cookieFlags.missingSecure || cookieFlags.missingSameSite)
            ? 'Review Set-Cookie attributes. Use Secure on HTTPS cookies and choose an intentional SameSite policy; add HttpOnly when client-side JavaScript does not need access.'
            : undefined,
    });

    addCheck(checks, {
        id: 'response-time',
        category: 'performance',
        label: 'Server response',
        status: raw.responseTimeMs <= 1_000 ? 'pass' : 'warning',
        summary: `The inspected request completed in ${raw.responseTimeMs} ms. This is a single server-side sample, not a Core Web Vitals measurement.`,
        recommendation: raw.responseTimeMs > 1_000 ? 'Investigate origin response time, application work, database calls and cache/CDN behavior before optimizing front-end rendering.' : undefined,
    });
    addCheck(checks, {
        id: 'document-size',
        category: 'performance',
        label: 'HTML transfer sample',
        status: raw.truncated ? 'warning' : raw.capturedBytes <= 200 * 1024 ? 'pass' : 'warning',
        summary: raw.truncated ? 'The HTML exceeded the 512 KB inspection cap; only the first 512 KB were analyzed.' : `${Math.max(1, Math.round(raw.capturedBytes / 1024))} KB of response body was inspected.`,
        recommendation: raw.truncated || raw.capturedBytes > 200 * 1024 ? 'Reduce unnecessary server-rendered markup and repeated inline data where practical.' : undefined,
    });

    const cacheControl = firstHeader(raw.headers, 'cache-control');
    const etag = firstHeader(raw.headers, 'etag');
    const lastModified = firstHeader(raw.headers, 'last-modified');
    addCheck(checks, {
        id: 'cache-policy',
        category: 'performance',
        label: 'Cache policy',
        status: cacheControl || etag || lastModified ? 'pass' : 'warning',
        summary: cacheControl
            ? `Cache-Control: ${cacheControl}`
            : etag || lastModified
                ? `No Cache-Control header; validator observed: ${etag ? 'ETag' : 'Last-Modified'}.`
                : 'No Cache-Control, ETag or Last-Modified signal was observed.',
        recommendation: cacheControl || etag || lastModified ? undefined : 'Define an intentional cache strategy for public responses and static assets instead of relying on implicit defaults.',
    });

    const encoding = compressionProbe ? firstHeader(compressionProbe.headers, 'content-encoding') : undefined;
    addCheck(checks, {
        id: 'compression',
        category: 'performance',
        label: 'Compression signal',
        status: encoding ? 'pass' : 'info',
        summary: encoding
            ? `The bounded HEAD negotiation observed Content-Encoding: ${encoding}.`
            : 'No compression header was observed during the lightweight HEAD negotiation. This is informational because HEAD behavior can differ from GET responses.',
    });

    addCheck(checks, {
        id: 'wordpress-detection',
        category: 'wordpress',
        label: 'WordPress detection',
        status: 'info',
        summary: wp.detected
            ? 'WordPress was detected from public HTML metadata, asset paths or REST discovery signals.'
            : 'No reliable WordPress signal was detected on the inspected page.',
    });

    if (wp.detected) {
        addCheck(checks, {
            id: 'wordpress-version',
            category: 'wordpress',
            label: 'Core version exposure',
            status: wp.version ? 'warning' : 'pass',
            summary: wp.version ? `The page publicly exposes WordPress ${wp.version}.` : 'No WordPress core version was identified in the inspected HTML metadata.',
            recommendation: wp.version ? 'Remove unnecessary WordPress generator/version disclosure where practical. This reduces passive fingerprinting but does not replace timely core updates.' : undefined,
        });
        addCheck(checks, {
            id: 'wordpress-rest',
            category: 'wordpress',
            label: 'REST API',
            status: 'info',
            summary: wpRestProbe
                ? `The same-origin WordPress REST endpoint returned HTTP ${wpRestProbe.statusCode}. Public REST availability is normal and is not treated as a vulnerability.`
                : 'A same-origin WordPress REST endpoint was not confirmed within the bounded probe.',
        });
        addCheck(checks, {
            id: 'wordpress-assets',
            category: 'wordpress',
            label: 'Public core paths',
            status: 'info',
            summary: `${wp.hasWpContent ? 'wp-content detected' : 'wp-content not observed'} · ${wp.hasWpIncludes ? 'wp-includes detected' : 'wp-includes not observed'}. These paths are normal public WordPress signals.`,
        });
    }

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
            redirectCount: raw.redirects.length,
            technologies,
            tls: raw.tls,
            wordpress: {
                detected: wp.detected,
                version: wp.version,
                restApiUrl: wp.restApiUrl,
            },
        },
        checks,
    };
}
