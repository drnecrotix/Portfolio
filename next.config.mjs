import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const useN0cWasmSwc = process.env.NEXT_N0C_WASM_SWC === '1';
const buildDistDir = process.env.NEXT_DIST_DIR?.trim() || '.next';
const publicAssetCacheHeader = { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' };
const publicAssetExtensions = ['ico', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'woff', 'woff2'];
const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com https://www.facebook.com https://platform.twitter.com https://assets.pinterest.com https://www.dailymotion.com",
    'upgrade-insecure-requests',
].join('; ');
const securityHeaders = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: buildDistDir,
    reactStrictMode: true,
    transpilePackages: ['three'],
    experimental: {
        ...(useN0cWasmSwc
            ? {
                  useWasmBinary: true,
                  cpus: 1,
                  webpackBuildWorker: true,
                  webpackMemoryOptimizations: true,
              }
            : {}),
        serverActions: {
            bodySizeLimit: '12mb',
        },
        proxyClientMaxBodySize: '12mb',
    },
    ...(useN0cWasmSwc
        ? {
              webpack(config) {
                  config.cache = false;
                  return config;
              },
          }
        : {}),
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
            {
                source: '/admin/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
                ],
            },
            {
                source: '/api/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            ...publicAssetExtensions.map((extension) => ({
                source: `/:path*.${extension}`,
                headers: [publicAssetCacheHeader],
            })),
        ];
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'assets.aceternity.com' },
            { protocol: 'https', hostname: 'i.ytimg.com' },
            { protocol: 'https', hostname: '**.vimeocdn.com' },
            { protocol: 'https', hostname: '**.tiktokcdn.com' },
            { protocol: 'https', hostname: '**.tiktokcdn-us.com' },
            { protocol: 'https', hostname: '**.cdninstagram.com' },
            { protocol: 'https', hostname: '**.fbcdn.net' },
            { protocol: 'https', hostname: 'pbs.twimg.com' },
            { protocol: 'https', hostname: '**.pinimg.com' },
            { protocol: 'https', hostname: '**.dmcdn.net' },
        ],
        formats: ['image/avif', 'image/webp'],
    },
};

export default withNextIntl(nextConfig);
