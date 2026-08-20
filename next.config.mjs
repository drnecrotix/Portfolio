import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['three'],
    experimental: {
        // N0C/CloudLinux ships an older glibc than the native Next.js SWC binary requires.
        // Prefer the matching WASM SWC package so production builds remain portable.
        useWasmBinary: true,
        serverActions: {
            // Media uploads allow files up to 10 MB. Leave headroom for multipart form overhead.
            bodySizeLimit: '12mb',
        },
        // Proxy still sees admin Server Action requests before the route handles them.
        proxyClientMaxBodySize: '12mb',
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'assets.aceternity.com' },
        ],
        formats: ['image/avif', 'image/webp'],
    },
};

export default withNextIntl(nextConfig);
