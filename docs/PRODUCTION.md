# Production Readiness Guide

This document covers production deployment for the Dr Necrotix Portfolio/CMS.

## Current status

The repository now has a committed Prisma migration baseline and CI verifies it against a clean PostgreSQL 16 database using `prisma migrate deploy`. The project also includes a production Docker image, an optional self-hosted PostgreSQL stack, environment preflight validation, and a database-backed health endpoint.

## Required production services

- Node.js 22-compatible runtime or Docker.
- PostgreSQL 16 or a compatible managed PostgreSQL service.
- Persistent HTTPS hostname configured through `NEXT_PUBLIC_SITE_URL`.
- Strong `AUTH_SECRET` stored only in the deployment secret manager.
- SMTP credentials when the contact form should deliver email.
- Cloudflare R2 credentials when managed media uploads are enabled.
- Optional GitHub, WakaTime, Groq, and Gemini credentials only when their related integrations are enabled.

Never commit real credentials to the repository.

## Database lifecycle

Development workflow:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

Production workflow:

```bash
npm run production:preflight
npm run db:deploy
npm run db:status
```

`db:migrate` uses `prisma migrate dev` and is intended for development only. Production must use `db:deploy` (`prisma migrate deploy`). Do not use `prisma db push` as the production migration strategy.

## Docker deployment

The repository includes `Dockerfile` and `docker-compose.production.yml`.

Create a local production secrets file that is never committed, for example `.env.production`, based on `.env.example`. At minimum set:

```env
POSTGRES_PASSWORD="use-a-long-random-database-password"
AUTH_SECRET="use-a-random-secret-at-least-32-characters"
NEXT_PUBLIC_SITE_URL="https://example.com"
OWNER_NAME="Your Name"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="use-a-strong-password-at-least-12-characters"
```

Then build and start the self-hosted stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

The app listens only on `127.0.0.1:3000` by default, so expose it publicly through a TLS reverse proxy such as Caddy, Nginx, Traefik, or your hosting provider/CDN.

On container startup the application runs production environment validation and `prisma migrate deploy` before starting Next.js.

To inspect the stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f app
```

To stop it without deleting the PostgreSQL volume:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml down
```

Do not use `down -v` unless you intentionally want to delete the database volume.

### Managed PostgreSQL instead of Docker PostgreSQL

For a managed database, deploy only the application container and set `DATABASE_URL` to the provider's PostgreSQL connection string. Run:

```bash
npm run production:preflight
npm run db:deploy
npm run db:status
```

before serving production traffic. Prefer provider-side automated backups and point-in-time recovery when available.

## Owner bootstrap

The initial OWNER account is created by `prisma/seed.cjs` using `OWNER_NAME`, `OWNER_EMAIL`, and `OWNER_PASSWORD`.

Run once after the production database is migrated:

```bash
npm run db:seed
```

The password must be at least 12 characters. The seed uses an upsert, so running it again updates the configured owner account rather than creating duplicate owner records.

After bootstrap, rotate or remove `OWNER_PASSWORD` from the long-lived deployment environment when operationally practical.

## Authentication and secrets

Production must use HTTPS. `AUTH_SECRET` must be at least 32 characters and should be generated from cryptographically secure random data. Do not rotate it casually because it participates in session and private Site Mode security.

Store production secrets in the hosting platform's secret manager or a root-readable environment file outside the repository. Never place secrets in Docker images, Git history, screenshots, issue comments, or CI logs.

The production preflight command fails startup when core variables are missing, the canonical URL is not HTTPS, `AUTH_SECRET` is too short, or SMTP/R2 is only partially configured.

## Health monitoring

`GET /api/health` performs a lightweight database query and returns `200` when the application and PostgreSQL connection are healthy or `503` when the database is unavailable. Responses are `no-store` and expose no credentials or raw database errors.

The Docker image uses this endpoint for its container health check. External uptime monitoring may use the same endpoint.

## Site Modes

Before maintenance, migration, or risky content operations, use the CMS Site Mode controls rather than modifying public frontend routes.

Available modes:

- `NORMAL` — standard public site.
- `MAINTENANCE` — public maintenance gate.
- `COMING_SOON` — launch/holding gate.
- `PRIVATE` — password-protected public access.
- `ARCHIVE` — public read-only mode for supported public writes.

