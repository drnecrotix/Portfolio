import 'server-only';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getRuntimeR2Config } from '@/lib/integration-runtime';

const MAX_DIGITAL_FILE_BYTES = 250 * 1024 * 1024;

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

async function config() {
    const value = await getRuntimeR2Config();
    if (!value.accountId || !value.accessKeyId || !value.secretAccessKey || !value.storeBucket) {
        throw new Error('Cloudflare R2 private Store bucket must be configured before digital product files can be managed.');
    }
    return value;
}

function client(value: Awaited<ReturnType<typeof config>>) {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${required(value.accountId, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(value.accessKeyId, 'R2_ACCESS_KEY_ID'),
            secretAccessKey: required(value.secretAccessKey, 'R2_SECRET_ACCESS_KEY'),
        },
    });
}

function validStoreKey(storageKey: string) {
    if (!storageKey.startsWith('store/products/')) throw new Error('Invalid digital product storage key.');
}

export function validateDigitalProductFile(file: File) {
    if (!file.name.trim()) throw new Error('Digital product file name is required.');
    if (!file.size) throw new Error('Digital product file is empty.');
    if (file.size > MAX_DIGITAL_FILE_BYTES) throw new Error('Digital product files are limited to 250 MB each.');
}

export async function uploadDigitalProductFile(productId: string, file: File, storageKey: string) {
    validateDigitalProductFile(file);
    validStoreKey(storageKey);
    const runtime = await config();
    const s3 = client(runtime);
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

export async function readDigitalProductFile(storageKey: string) {
    validStoreKey(storageKey);
    const runtime = await config();
    const s3 = client(runtime);
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

export async function deleteDigitalProductFile(storageKey: string) {
    validStoreKey(storageKey);
    const runtime = await config();
    const s3 = client(runtime);
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: required(runtime.storeBucket, 'R2_STORE_BUCKET'), Key: storageKey }));
    } finally {
        s3.destroy();
    }
}
