import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const useN0cWasmSwc = process.env.NEXT_N0C_WASM_SWC === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['three'],
    experimental: {
        // N0C/CloudLinux ships an older glibc than the native Next.js SWC binary requires.
        // Keep its webpack build deliberately low-concurrency and memory-conscious.
        ...(useN0cWasmSwc
            ? {
                  useWasmBinary: true,
                  cpus: 1,
                  webpackBuildWorker: true,
                  webpackMemoryOptimizations: true,
              }
            : {}),
        serverActions: {
            // Media uploads allow files up to 10 MB. Leave headroom for multipart form overhead.
            bodySizeLimit: '12mb',
        },
        // Proxy still sees admin Server Action requests before the route handles them.
        proxyClientMaxBodySize: '12mb',
    },
    // Webpack's filesystem cache can noticeably increase peak memory on constrained shared hosting.
    // Disable it only for the N0C compatibility build; normal development/CI keeps Next defaults.
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
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/:path*.(?:ico|svg|png|jpg|jpeg|gif|webp|avif|woff|woff2)',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
                ],
            },
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
