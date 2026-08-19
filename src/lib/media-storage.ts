import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

function required(value: string | undefined, name: string) {
    if (!value) throw new Error(`${name} is not configured.`);
    return value;
}

export function mediaStorageConfigured() {
    return Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBaseUrl);
}

export async function uploadMediaFile(file: File, key: string) {
    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${required(accountId, 'R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(accessKeyId, 'R2_ACCESS_KEY_ID'),
            secretAccessKey: required(secretAccessKey, 'R2_SECRET_ACCESS_KEY'),
        },
    });

    const body = Buffer.from(await file.arrayBuffer());
    await client.send(new PutObjectCommand({
        Bucket: required(bucket, 'R2_BUCKET'),
        Key: key,
        Body: body,
        ContentType: file.type || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `${required(publicBaseUrl, 'R2_PUBLIC_BASE_URL').replace(/\/$/, '')}/${encodeURI(key)}`;
}
