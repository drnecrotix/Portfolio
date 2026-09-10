import 'server-only';

import { lookup as dnsLookup } from 'node:dns';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

export class WebHealthError extends Error {
    constructor(message: string, public readonly status = 400) {
        super(message);
        this.name = 'WebHealthError';
    }
}

export type SafeRedirectHop = {
    from: string;
    statusCode: number;
    to: string;
};

export type PublicPageResponse = {
    finalUrl: URL;
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: string;
    capturedBytes: number;
    truncated: boolean;
    responseTimeMs: number;
    redirects: SafeRedirectHop[];
};

type RequestOptions = {
    maxBodyBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
    method?: 'GET' | 'HEAD';
    accept?: string;
    allowedOrigin?: string;
};

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

export function validatePublicTarget(url: URL) {
    if (!['http:', 'https:'].includes(url.protocol)) throw new WebHealthError('Only public HTTP and HTTPS websites are supported.');
    if (url.username || url.password) throw new WebHealthError('URLs containing embedded credentials are not supported.');
    const defaultPort = url.protocol === 'https:' ? '443' : '80';
    if (url.port && url.port !== defaultPort) throw new WebHealthError('Only standard HTTP and HTTPS ports are supported.');

    const hostname = normalizedHostname(url);
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        throw new WebHealthError('Private or local network targets are not allowed.');
    }
    if (isIP(hostname) && isBlockedIp(hostname)) throw new WebHealthError('Private, loopback, link-local and reserved IP ranges are not allowed.');
}

export function normalizePublicUrl(input: string) {
    const raw = input.trim();
    if (!raw) throw new WebHealthError('Enter a website URL.');
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        throw new WebHealthError('Enter a valid public website URL.');
    }
    url.hash = '';
    validatePublicTarget(url);
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

export async function requestPublicPage(initialUrl: URL, options: RequestOptions = {}): Promise<PublicPageResponse> {
    const maxBodyBytes = options.maxBodyBytes ?? 384 * 1024;
    const timeoutMs = options.timeoutMs ?? 6_000;
    const maxRedirects = options.maxRedirects ?? 3;
    const method = options.method ?? 'GET';
    const startedAt = Date.now();

    async function follow(url: URL, redirects: SafeRedirectHop[]): Promise<PublicPageResponse> {
        validatePublicTarget(url);
        if (options.allowedOrigin && url.origin !== options.allowedOrigin) throw new WebHealthError('Cross-origin crawl redirects are not followed.', 422);
        if (redirects.length > maxRedirects) throw new WebHealthError('The website redirected too many times.', 422);

        return new Promise<PublicPageResponse>((resolve, reject) => {
            const requester = url.protocol === 'https:' ? httpsRequest : httpRequest;
            let settled = false;
            const chunks: Buffer[] = [];
            let capturedBytes = 0;
            let truncated = false;

            const req = requester(url, {
                method,
                lookup: safeLookup,
                autoSelectFamily: false,
                headers: {
                    Accept: options.accept ?? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2',
                    'Accept-Encoding': 'identity',
                    'User-Agent': 'NecrotixLab-Web-Health/1.0 (+https://necrotixlab.com/lab)',
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
                        settled = true;
                        reject(new WebHealthError('The website returned an invalid redirect.', 422));
                        return;
                    }
                    validatePublicTarget(next);
                    if (options.allowedOrigin && next.origin !== options.allowedOrigin) {
                        settled = true;
                        reject(new WebHealthError('Cross-origin crawl redirects are not followed.', 422));
                        return;
                    }
                    if (redirects.length >= maxRedirects) {
                        settled = true;
                        reject(new WebHealthError('The website redirected too many times.', 422));
                        return;
                    }
                    settled = true;
                    resolve(follow(next, [...redirects, { from: url.toString(), statusCode, to: next.toString() }]));
                    return;
                }

                if (method === 'HEAD') {
                    settled = true;
                    response.resume();
                    resolve({ finalUrl: url, statusCode, headers: response.headers, body: '', capturedBytes: 0, truncated: false, responseTimeMs: Date.now() - startedAt, redirects });
                    return;
                }

                response.on('data', (chunk: Buffer | string) => {
                    if (settled) return;
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    const remaining = maxBodyBytes - capturedBytes;
                    if (remaining > 0) {
                        const slice = buffer.subarray(0, remaining);
                        chunks.push(slice);
                        capturedBytes += slice.length;
                    }
                    if (buffer.length > remaining || capturedBytes >= maxBodyBytes) {
                        truncated = true;
                        settled = true;
                        resolve({ finalUrl: url, statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8'), capturedBytes, truncated, responseTimeMs: Date.now() - startedAt, redirects });
                        response.destroy();
                    }
                });

                response.on('end', () => {
                    if (settled) return;
                    settled = true;
                    resolve({ finalUrl: url, statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8'), capturedBytes, truncated, responseTimeMs: Date.now() - startedAt, redirects });
                });

                response.on('error', (error) => {
                    if (settled) return;
                    settled = true;
                    reject(error);
                });
            });

            req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out.')));
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
        if (error instanceof WebHealthError) throw error;
        const message = error instanceof Error ? error.message : 'The website could not be reached.';
        throw new WebHealthError(`Unable to inspect this website: ${message}`, 422);
    }
}
