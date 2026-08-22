# Portfolio Wiki

Welcome to the Portfolio CMS documentation.

This documentation is split into focused pages so installation, administration and troubleshooting information can be maintained independently.

## Start here

- [Requirements](Requirements.md) — software, hosting, database and environment requirements.
- [Install on N0C](Installation-N0C.md) — PlanetHoster/N0C/Passenger deployment.
- [Install on cPanel](Installation-cPanel.md) — generic cPanel Node.js deployment.
- [Install on a Home Server](Installation-Home-Server.md) — self-hosting behind a reverse proxy.
- [Admin Dashboard](Admin-Dashboard.md) — what each CMS module does.
- [SEO and Meta Tags](SEO-and-Meta-Tags.md) — SEO fields, social previews and custom meta tags.
- [Troubleshooting](Troubleshooting.md) — common errors and known fixes.
- [Updates and CI](Updates-and-CI.md) — versioning, updater detection and GitHub Actions checks.
- [License and Credits](License-and-Credits.md) — original foundation, derivative authorship, contributors, third-party software and redistribution guidance.

## Project stack

The application is a Next.js portfolio/CMS with Prisma and PostgreSQL, an authenticated Admin area, Blog, Projects, Gallery, Media Library, SEO settings, comments, site modes and an application updater.

Production deployments should always be treated as a Node.js application. Do not deploy it as a static HTML-only website unless the application is intentionally converted to static output.

## Recommended documentation order

For a new installation:

1. Read **Requirements**.
2. Choose the deployment guide for the hosting environment.
3. Configure the production environment variables.
4. Deploy Prisma migrations.
5. Build the application.
6. Start or restart the Node application.
7. Verify the public site, Admin and database-backed routes.
8. Read **Troubleshooting** before making hosting-specific workarounds.

For content editors, start with **Admin Dashboard** and **SEO and Meta Tags**.

Before redistributing or publishing a fork, read **License and Credits** and preserve the required notices.

## Important production rule

Never commit production secrets such as `DATABASE_URL`, `AUTH_SECRET`, storage credentials or private API keys to GitHub.
