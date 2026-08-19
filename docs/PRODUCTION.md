# Production Readiness Guide

This document covers the production prerequisites for the Dr Necrotix Portfolio/CMS.

## Current status

The application already has production-oriented runtime protections, authenticated CMS access, role-based administration, Site Modes, media management, redirect handling, SEO settings, CI, and public-input validation.

The remaining deployment-critical item is the database migration history. The repository currently contains `prisma/schema.prisma` and the owner/bootstrap seed, but **does not yet contain a committed `prisma/migrations/` history**. Do not run a production deployment against a new database until an initial migration has been generated, reviewed, committed, and tested against a disposable PostgreSQL database.

## Required production services

- Node.js runtime compatible with the version required by the current Next.js release.
- PostgreSQL database reachable through `DATABASE_URL`.
- Persistent HTTPS hostname configured through `NEXT_PUBLIC_SITE_URL`.
- Strong `AUTH_SECRET` stored only in the deployment secret manager.
- SMTP credentials when the contact form should deliver email.
- Cloudflare R2 credentials when managed media uploads are enabled.
- Optional GitHub, WakaTime, Groq, and Gemini credentials only when their related integrations are enabled.

Never commit real credentials to the repository.

## Database lifecycle

Development database workflow:

```bash
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
```

Production database workflow after migrations are committed:

```bash
npm run db:validate
npm run db:deploy
npm run db:status
```

`db:migrate` uses `prisma migrate dev` and is intended for development only. Production must use `db:deploy` (`prisma migrate deploy`).

### Initial migration requirement

Before the first real deployment:

1. Create a disposable/local PostgreSQL database.
2. Configure `DATABASE_URL` for that database.
3. Run `npm run db:migrate -- --name init`.
4. Review the generated SQL in `prisma/migrations/`.
5. Recreate a clean disposable database and verify `npm run db:deploy` applies the migration from zero state.
6. Run `npm run db:seed` and confirm the OWNER account and singleton settings are created.
7. Commit the migration directory only after those checks pass.

Do not use `prisma db push` as the production migration strategy.

## Owner bootstrap

The initial OWNER account is created by `prisma/seed.cjs` using:

- `OWNER_NAME`
- `OWNER_EMAIL`
- `OWNER_PASSWORD`

The password must be at least 12 characters. The seed uses an upsert, so running it again updates the configured owner account rather than creating duplicate owner records.

For production, use a unique high-entropy password and rotate/remove bootstrap values from the deployment environment after the owner account is established if your hosting workflow permits it.

## Authentication and cookies

Production must use HTTPS. `AUTH_SECRET` must be a long random secret and must not change casually after deployment because it participates in authentication/session security and private Site Mode access.

Admin access should be limited to trusted accounts. OWNER privileges include user and role management and should not be assigned to normal editor accounts.

## Site Modes

Before maintenance, migration, or risky content operations, use the CMS Site Mode controls rather than modifying public frontend routes.

Available modes:

- `NORMAL` — standard public site.
- `MAINTENANCE` — public maintenance gate.
- `COMING_SOON` — launch/holding gate.
- `PRIVATE` — password-protected public access.
- `ARCHIVE` — public read-only mode for supported public writes.

Admin bypass is configurable. Verify the selected mode from a logged-out browser before a production maintenance window.

## Media / Cloudflare R2

When R2 is enabled, configure:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
R2_PUBLIC_BASE_URL="https://media.example.com"
```

Use a dedicated bucket or tightly scoped R2 credentials for this application. Public media URLs should use the production media hostname. Managed deletion is intentionally restricted in the CMS because physical object deletion is irreversible.

## Contact form

Configure SMTP only through deployment secrets. Before launch, test delivery from the production hostname and verify spam controls and rate limiting behave correctly behind the chosen reverse proxy/CDN.

## Optional public integrations

GitHub and WakaTime statistics use server-side credentials. AI chat can use Groq with Gemini fallback. These variables are optional:

```env
GITHUB_TOKEN=""
WAKATIME_API_KEY=""
GROQ_API_KEY=""
GEMINI_API_KEY=""
```

Use the minimum token permissions required by each integration. The public chat endpoint includes input limits, rate limiting, upstream timeouts, and CMS-grounded context, but production API usage should still be monitored for cost and abuse.

## Build and release checks

Before deployment, run:

```bash
npm ci
npm run db:validate
npm run typecheck
npm run lint
npm run build
npm run test:visual
```

GitHub Actions already performs the repository CI checks. Deploy only a commit whose exact-head CI is green.

## Backup strategy

Before schema migrations or major CMS changes:

- create a PostgreSQL backup/snapshot;
- confirm a restore procedure exists;
- retain a separate backup/versioning strategy for R2 media;
- record the deployed Git commit SHA.

A database backup does not automatically include R2 objects.

## Reverse proxy and platform notes

The application expects the public hostname to use HTTPS. Ensure the hosting platform forwards client/proxy headers correctly because rate limiting and absolute URL generation depend on deployment networking behavior.

Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin, for example:

```env
NEXT_PUBLIC_SITE_URL="https://example.com"
```

Do not leave the localhost default in production.

## First-deployment checklist

- PostgreSQL provisioned and backed up.
- Initial Prisma migration committed and tested from an empty database.
- `npm run db:deploy` succeeds.
- OWNER seed succeeds.
- `AUTH_SECRET` is unique and stored as a secret.
- Canonical site URL configured.
- SMTP tested if contact delivery is enabled.
- R2 upload/read/delete behavior tested if managed media is enabled.
- Optional integration tokens use minimum permissions.
- `npm run build` succeeds.
- Exact-head GitHub Actions CI is green.
- Homepage, Projects, Blog, Contact, `/admin`, and Site Mode behavior verified on production.
- Day/Night presentation checked without modifying protected frontend design.

## Protected frontend contract

Production work must not use infrastructure changes as a reason to redesign the protected visual surfaces. The protected Homepage identity/Hero, Navigation, Projects archive, Blog archive, profile treatment, selected animations, responsive behavior, and Day/Night presentation remain a design contract. Backend and deployment changes must adapt to those surfaces, not replace them.
