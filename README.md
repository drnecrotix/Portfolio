<div align="center">

# Necrotix Lab Portfolio CMS

**A production-focused portfolio, publishing platform, knowledge base and digital storefront built around a custom headless-style CMS.**

[![Portfolio CI](https://github.com/drnecrotix/Portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/drnecrotix/Portfolio/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.2.19-111111?style=flat-square)](https://github.com/drnecrotix/Portfolio)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-0b0b0b?style=flat-square)](LICENSE)

[Live website](https://necrotixlab.com/) · [Documentation](docs/wiki/Home.md) · [Admin guide](docs/wiki/Admin-Dashboard.md) · [Updates & CI](docs/wiki/Updates-and-CI.md)

</div>

---

## Overview

Necrotix Lab Portfolio is more than a portfolio template. It combines a public creative website with a protected administration system for content publishing, digital products, site operations, SEO, analytics, experiments and production updates.

The project is designed for a single creator, studio or technical portfolio that needs the flexibility of a CMS without depending on WordPress or a third-party page builder.

> This repository is a heavily modified derivative of the MIT-licensed **PersonalBlog** project by **Syahril Arfian Almazril (Arfazrll)**. Attribution and redistribution details are documented in [License and Credits](docs/wiki/License-and-Credits.md).

### At a glance

| Area | Capabilities |
| --- | --- |
| **Public portfolio** | Homepage, Projects, Blog, Gallery, Wiki, FAQ, Journey, Career Dossier, Lab, custom Pages and Contact |
| **CMS** | Content editing, media management, navigation, footer, revisions, comments, SEO, redirects and user roles |
| **Commerce** | Digital Store, free/paid products, cart, orders, Creem, Lemon Squeezy and protected delivery |
| **Operations** | Traffic analytics, Site Mode, A/B experiments, API integrations, health status and GitHub updater |
| **Quality** | TypeScript, Prisma migration validation, Playwright responsive tests, live-site audit and protected-design guard |

---

## Public experience

The public website is built as a responsive, content-driven portfolio rather than a static brochure.

- CMS-managed homepage and identity content
- Projects archive with category/status filtering and individual project pages
- Blog/publications with comments, replies, likes, taxonomies and rich content
- Gallery for artwork, photography and video
- Wiki knowledge base with article index and FAQ module
- Journey / experience presentation
- Career Dossier / resume presentation
- Lab and standalone CMS pages
- Contact page
- Digital Store for downloadable products
- configurable public navigation and footer
- light/dark appearance support
- Open Graph and X/Twitter previews
- sitemap, RSS and robots support
- responsive desktop, tablet and mobile layouts

---

# CMS feature reference

The protected `/admin` area is organized into focused modules. The navigation structure mirrors the actual CMS: **Content**, **Commerce**, **Appearance**, **Publishing & SEO**, **Tools** and **Administration**.

## Dashboard

The Dashboard is the operational control center rather than a generic settings page.

**Traffic and audience**

- live traffic activity
- sessions and page opens
- country coverage
- weekday activity comparison
- page-open/session ratios
- session depth
- country distribution
- device distribution
- 7-day and 30-day views
- manual analytics refresh

**Operational status**

- current Site Mode
- current application version
- database/application health visibility
- installed vs available release state
- GitHub updater progress and failure reporting

---

## Content

### Homepage

Controls the public landing page and identity presentation.

- hero/intro content
- editable homepage copy
- configurable homepage sections
- media selection through the shared Media Library
- social thumbnail defaults
- Open Graph and X/Twitter image settings
- custom structured meta tags
- homepage-specific SEO-related content

### Journey

Manages the public journey/experience presentation.

- customizable Journey page name
- timeline/experience content
- editable descriptive entries
- section visibility and configuration
- CMS-driven public rendering

### Career Dossier

Dedicated professional profile and career presentation module.

- structured career/resume content
- professional biography/profile information
- skills and experience presentation
- public dossier page management

### Wiki

Structured knowledge-base management for long-form reference content.

- Wiki main article
- additional Wiki articles
- titles and slugs
- categories
- article summaries/content
- searchable public index
- category filtering
- FAQ integration
- structured knowledge navigation

### Projects

Full project publishing workflow.

- create, edit and delete projects
- title and slug
- project category/status
- short description
- rich long-form description
- cover/media selection
- technologies/tools
- highlights
- repository link
- demo/live link
- publication visibility
- SEO title and description
- unsaved preview workflow
- content recovery safeguards

Structured project shortcodes currently include:

```text
[[mission]]
[[features]]
[[chronicles]]
[[installation]]
```

### Blog

Editorial publishing system for articles and other publication types.

- create, edit and delete publications
- title and slug
- publication type/category
- excerpt
- rich-text editor
- featured image
- author
- publication date
- draft/published workflow
- tags and taxonomies
- SEO title and description
- editorial SEO health indicators
- unsaved preview
- draft recovery / accidental refresh protection
- shared Media Library integration

### Comments

Moderation interface for public Blog discussion.

- top-level comments and replies
- author details
- publication reference
- timestamps
- search/filter controls
- direct article links
- deletion of unwanted/spam comments
- reply cascade behavior when a parent comment is removed
- privileged OWNER/ADMIN access

### Blog Taxonomies

Classification management for editorial content.

- categories/taxonomies used by Blog content
- reusable classification values
- structured filtering and organization

### Gallery

Curated visual media management.

- Photo and Video content types
- existing Media Library selection
- direct media upload
- title and description
- custom video thumbnail override
- visibility controls
- manual ordering
- public **All / Photos / Videos** filtering

### Pages

General-purpose CMS pages for content that does not belong to Blog or Projects.

- standalone page creation
- title and slug
- rich content
- public visibility
- flexible long-form informational pages

### Media

Shared Media Library used across CMS modules.

- centralized asset selection
- reusable uploads
- image/media browsing
- direct upload from supported editors
- reuse across Homepage, Blog, Projects, Gallery and Store
- reduced duplicate uploads

---

## Commerce

### Digital Store

Native digital-product management with protected fulfillment.

**Product management**

- create/edit digital products
- Free or Paid product type
- title, slug and description
- cover image through Media Library
- category and product metadata
- product visibility
- price configuration
- save-state feedback: saved, unsaved, saving and error states
- in-place/AJAX-style form workflow that avoids destructive page refreshes
- local draft/form recovery safeguards

**Delivery sources**

- private uploaded file
- masked external file URL
- external delivery URL is never exposed directly to the customer
- protected application download route
- local private filesystem storage outside `public/`
- compatibility with previously stored R2-backed product files

**Payment providers**

- Creem per-product checkout
- Creem product catalog picker
- automatic Creem product creation when configured
- Lemon Squeezy product/variant picker
- provider selection per paid product
- Free products require no payment-provider ID

**Public Store**

- premium marketplace-style catalog
- image-first product cards
- search
- category filters
- sorting
- Free/Featured-style presentation
- individual product pages
- responsive mobile layout
- cart integration
- per-item cart checkboxes
- Select all / Clear selection
- required Terms & Digital Content Policy consent before checkout/download
- protected download grants

### Orders

Commerce administration and fulfillment overview.

- order records
- product/purchase relationship
- customer/payment context where available
- fulfillment/download status context
- dedicated Orders navigation separate from Digital Store

---

## Appearance

### Navigation

CMS-controlled public menu system.

- top-level items
- nested parent/child relationships
- dropdown menus
- item ordering
- internal/external destinations
- CMS fallback navigation
- page-availability-aware filtering

### Footer

- CMS-managed footer content
- configurable links
- site identity/footer information
- fallback-safe public rendering

### Watermark

- watermark configuration for supported visual/media workflows
- branding/presentation controls

---

## Publishing & SEO

### Revisions

Snapshot/history support for enabled content types.

- historical content snapshots
- revision visibility
- change/audit context
- editorial safety layer in addition to database backups and Git history

### Site Mode

Controls what visitors see without disabling the CMS itself.

**Modes**

- `NORMAL`
- `MAINTENANCE`
- `COMING SOON`
- `PRIVATE`
- `ARCHIVE`

**Presentation templates**

- Hero
- Split
- Editorial
- Signal
- Portal

Site Mode can therefore separate public availability from administrator/editor access while preserving a designed visitor-facing status page.

### SEO

Centralized technical and editorial SEO controls.

- global title/title template
- default description
- keywords
- author/creator metadata
- Open Graph metadata
- X/Twitter metadata
- social thumbnail defaults
- robots directives
- verification values
- structured custom meta tags
- content-level SEO overrides
- SEO title/description assistance in editors
- sitemap support
- RSS support
- robots.txt support

### Redirects

- internal redirects
- absolute/external destinations
- validation of reserved/protected routes
- migration and URL-maintenance workflows

---

## Tools

### AI Assistant

CMS-integrated AI tooling when a supported provider is configured.

- internal AI assistant entry point
- provider-backed assistance
- optional integration-driven behavior

### Experiments

Built-in A/B experiment monitoring for product/design decisions.

- active experiment overview
- Variant A / Variant B comparison
- exposures
- conversions
- conversion rate
- confidence interval context
- absolute difference
- relative lift
- sample balance
- split-health warnings
- audience and traffic view
- country/device context
- focused evaluation state

### API Integrations

Centralized integration configuration for supported external services.

- payment-provider configuration
- Creem integration settings
- Lemon Squeezy integration settings
- runtime integration status/configuration
- protected admin-only access for sensitive tools

---

## Administration

### Users

Role-based CMS user administration.

| Role | Scope |
| --- | --- |
| `OWNER` | Full control, owner-only update operations and sensitive administration |
| `ADMIN` | Broad content/site administration and sensitive CMS tools |
| `EDITOR` | Content-focused access with restricted administrative/destructive operations |

Additional protections include active-user checks and role revalidation for protected admin requests.

### Settings

Global CMS/system configuration.

- site-level settings
- page/section availability controls
- operational configuration
- feature visibility controls
- environment-dependent integration behavior

Supported public sections can be configured independently where enabled, including states such as public, admin-only or disabled.

---

# Platform operations

## Authentication and security

- Auth.js / NextAuth v5 credentials authentication
- bcrypt password verification
- OWNER / ADMIN / EDITOR role separation
- login throttling for repeated failed attempts
- admin account active-state revalidation
- role revalidation on protected requests
- Content Security Policy
- additional security headers
- private Store assets kept outside the public web directory
- protected download grants instead of direct digital-product URLs

## GitHub self-updater

The CMS can detect a newer release from `main/package.json` and run a staged production update.

Update pipeline:

1. download the latest `main`
2. synchronize release-controlled files while preserving runtime state/uploads
3. install dependencies only when required
4. generate Prisma Client
5. deploy Prisma migrations
6. build into `.next-update`
7. activate only after a successful staged build
8. preserve/restore the previous production build if activation fails
9. request Passenger restart after successful activation

From **v1.2.19**, the recovery flow also protects updates from stale generated Next.js route types left behind after routes are removed.

## Store storage

New private Store uploads default to:

```text
<project>/storage/store-private
```

For production, use a persistent absolute path whenever possible:

```env
STORE_PRIVATE_STORAGE_PATH="/absolute/private/path/necrotixlab-store"
```

Digital Store assets intended to remain private should never be placed directly in `public/`.

---

# Technology stack

| Layer | Technologies |
| --- | --- |
| **Application** | Next.js 16, React 19, TypeScript |
| **Database** | PostgreSQL, Prisma 6 |
| **Authentication** | Auth.js / NextAuth v5, bcrypt |
| **UI** | Tailwind CSS, Tiptap, Framer Motion, GSAP, Lenis |
| **Validation** | Zod |
| **Commerce** | Creem, Lemon Squeezy |
| **Storage** | Local private filesystem, Cloudflare R2 / S3-compatible workflows |
| **Mail** | Nodemailer / SMTP |
| **Testing** | Playwright, TypeScript, ESLint |
| **Automation** | GitHub Actions |

---

# Quality and CI

Pull Requests are validated by the Portfolio CI workflow.

- application-release version guard
- Prisma schema validation
- clean-database migration deploy/status checks
- Prisma runtime singleton guard
- TypeScript typecheck
- lint for changed source files
- standard Next.js production build
- N0C / WASM compatibility build
- staged-updater regression checks
- protected public-design guard
- Playwright visual smoke tests
- desktop/mobile/small-mobile horizontal-overflow checks
- live production responsive audit

Intentional changes to protected public visual files may require the `design-approved` PR label.

---

# Quick start

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

Configure at least the database, Auth secret, owner seed credentials and public site URL, then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Development URLs:

- Public site: `http://localhost:3000`
- Admin CMS: `http://localhost:3000/admin`

For production deployment, use the environment-specific installation guides rather than relying on the development Quick Start.

---

# Useful commands

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

# Documentation

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
| [Updates and CI](docs/wiki/Updates-and-CI.md) | Versioning, updater detection and GitHub Actions |
| [License and Credits](docs/wiki/License-and-Credits.md) | Attribution, redistribution and third-party notices |

The documentation under `docs/wiki/` remains version-controlled with the application and is structured to be GitHub-Wiki-ready.

---

# Contributing

Use feature/fix branches and Pull Requests. Keep CI green before merge.

```bash
git checkout -b feat/my-change
npm run typecheck
npm run lint
npm run build
git push -u origin feat/my-change
```

Then open a Pull Request against `main`.

---

# Security

Never commit:

- production database credentials
- Auth secrets
- payment-provider secrets
- API keys
- SMTP credentials
- private download URLs

Production security also depends on HTTPS, server patching, database/network restrictions, backups, logging and secure environment-variable management.

---

# License and credits

This repository is distributed under the MIT License. The original MIT notice for **PersonalBlog** is preserved in [`LICENSE`](LICENSE), together with attribution for the substantially modified Portfolio derivative.

- **Original foundation:** PersonalBlog by Syahril Arfian Almazril (`Arfazrll`)
- **Current derivative / project-specific development:** Dr Necrotix
- **Additional contributions:** respective repository contributors
- **Third-party libraries and services:** subject to their own licenses, terms and trademarks

See [License and Credits](docs/wiki/License-and-Credits.md) for full attribution and redistribution guidance.
