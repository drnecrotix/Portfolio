# Dr Necrotix Portfolio

A full-stack personal portfolio and content-management system built with Next.js, PostgreSQL, Prisma and Auth.js. The project combines a protected public visual identity with an administration panel for managing projects, publications, pages, navigation, media, SEO, redirects, site availability and users.

> This repository is a heavily modified derivative of the MIT-licensed **PersonalBlog** project by **Syahril Arfian Almazril (Arfazrll)**. See [License and credits](#license-and-credits) for attribution.

## What this project includes

### Public portfolio

- Full-screen visual homepage with CMS-managed identity/content.
- Projects archive with search and filtering.
- Individual project pages backed by PostgreSQL.
- Blog/publications archive with search, categories and incremental loading.
- Article, thought, poetry, note and project-log publication types.
- Dynamic CMS pages.
- Contact page with server-side validation, anti-spam honeypot, rate limiting and SMTP delivery.
- Day/Night theme support with Night as the default.
- CMS-managed navigation, social links, contact details and global identity.
- Global and per-content SEO metadata.
- Redirect management.
- AI portfolio assistant backed by CMS data and published projects, with Groq primary and Gemini fallback when configured.
- GitHub and WakaTime telemetry endpoints with safer caching, timeouts and error handling.

### Administration panel

The protected `/admin` area provides:

- Dashboard statistics and current Site Mode status.
- Projects management.
- Blog/publication management with Tiptap rich-text editing.
- Pages management.
- Homepage content management.
- Navigation management.
- Media Library with external media registration and Cloudflare R2 upload support.
- Global SEO settings.
- Redirect management.
- General site settings.
- Site Mode controls.
- Users & Roles management for the OWNER account.
- Read-only revision history for Projects, Posts and Pages.

### Content workflow

Content supports the following lifecycle where applicable:

`Draft -> Review -> Published -> Archived`

Project states are:

`Planned -> Ongoing -> Completed -> Archived`

Revisions are stored as JSON snapshots so changes can be audited later.

## Site Modes

The public site can operate in five modes:

- **NORMAL** - normal public operation.
- **MAINTENANCE** - public maintenance screen.
- **COMING_SOON** - public coming-soon screen.
- **PRIVATE** - password-protected visitor access.
- **ARCHIVE** - public content stays readable while selected public write actions are disabled.

Site Modes support optional start/end scheduling using the `Europe/Sofia` timezone, administrator bypass, public status messaging and countdown targets.

## Roles and permissions

Three CMS roles are available:

| Role | Purpose |
| --- | --- |
| `OWNER` | Full CMS control, including user and role management. |
| `ADMIN` | Site/content administration except protected owner-only operations. |
| `EDITOR` | Content-oriented access with restricted destructive/admin operations. |

The initial OWNER account is created with the database seed command.

## Technology stack

- **Next.js 16** / App Router
- **React 19**
- **TypeScript**
- **PostgreSQL**
- **Prisma 6**
- **Auth.js / NextAuth v5**
- **Tailwind CSS**
- **Tiptap**
- **Zod**
- **sanitize-html**
- **Cloudflare R2 / S3 API**
- **Nodemailer / SMTP**
- **Framer Motion / GSAP / Lenis**
- **Three.js / React Three Fiber** for retained visual modules
- **Playwright** for frontend visual smoke tests
- **GitHub Actions** for CI

## Requirements

Recommended local environment:

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL database
- Git

Optional services are required only for the related features:

- Cloudflare R2 for managed media uploads
- SMTP account for the contact form
- GitHub token for private/authenticated GitHub statistics
- WakaTime API key for WakaTime statistics
- Groq and/or Gemini API key for the portfolio assistant

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
```

### 2. Install dependencies

```bash
npm install
```

`postinstall` automatically runs `prisma generate`.

### 3. Create the environment file

Copy the example configuration:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/portfolio?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_TRUST_HOST=true

OWNER_NAME="Your Name"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="use-a-strong-password-at-least-12-characters"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Generate a strong Auth.js secret before production deployment. Do not commit `.env.local` or real API keys.

### 4. Create/update the database schema

For local development:

```bash
npm run db:migrate
```

If you are provisioning a production database, use the Prisma deployment workflow appropriate for your host and migration strategy rather than running interactive development migrations in production.

### 5. Bootstrap the OWNER account

```bash
npm run db:seed
```

The seed reads `OWNER_NAME`, `OWNER_EMAIL` and `OWNER_PASSWORD`. The password must contain at least 12 characters.

### 6. Start development mode

```bash
npm run dev
```

Open:

- Public site: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin`

## Environment variables

### Required core variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUTH_SECRET` | Signs/authenticates Auth.js sessions and protected visitor state. |
| `AUTH_TRUST_HOST` | Enables trusted-host handling for Auth.js deployments. |
| `OWNER_NAME` | Initial CMS owner name used by seed. |
| `OWNER_EMAIL` | Initial CMS owner login email. |
| `OWNER_PASSWORD` | Initial CMS owner password, minimum 12 characters. |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site URL used for metadata/URLs. |

### Contact / SMTP

| Variable | Purpose |
| --- | --- |
| `EMAIL_USER` | SMTP sender/login email. |
| `EMAIL_APP_PASSWORD` | SMTP password/app password. |
| `SMTP_HOST` | SMTP hostname. |
| `SMTP_PORT` | SMTP port. |
| `SMTP_SECURE` | `true` for TLS/SSL mode where required. |

### Cloudflare R2 media storage

| Variable | Purpose |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_ACCESS_KEY_ID` | R2 S3 access key. |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret. |
| `R2_BUCKET` | Bucket name. |
| `R2_PUBLIC_BASE_URL` | Public URL/domain serving uploaded media. |

### Optional external integrations

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Authenticated GitHub statistics/language requests. |
| `WAKATIME_API_KEY` | WakaTime coding statistics. |
| `GROQ_API_KEY` | Primary AI portfolio assistant provider. |
| `GEMINI_API_KEY` | AI assistant fallback provider. |

The application should be deployed with secrets stored in the hosting provider's secret/environment-variable system rather than in repository files.

## Database model

The Prisma data layer currently includes:

- `User`
- `Project`
- `Post`
- `Page`
- `NavigationItem`
- `SiteSettings`
- `SiteModeSettings`
- `MediaAsset`
- `Redirect`
- `Revision`

Post types: `ARTICLE`, `POETRY`, `THOUGHT`, `NOTE`, `PROJECT_LOG`.

## Media Library

Media can be registered as external HTTPS assets or uploaded to Cloudflare R2 when R2 is configured. Managed files are stored with generated keys below the `media/` namespace. Admin/Owner deletion can optionally remove a managed R2 object; external media references are database-only and do not delete remote files.

For safety, direct SVG upload is not accepted by the managed upload workflow. Media URLs and metadata are validated server-side.

## SEO and redirects

The CMS supports global defaults for:

- title and title template
- description and keywords
- author/creator data
- Open Graph metadata
- Twitter/X metadata
- indexing/follow directives
- Google verification token

Projects, blog posts and pages also support content-specific SEO metadata. Redirects support internal or absolute destinations with permanent/temporary behavior and validation protecting reserved application paths.

## AI portfolio assistant

`/api/chat` builds its context from current CMS site identity and published projects rather than inherited sample portfolio data.

Security controls include bounded message history/content size, request-size limits, lightweight per-IP throttling, provider timeouts and generic public errors. Provider credentials and upstream error details are not returned to visitors.

Configure at least one of:

```env
GROQ_API_KEY=""
GEMINI_API_KEY=""
```

If both are configured, Groq is attempted first and Gemini is used as fallback.

## Useful commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type check
npm run test:visual  # Playwright frontend visual smoke tests
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Development Prisma migration
npm run db:studio    # Prisma Studio
npm run db:seed      # Bootstrap/update OWNER account
```

## CI and design protection

The repository includes GitHub Actions checks for:

- protected frontend design guard
- TypeScript checks
- linting of changed source files
- production build
- Playwright frontend visual smoke tests on desktop/mobile and theme variants

Important public visual components are treated as a design contract. CMS/backend development is expected to adapt to those components rather than silently redesigning them.

The Playwright checks are currently visual **smoke/evidence tests**, not strict pixel-baseline regression testing.

## Production notes

Before deploying:

1. Configure a production PostgreSQL database and `DATABASE_URL`.
2. Use strong values for `AUTH_SECRET` and OWNER credentials.
3. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS URL.
4. Configure SMTP if the contact form should send email.
5. Configure R2 if managed media uploads are required.
6. Configure optional GitHub, WakaTime, Groq and Gemini integrations as needed.
7. Apply your production database migrations.
8. Seed the initial OWNER account once the production database is ready.
9. Run `npm run typecheck`, `npm run lint` and `npm run build` before release.

## Security notes

This project includes role checks, input validation, HTML sanitization, upload restrictions, bounded external requests and protection around sensitive CMS actions. Nevertheless, deployment security also depends on infrastructure configuration. Keep dependencies updated, rotate secrets when necessary, use HTTPS, restrict database/network access and review logs/alerts in production.

In-memory rate limiting is intentionally lightweight and is not a replacement for distributed rate limiting at a reverse proxy, CDN or shared data store when running multiple instances.

## Contributing

Changes should be made through branches and Pull Requests. Avoid altering protected public visuals unless the change is intentionally approved as a design change. CI should be green before merging.

Recommended workflow:

```bash
git checkout -b feat/my-change
# make changes
npm run typecheck
npm run lint
npm run build
git push -u origin feat/my-change
```

Then open a Pull Request against `main`.

## License and credits

This repository is distributed under the MIT License. See [`LICENSE`](LICENSE).

### Original project / foundation

The original foundation is:

- **Project:** PersonalBlog
- **Original author:** Syahril Arfian Almazril
- **GitHub:** `Arfazrll`
- **Original repository:** `https://github.com/Arfazrll/PersonalBlog`
- **Original license:** MIT License, copyright (c) 2026 S. A. Almazril

The original MIT copyright and permission notice are preserved in this repository.

### Current derivative

The repository has since been substantially adapted by **Dr Necrotix** into a database-backed portfolio/CMS with authentication, editorial workflows, Site Modes, media management, SEO, redirects, user roles, revisions, hardened API routes and a redesigned content architecture.

Original authorship is credited for the foundation; subsequent changes and project-specific content belong to their respective authors/contributors under the terms of the repository license.