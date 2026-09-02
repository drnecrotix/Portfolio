import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve } from 'node:path';
import { getRuntimeR2Config } from '@/lib/integration-runtime';

type R2Config = Awaited<ReturnType<typeof getRuntimeR2Config>>;

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

function configured(config: R2Config) {
    return Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucket && config.publicBaseUrl);
}

function client(config: R2Config) {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${required(config.accountId, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(config.accessKeyId, 'R2_ACCESS_KEY_ID'),
            secretAccessKey: required(config.secretAccessKey, 'R2_SECRET_ACCESS_KEY'),
        },
    });
}

export async function r2MediaStorageConfigured() {
    return configured(await getRuntimeR2Config());
}

export function mediaStorageConfigured() {
    // Local public/uploads storage is always available as a fallback on a writable deployment.
    return true;
}

export async function mediaStorageBackend() {
    return await r2MediaStorageConfigured() ? 'r2' as const : 'local' as const;
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
    const config = await getRuntimeR2Config();

    if (configured(config)) {
        const s3 = client(config);
        try {
            await s3.send(new PutObjectCommand({
                Bucket: required(config.bucket, 'R2_BUCKET'),
                Key: key,
                Body: body,
                ContentType: file.type || 'application/octet-stream',
                CacheControl: 'public, max-age=31536000, immutable',
            }));
        } finally {
            s3.destroy();
        }

        return {
            url: `${required(config.publicBaseUrl, 'R2_PUBLIC_BASE_URL').replace(/\/$/, '')}/${encodeURI(key)}`,
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

    const config = await getRuntimeR2Config();
    if (!configured(config)) throw new Error('R2 storage is not configured for this managed object.');
    const s3 = client(config);
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: required(config.bucket, 'R2_BUCKET'),
            Key: key,
        }));
    } finally {
        s3.destroy();
    }
}

export function isManagedMediaKey(key: string) {
    return key.startsWith('media/') || key.startsWith('uploads/');
}

export function managedMediaBackend(key: string) {
    if (key.startsWith('uploads/')) return 'Local';
    if (key.startsWith('media/')) return 'R2';
    return 'External';
}
