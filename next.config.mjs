import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const useN0cBuildTuning = process.env.NEXT_N0C_WASM_SWC === '1';
const buildDistDir = process.env.NEXT_DIST_DIR?.trim() || '.next';
const isStagedUpdaterBuild = buildDistDir === '.next-update';
const publicAssetCacheHeader = { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' };
const publicAssetExtensions = ['ico', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'woff', 'woff2'];

const sharedSecurityHeaders = [
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: buildDistDir,
    reactStrictMode: true,
    poweredByHeader: false,
    productionBrowserSourceMaps: false,
    transpilePackages: ['three'],
    // The self-updater builds into .next-update while the live .next tree stays in
    // place. Older deployments can therefore still contain stale generated route
    // types for files that were removed by the incoming release. GitHub CI performs
    // the authoritative TypeScript check before merge, so only the staged updater
    // build skips Next's duplicate type-check pass.
    typescript: {
        ignoreBuildErrors: isStagedUpdaterBuild,
    },
    experimental: {
        ...(useN0cBuildTuning
            ? {
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
    ...(useN0cBuildTuning
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
                headers: sharedSecurityHeaders,
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
                source: '/service/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
                    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
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
            { protocol: 'https', hostname: '**.tiktokcdn-eu.com' },
            { protocol: 'https', hostname: '**.cdninstagram.com' },
            { protocol: 'https', hostname: '**.fbcdn.net' },
            { protocol: 'https', hostname: '**.twimg.com' },
            { protocol: 'https', hostname: '**.pinimg.com' },
            { protocol: 'https', hostname: '**.dmcdn.net' },
        ],
        formats: ['image/avif', 'image/webp'],
    },
};

export default withNextIntl(nextConfig);
