<div align="center">

# Necrotix Lab Portfolio CMS

**A full-stack portfolio, publishing platform, knowledge base and digital storefront with a custom administration system.**

[![Portfolio CI](https://github.com/drnecrotix/Portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/drnecrotix/Portfolio/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](LICENSE)

[Live website](https://necrotixlab.com/) · [Documentation](docs/wiki/Home.md) · [Admin guide](docs/wiki/Admin-Dashboard.md) · [Updates & CI](docs/wiki/Updates-and-CI.md)

</div>

---

## What this project is

Necrotix Lab Portfolio CMS is a production-oriented website and administration platform built for a creator, developer or small studio that wants full control over content, presentation, commerce and deployment without relying on WordPress or a hosted page builder.

The public site and the CMS are part of the same application. Content is stored in PostgreSQL, managed through a protected `/admin` area and rendered through Next.js App Router.

| Area | What it provides |
| --- | --- |
| **Portfolio** | Homepage, Projects, Blog, Gallery, Wiki, FAQ, Journey, Career Dossier, Lab, custom Pages and Contact |
| **CMS** | Content editing, media management, comments, navigation, footer, revisions, SEO, redirects and user roles |
| **Commerce** | Digital Store, free/paid products, cart, orders, Creem, Lemon Squeezy and protected digital delivery |
| **Operations** | Traffic analytics, Site Mode, A/B experiments, health status, API integrations and GitHub self-updates |
| **Quality** | TypeScript, Prisma migration checks, Playwright responsive tests, live-site audit and protected-design CI guard |

> The repository is a heavily modified derivative of the MIT-licensed **PersonalBlog** project by **Syahril Arfian Almazril (Arfazrll)**. See [License and Credits](docs/wiki/License-and-Credits.md).

---

## Public experience

The public website is designed as a content-driven portfolio rather than a static profile page.

- CMS-managed homepage and identity content
- project archive with category/status filtering and project detail pages
- blog/publications with taxonomies, comments, replies and likes
- gallery for artwork, photography and video
- Wiki knowledge base with article index and FAQ module
- Journey and Career Dossier sections
- Lab and standalone CMS pages
- contact page
- responsive Digital Store
- configurable navigation and footer
- light/dark appearance
- Open Graph and X/Twitter previews
- sitemap, RSS and robots support
- desktop, tablet and mobile layouts

---

## CMS overview

The `/admin` area is organized into six groups: **Content**, **Commerce**, **Appearance**, **Publishing & SEO**, **Tools** and **Administration**.

### Dashboard

The Dashboard is the operational control center.

- live traffic activity
- sessions and page opens
- weekday activity comparison
- session depth
- country distribution and country coverage
- device distribution
- 7-day and 30-day views
- application/database health visibility
- current Site Mode
- installed vs available version
- GitHub update progress and failure reporting

### Content

| Module | Main capabilities |
| --- | --- |
| **Homepage** | Hero/identity content, homepage sections, Media Library assets, sharing thumbnails and homepage metadata |
| **Journey** | Timeline/experience content, editable presentation and configurable public page name |
| **Career Dossier** | Structured professional profile, career information, skills and resume-style presentation |
| **Wiki** | Main article, additional articles, slugs, categories, summaries, searchable index and FAQ integration |
| **Projects** | Project CRUD, status/category, descriptions, media, technologies, highlights, repository/demo links, SEO and preview |
| **Blog** | Rich-text publishing, post type/category, excerpt, author, date, tags, taxonomies, featured image, SEO, preview and draft recovery |
| **Comments** | Moderation for comments/replies, search, article references, timestamps and deletion controls |
| **Blog Taxonomies** | Reusable categories and classification values for editorial content |
| **Gallery** | Photo/video entries, direct upload, Media Library selection, thumbnails, ordering and visibility |
| **Pages** | General-purpose standalone CMS pages with custom slugs and rich content |
| **Media** | Shared reusable asset library used across Homepage, Blog, Projects, Gallery and Store |

Project content can also use structured shortcodes such as:

```text
[[mission]]
[[features]]
[[chronicles]]
[[installation]]
```

### Commerce

#### Digital Store

The Store is built for downloadable or externally hosted digital products while keeping delivery URLs private.

**Product management**

- Free and Paid product types
- title, slug, description, category, metadata and visibility
- Media Library cover-image selection
- price and payment-provider configuration
- in-place save flow with `Saved`, `Unsaved`, `Saving` and error feedback
- draft/form recovery safeguards

**Delivery**

- private uploaded files
- masked external file links
- protected application download route
- local private storage outside `public/`
- compatibility with previously stored R2-backed product files
- protected download grants instead of direct public URLs

**Payments**

- Creem checkout per product
- Creem catalog picker
- automatic Creem product creation when configured
- Lemon Squeezy product/variant picker
- payment provider selected per paid product
- Free products require no payment-provider ID

**Public Store**

- marketplace-style catalog
- image-first product cards
- search, category filters and sorting
- individual product pages
- responsive cart
- per-item cart selection
- Select all / Clear controls
- required Terms & Digital Content Policy consent before checkout/download

#### Orders

Orders are separated from product management and provide purchase/fulfillment context for Store activity.

### Appearance

| Module | Main capabilities |
| --- | --- |
| **Navigation** | Top-level and nested items, dropdowns, ordering, internal/external links and availability-aware filtering |
| **Footer** | CMS-managed footer content, links and fallback rendering |
| **Watermark** | Branding/watermark controls for supported media workflows |

### Publishing & SEO

#### Revisions

Stores historical snapshots for supported content types to provide editorial history and recovery context.

#### Site Mode

Controls what visitors see without disabling CMS access.

**Modes:** `NORMAL`, `MAINTENANCE`, `COMING SOON`, `PRIVATE`, `ARCHIVE`

**Templates:** Hero, Split, Editorial, Signal, Portal

#### SEO

- global title and title template
- default description and keywords
- author/creator metadata
- Open Graph metadata
- X/Twitter metadata
- social thumbnail defaults
- robots directives
- verification values
- structured custom meta tags
- content-level SEO overrides
- SEO title/description assistance in editors
- sitemap, RSS and robots.txt support

#### Redirects

Supports internal and absolute redirects with validation around protected/reserved routes.

### Tools

#### AI Assistant

Optional CMS-integrated AI tooling when a supported provider is configured.

#### Experiments

Built-in A/B experiment monitoring for design and product decisions.

- Variant A / Variant B comparison
- exposures and conversions
- conversion rate
- confidence interval context
- absolute difference and relative lift
- sample balance
- split-health warnings
- audience/traffic context
- country and device distribution

#### API Integrations

Centralized admin-only configuration for supported external services, including commerce providers such as Creem and Lemon Squeezy.

### Administration

#### Users

| Role | Scope |
| --- | --- |
| `OWNER` | Full control, owner-only update operations and sensitive administration |
| `ADMIN` | Broad content/site administration and sensitive CMS tools |
| `EDITOR` | Content-focused access with restricted administrative/destructive operations |

Protected requests revalidate the active user and current role so disabled accounts or role changes take effect without waiting for an old session to expire.

#### Settings

Global CMS and operational settings, including section availability and feature visibility where supported.

---

## Platform operations

### Authentication and security

- Auth.js / NextAuth v5 credentials authentication
- bcrypt password verification
- OWNER / ADMIN / EDITOR role separation
- throttling for repeated failed login attempts
- active-user and role revalidation
- Content Security Policy and additional security headers
- private Store assets outside the public web directory
- protected download grants for digital products

### GitHub self-updater

The CMS can detect a newer release from `main/package.json` and perform a staged production update.

1. clone the latest `main`
2. synchronize release-controlled files while preserving runtime state and uploads
3. install dependencies only when required
4. generate Prisma Client
5. deploy Prisma migrations
6. build into `.next-update`
7. activate only after a successful staged build
8. restore the previous production build if activation fails
9. request a Passenger restart after successful activation

The updater also includes protection against stale generated Next.js route types after routes are removed.

### Private Store storage

New private Store uploads default to:

```text
<project>/storage/store-private
```

For production, configure a persistent absolute path when possible:

```env
STORE_PRIVATE_STORAGE_PATH="/absolute/private/path/necrotixlab-store"
```

Never place private digital-product assets directly in `public/`.

---

## Technology stack

| Layer | Technologies |
| --- | --- |
| **Application** | Next.js 16, React 19, TypeScript |
| **Database** | PostgreSQL, Prisma 6 |
| **Authentication** | Auth.js / NextAuth v5, bcrypt |
| **UI & content** | Tailwind CSS, Tiptap, Framer Motion, GSAP, Lenis |
| **Validation** | Zod |
| **Commerce** | Creem, Lemon Squeezy |
| **Storage** | Local private filesystem, Cloudflare R2 / S3-compatible workflows |
| **Mail** | Nodemailer / SMTP |
| **Testing** | Playwright, TypeScript, ESLint |
| **Automation** | GitHub Actions |

---

## Quality and CI

Pull Requests are validated by the Portfolio CI workflow with checks for:

- application versioning on deployable changes
- Prisma schema and migration status
- Prisma runtime singleton usage
- TypeScript typecheck
- changed-file linting
- standard Next.js production build
- N0C / WASM compatibility build
- staged-updater regression coverage
- protected public-design guard
- Playwright visual smoke tests
- desktop/mobile/small-mobile overflow checks
- live production responsive audit

Intentional changes to protected public visual files may require the `design-approved` PR label.

---

## Quick start

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
npm ci
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure the database, Auth secret, owner seed credentials and public site URL, then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Development URLs:

- Public site: `http://localhost:3000`
- Admin CMS: `http://localhost:3000/admin`

For production deployment, use the environment-specific installation guides rather than the development Quick Start.

---

## Useful commands

```bash
npm run dev             # Development server
npm run build           # Standard production build
npm run build:n0c       # N0C / WASM compatibility build
npm run start           # Start production build
npm run lint            # ESLint
npm run typecheck       # TypeScript check
npm run test:visual     # Playwright visual/responsive smoke tests
npm run db:generate     # Generate Prisma client
npm run db:validate     # Validate Prisma schema
npm run db:migrate      # Development migration workflow
npm run db:deploy       # Deploy production migrations
npm run db:status       # Check migration status
npm run db:seed         # Bootstrap/update OWNER account
npm run db:studio       # Prisma Studio
```

---

## Documentation

| Guide | Description |
| --- | --- |
| [Wiki Home](docs/wiki/Home.md) | Documentation index and recommended reading order |
| [Requirements](docs/wiki/Requirements.md) | Runtime, database, hosting and environment requirements |
| [Install on N0C / PlanetHoster](docs/wiki/Installation-N0C.md) | Passenger/N0C deployment and hosting notes |
| [Install on cPanel](docs/wiki/Installation-cPanel.md) | Generic cPanel Node.js deployment |
| [Install on a Home Server](docs/wiki/Installation-Home-Server.md) | Linux self-hosting, reverse proxy and process management |
| [Admin Dashboard](docs/wiki/Admin-Dashboard.md) | CMS modules and administrative workflows |
| [SEO and Meta Tags](docs/wiki/SEO-and-Meta-Tags.md) | SEO editor, social previews and custom meta tags |
| [Troubleshooting](docs/wiki/Troubleshooting.md) | Known N0C, Passenger, Prisma, CI and deployment issues |
| [Updates and CI](docs/wiki/Updates-and-CI.md) | Versioning, updater behavior and GitHub Actions |
| [License and Credits](docs/wiki/License-and-Credits.md) | Attribution, redistribution and third-party notices |

---

## Contributing

Use feature/fix branches and open Pull Requests against `main`.

```bash
git checkout -b feat/my-change
npm run typecheck
npm run lint
npm run build
git push -u origin feat/my-change
```

CI should be green before merge.

---

## Security

Do not commit production secrets, database credentials, Auth secrets, SMTP credentials, payment-provider keys or private API keys.

Production security also depends on HTTPS, server patching, database/network restrictions, backups and log review.

---

## License and credits

This repository is distributed under the MIT License. The original MIT notice for **PersonalBlog** is preserved in [`LICENSE`](LICENSE), together with attribution for the substantially modified Portfolio derivative.

- **Original foundation:** PersonalBlog by Syahril Arfian Almazril (`Arfazrll`)
- **Current derivative / project-specific development:** Dr Necrotix
- **Additional contributions:** repository contributors
- **Third-party libraries and services:** remain subject to their own licenses, terms and trademarks

See [License and Credits](docs/wiki/License-and-Credits.md) for the full attribution and redistribution notes.
