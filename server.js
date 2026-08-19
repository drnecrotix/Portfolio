/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const http = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

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
