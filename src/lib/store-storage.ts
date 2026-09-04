import 'server-only';

import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getRuntimeR2Config } from '@/lib/integration-runtime';

const MAX_DIGITAL_FILE_BYTES = 250 * 1024 * 1024;
const STORE_KEY_PREFIX = 'store/products/';
const EXTERNAL_KEY_PREFIX = 'external:';

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

function localRoot() {
    const configured = String(process.env.STORE_PRIVATE_STORAGE_PATH ?? '').trim();
    const root = path.resolve(configured || path.join(process.cwd(), 'storage', 'store-private'));
    const publicRoot = path.resolve(process.cwd(), 'public');
    if (root === publicRoot || root.startsWith(`${publicRoot}${path.sep}`)) {
        throw new Error('STORE_PRIVATE_STORAGE_PATH must be outside the public directory.');
    }
    return root;
}

function isPrivateIpv4(hostname: string) {
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10
        || parts[0] === 127
        || (parts[0] === 169 && parts[1] === 254)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
        || (parts[0] === 192 && parts[1] === 168)
        || parts[0] === 0;
}

export function normalizeExternalDigitalProductUrl(raw: string) {
    let parsed: URL;
    try {
        parsed = new URL(raw.trim());
    } catch {
        throw new Error('External file URL must be a valid HTTPS URL.');
    }
    if (parsed.protocol !== 'https:') throw new Error('External file URL must use HTTPS.');
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateIpv4(hostname) || hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:')) {
        throw new Error('External file URL cannot target localhost or a private network address.');
    }
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
}

export function externalDigitalProductStorageKey(rawUrl: string) {
    const url = normalizeExternalDigitalProductUrl(rawUrl);
    return `${EXTERNAL_KEY_PREFIX}${Buffer.from(url, 'utf8').toString('base64url')}`;
}

export function isExternalDigitalProductStorageKey(storageKey: string) {
    return storageKey.startsWith(EXTERNAL_KEY_PREFIX);
}

function externalDigitalProductUrl(storageKey: string) {
    if (!isExternalDigitalProductStorageKey(storageKey)) throw new Error('Invalid external digital product storage key.');
    try {
        const encoded = storageKey.slice(EXTERNAL_KEY_PREFIX.length);
        return normalizeExternalDigitalProductUrl(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Invalid external digital product storage key.');
    }
}

function validStoreKey(storageKey: string) {
    if (!storageKey.startsWith(STORE_KEY_PREFIX)) throw new Error('Invalid digital product storage key.');
    if (storageKey.includes('..') || storageKey.includes('\\')) throw new Error('Invalid digital product storage key.');
}

function localPath(storageKey: string) {
    validStoreKey(storageKey);
    const root = localRoot();
    const resolved = path.resolve(root, storageKey);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid digital product storage key.');
    return resolved;
}

async function r2Config() {
    const value = await getRuntimeR2Config();
    if (!value.accountId || !value.accessKeyId || !value.secretAccessKey || !value.storeBucket) {
        throw new Error('Cloudflare R2 private Store bucket is not configured.');
    }
    return value;
}

function r2Client(value: Awaited<ReturnType<typeof r2Config>>) {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${required(value.accountId, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(value.accessKeyId, 'R2_ACCESS_KEY_ID'),
            secretAccessKey: required(value.secretAccessKey, 'R2_SECRET_ACCESS_KEY'),
        },
    });
}

async function localFileExists(storageKey: string) {
    try {
        const info = await stat(localPath(storageKey));
        return info.isFile();
    } catch {
        return false;
    }
}

async function readFromR2(storageKey: string) {
    const runtime = await r2Config();
    const s3 = r2Client(runtime);
    try {
        const result = await s3.send(new GetObjectCommand({
            Bucket: required(runtime.storeBucket, 'R2_STORE_BUCKET'),
            Key: storageKey,
        }));
        if (!result.Body) throw new Error('Digital product file is unavailable.');
        return {
            bytes: await result.Body.transformToByteArray(),
            contentType: result.ContentType || 'application/octet-stream',
        };
    } finally {
        s3.destroy();
    }
}

export async function fetchExternalDigitalProduct(storageKey: string) {
    let url = externalDigitalProductUrl(storageKey);
    for (let hop = 0; hop < 5; hop += 1) {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'manual',
            cache: 'no-store',
            headers: { 'User-Agent': 'NecrotixLab-Store-Delivery/1.0', Accept: '*/*' },
            signal: AbortSignal.timeout(30_000),
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            if (!location) throw new Error('External file redirect is missing a destination.');
            url = normalizeExternalDigitalProductUrl(new URL(location, url).toString());
            continue;
        }
        if (!response.ok || !response.body) throw new Error(`External file source returned HTTP ${response.status}.`);
        return response;
    }
    throw new Error('External file source redirected too many times.');
}

export function validateDigitalProductFile(file: File) {
    if (!file.name.trim()) throw new Error('Digital product file name is required.');
    if (!file.size) throw new Error('Digital product file is empty.');
    if (file.size > MAX_DIGITAL_FILE_BYTES) throw new Error('Digital product files are limited to 250 MB each.');
}

export async function getLocalStoreStorageStatus() {
    try {
        const root = localRoot();
        await mkdir(root, { recursive: true, mode: 0o700 });
        await access(root, constants.R_OK | constants.W_OK);
        return { ready: true, label: 'Necrotix Lab local private storage' };
    } catch (error) {
        console.error('[Store] Local private storage is unavailable:', error);
        return {
            ready: false,
            label: null,
            error: error instanceof Error ? error.message : 'Local private storage is unavailable.',
        };
    }
}

export async function uploadDigitalProductFile(productId: string, file: File, storageKey: string) {
    validateDigitalProductFile(file);
    validStoreKey(storageKey);
    const target = localPath(storageKey);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, Buffer.from(await file.arrayBuffer()), { flag: 'wx', mode: 0o600 });
    void productId;
}

export async function readDigitalProductFile(storageKey: string) {
    if (isExternalDigitalProductStorageKey(storageKey)) throw new Error('External digital product files must use streamed delivery.');
    validStoreKey(storageKey);

    if (await localFileExists(storageKey)) {
        const bytes = await readFile(localPath(storageKey));
        return { bytes: new Uint8Array(bytes), contentType: '' };
    }

    return readFromR2(storageKey);
}

export async function deleteDigitalProductFile(storageKey: string) {
    if (isExternalDigitalProductStorageKey(storageKey)) return;
    validStoreKey(storageKey);

    if (await localFileExists(storageKey)) {
        await rm(localPath(storageKey), { force: true });
        return;
    }

    const runtime = await r2Config();
    const s3 = r2Client(runtime);
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: required(runtime.storeBucket, 'R2_STORE_BUCKET'), Key: storageKey }));
    } finally {
        s3.destroy();
    }
}

export async function uploadDigitalProductFileToR2(productId: string, file: File, storageKey: string) {
    validateDigitalProductFile(file);
    validStoreKey(storageKey);
    const runtime = await r2Config();
    const s3 = r2Client(runtime);
    try {
        await s3.send(new PutObjectCommand({
            Bucket: required(runtime.storeBucket, 'R2_STORE_BUCKET'),
            Key: storageKey,
            Body: Buffer.from(await file.arrayBuffer()),
            ContentType: file.type || 'application/octet-stream',
            CacheControl: 'private, no-store',
            Metadata: { productId },
        }));
    } finally {
        s3.destroy();
    }
}
