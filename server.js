/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(__dirname, false);
process.chdir(__dirname);

const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const publicUrl = process.env.SITE_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || null;
const app = next({ dev, port, dir: __dirname });
const handle = app.getRequestHandler();

const uploadsHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [R=404,L]
</IfModule>

<IfModule mod_autoindex.c>
IndexIgnore *
</IfModule>

<IfModule mod_headers.c>
Header always set X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex"
Header always set X-Content-Type-Options "nosniff"
</IfModule>
`;
const uploadsIndex = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive,noimageindex"><title>Not found</title></head><body></body></html>\n';

function hardenLocalUploads() {
  const uploadsRoot = path.join(__dirname, 'public', 'uploads');
  fs.mkdirSync(uploadsRoot, { recursive: true });
  fs.writeFileSync(path.join(uploadsRoot, '.htaccess'), uploadsHtaccess, 'utf8');
  // Keep Passenger cold starts bounded. The root .htaccess applies below this
  // directory, while newly written subdirectories receive their own fallback
  // index file from media-storage.
  fs.writeFileSync(path.join(uploadsRoot, 'index.html'), uploadsIndex, 'utf8');
}

if (!dev) {
  try {
    hardenLocalUploads();
  } catch (error) {
    console.warn('[uploads] Could not apply local directory-listing protection:', error instanceof Error ? error.message : error);
  }
}

app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      if (!dev) {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname.endsWith('.map')) {
          res.statusCode = 404;
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end('Not Found');
          return;
        }
      }

      if (!dev && publicUrl) {
        const canonicalUrl = new URL(publicUrl);
        req.headers.host = canonicalUrl.host;
        req.headers['x-forwarded-host'] = canonicalUrl.host;
        req.headers['x-forwarded-proto'] = canonicalUrl.protocol.replace(':', '');
      }

      handle(req, res);
    });

    server.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      process.exitCode = 1;
    });

    server.listen(port, () => {
      console.log(`Portfolio ready on port ${port} (${dev ? 'development' : 'production'})`);
    });
  })
  .catch((error) => {
    console.error('Failed to prepare Next.js application:', error);
    process.exit(1);
  });
