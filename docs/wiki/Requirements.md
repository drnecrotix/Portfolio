# Requirements

This page describes the practical requirements for running the Portfolio application.

## Runtime

Recommended production baseline:

- Node.js 22.x, matching the current CI environment.
- npm 10.x or compatible.
- PostgreSQL 14+; PostgreSQL 16 is used by CI.
- A hosting environment that can run a persistent Node.js application.
- HTTPS in production.
- Git for normal deployment/update workflows.

Shared hosting must explicitly support Node.js applications. PHP-only hosting is not sufficient.

## Application stack

The project uses:

- Next.js
- React
- Prisma ORM
- PostgreSQL
- authenticated Admin access
- server-side routes/actions
- Media Library storage
- GitHub-based release/update workflow

Because the application contains server routes and database access, it is not a simple static site.

## Production environment variables

The exact set depends on enabled integrations, but production should at minimum verify:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&connection_limit=1&pool_timeout=20
AUTH_SECRET=replace-with-a-long-random-secret
```

Additional variables may be required for external storage, AI services, email or other integrations enabled in the installation.

### DATABASE_URL

For shared hosting/Passenger environments, this project has previously required conservative Prisma connection settings:

```text
connection_limit=1&pool_timeout=20
```

This reduces the chance that several Passenger Node processes exhaust a small PostgreSQL connection allowance.

Do not copy these numbers blindly to a large dedicated server; tune them according to the database and process limits.

## Server resources

A practical minimum for a small deployment is approximately:

- 1–2 CPU cores
- 1 GB RAM minimum; 2 GB+ is preferable for builds
- sufficient temporary disk space for `node_modules` and `.next`
- persistent storage for uploaded files if local storage is used

Building Next.js usually needs more memory than simply running an already-built application. Shared hosting with aggressive memory limits may fail during build even when runtime traffic would be light.

## Database

PostgreSQL must be reachable from the Node runtime, not merely from an interactive SSH shell.

Before deployment verify:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Production schema changes should be applied with:

```bash
npx prisma migrate deploy
```

Do not use `prisma migrate dev` in production.

## Reverse proxy / application server

Supported patterns include:

- Passenger-managed Node application on N0C/PlanetHoster.
- cPanel Application Manager / Setup Node.js App.
- Direct Node.js process behind Nginx, Apache or Caddy.
- A process manager such as systemd or PM2 on a self-managed server.

The reverse proxy must forward requests to the Node application instead of rewriting application routes to unrelated PHP/static handlers.

## Domain and TLS

Production should use:

- a real domain or subdomain;
- HTTPS;
- correct `NEXT_PUBLIC_SITE_URL`;
- proxy headers that preserve the original host/protocol where required.

Wrong public-site URLs can lead to incorrect canonical, Open Graph, X/Twitter and authentication URLs.

## Build checks before production

A release should pass:

```bash
npm run typecheck
npm run lint
npm run build
```

On the N0C environment, use the repository compatibility build when native SWC is unavailable:

```bash
npm run build:n0c
```

CI should also pass Prisma migration checks and visual smoke tests.

## Browser support

The public site targets modern evergreen browsers. The Admin area should be used with a current Chrome, Edge, Firefox or Safari release.

Mobile layout should be checked separately because viewport behavior (`dvh`, browser bars and safe areas) differs from desktop.
