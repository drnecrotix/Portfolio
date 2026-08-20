/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const http = require('http');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(__dirname, false);
process.chdir(__dirname);

const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const publicUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || null;
const app = next({ dev, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
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