Verify the selected mode from a logged-out browser before and after a production maintenance window.

## Media / Cloudflare R2

When R2 is enabled, configure all of these together:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL="https://media.example.com"
```

Use a dedicated bucket or tightly scoped credentials. Keep bucket/versioning or an independent backup strategy because database backups do not contain R2 objects.

## Contact form / SMTP

Configure all required SMTP fields together:

```env
EMAIL_USER=""
EMAIL_APP_PASSWORD=""
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
```

Before launch, submit a real contact-form test through the production hostname and verify delivery, sender configuration, spam controls, and reverse-proxy client IP behavior.

## Optional integrations

```env
GITHUB_TOKEN=""
WAKATIME_API_KEY=""
GROQ_API_KEY=""
GEMINI_API_KEY=""
```

Use the minimum token permissions required. Monitor AI API cost and abuse in production even though the public chat endpoint already includes input limits, throttling, upstream timeouts, and CMS-grounded context.

## Reverse proxy and HTTPS

The public origin must use HTTPS and must match `NEXT_PUBLIC_SITE_URL`. Forward standard proxy headers (`Host`, `X-Forwarded-For`, `X-Forwarded-Proto`) so absolute URLs, authentication, and rate-limiting behavior remain correct.

A typical topology is:

```text
Internet / Cloudflare
        |
HTTPS reverse proxy
        |
127.0.0.1:3000 (Portfolio)
        |
PostgreSQL
```

Do not publish PostgreSQL port 5432 directly to the public Internet.

## Build and release checks

Before deployment:

```bash
npm install --no-audit --no-fund
npm run production:preflight
npm run db:validate
npm run typecheck
npm run lint
npm run build
npm run test:visual
npm run db:status
```

Deploy only a commit whose exact-head GitHub Actions CI is green.

## Backup strategy

Before schema migrations or major CMS changes:

- create a PostgreSQL backup/snapshot;
- confirm that a restore procedure has been tested;
- retain a separate backup/versioning strategy for R2 media;
- record the deployed Git commit SHA;
- keep the previous application image/release available for rollback.

For the self-hosted Compose database, schedule `pg_dump` backups outside the application container and copy them to storage outside the server.

## Release procedure

1. Enable `MAINTENANCE` Site Mode for risky database/infrastructure changes when appropriate.
2. Take a database backup.
3. Pull/build the exact green commit.
4. Run production preflight.
5. Apply `npm run db:deploy`.
6. Verify `npm run db:status`.
7. Start/restart the application.
8. Verify `/api/health` returns HTTP 200.
9. Verify public Homepage, Projects, Blog and Contact.
10. Verify `/admin` login and one non-destructive CMS read operation.
11. Test R2/SMTP if configured.
12. Restore `NORMAL` Site Mode and re-check from a logged-out browser.

## Rollback

Application rollback should redeploy the previous known-good Git SHA/container image. Database migrations require more care: Prisma migrations are forward-oriented, so do not improvise destructive SQL rollback. Restore from a tested database backup when a schema migration cannot be safely corrected with a new forward migration.

## First-deployment checklist

- Production PostgreSQL is provisioned and not publicly exposed.
- Committed Prisma migrations deploy successfully to an empty database.
- `npm run db:status` reports the database up to date.
- OWNER seed succeeds.
- `AUTH_SECRET` is unique, at least 32 characters, and stored as a secret.
- Canonical HTTPS site URL is configured.
- Reverse proxy/CDN forwards HTTPS and client headers correctly.
- `/api/health` returns 200.
- SMTP delivery is tested if enabled.
- R2 upload/read/delete behavior is tested if enabled.
- Optional integration tokens use minimum permissions.
- Exact-head GitHub Actions CI is green.
- Database and R2 backup/restore procedures exist.
- Homepage, Projects, Blog, Contact, `/admin`, Site Modes, and Day/Night presentation are checked after deployment.

## Protected frontend contract

Production work must not use infrastructure changes as a reason to redesign the protected visual surfaces. The protected Homepage identity/Hero, Navigation, Projects archive, Blog archive, profile treatment, selected animations, responsive behavior, and Day/Night presentation remain a design contract. Backend and deployment changes must adapt to those surfaces, not replace them.
