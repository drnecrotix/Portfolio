import 'server-only';

import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getRuntimeR2Config } from '@/lib/integration-runtime';

const MAX_DIGITAL_FILE_BYTES = 250 * 1024 * 1024;
const STORE_KEY_PREFIX = 'store/products/';

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

    // Keep productId in the signature for storage-provider parity and future shared-storage migration.
    void productId;
}

export async function readDigitalProductFile(storageKey: string) {
    validStoreKey(storageKey);

    if (await localFileExists(storageKey)) {
        const bytes = await readFile(localPath(storageKey));
        return { bytes: new Uint8Array(bytes), contentType: '' };
    }

    // Backward compatibility: Store files created before local storage was enabled may still live in R2.
    return readFromR2(storageKey);
}

export async function deleteDigitalProductFile(storageKey: string) {
    validStoreKey(storageKey);

    if (await localFileExists(storageKey)) {
        await rm(localPath(storageKey), { force: true });
        return;
    }

    // Backward compatibility for existing R2-backed product files.
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
