import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

function client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${required(accountId, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(accessKeyId, 'R2_ACCESS_KEY_ID'),
            secretAccessKey: required(secretAccessKey, 'R2_SECRET_ACCESS_KEY'),
        },
    });
}

export function r2MediaStorageConfigured() {
    return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBaseUrl);
}

export function mediaStorageConfigured() {
    // Local public/uploads storage is always available as a fallback on a writable deployment.
    return true;
}

export function mediaStorageBackend() {
    return r2MediaStorageConfigured() ? 'r2' as const : 'local' as const;
}

function safeLocalPath(key: string) {
    const publicRoot = resolve(process.cwd(), 'public');
    const relative = normalize(key).replace(/^([/\\])+/, '');
    const target = resolve(publicRoot, relative);
    if (!target.startsWith(`${publicRoot}/`) && target !== publicRoot) throw new Error('Invalid media storage path.');
    return target;
}

export async function uploadMediaFile(file: File, key: string) {
    const body = Buffer.from(await file.arrayBuffer());

    if (r2MediaStorageConfigured()) {
        await client().send(new PutObjectCommand({
            Bucket: required(bucket, 'R2_BUCKET'),
            Key: key,
            Body: body,
            ContentType: file.type || 'application/octet-stream',
            CacheControl: 'public, max-age=31536000, immutable',
        }));

        return {
            url: `${required(publicBaseUrl, 'R2_PUBLIC_BASE_URL').replace(/\/$/, '')}/${encodeURI(key)}`,
            key,
            backend: 'r2' as const,
        };
    }

    const localKey = key.replace(/^media\//, 'uploads/');
    const target = safeLocalPath(localKey);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);

    return {
        url: `/${localKey.split('/').map(encodeURIComponent).join('/')}`,
        key: localKey,
        backend: 'local' as const,
    };
}

export async function deleteMediaFile(key: string) {
    if (key.startsWith('uploads/')) {
        await rm(safeLocalPath(key), { force: true });
        return;
    }

    if (!r2MediaStorageConfigured()) throw new Error('R2 storage is not configured for this managed object.');
    await client().send(new DeleteObjectCommand({
        Bucket: required(bucket, 'R2_BUCKET'),
        Key: key,
    }));
}

export function isManagedMediaKey(key: string) {
    return key.startsWith('media/') || key.startsWith('uploads/');
}

export function managedMediaBackend(key: string) {
    if (key.startsWith('uploads/')) return 'Local';
    if (key.startsWith('media/')) return 'R2';
    return 'External';
}
