# Dr Necrotix Portfolio

A full-stack personal portfolio, publishing platform and digital storefront built with **Next.js 16, PostgreSQL, Prisma and Auth.js**. It combines a public creative portfolio with a custom CMS for Projects, Blog, Gallery, Wiki content, pages, navigation, media, SEO, comments, redirects, site modes, users, digital products, orders and production updates.

> This repository is a heavily modified derivative of the MIT-licensed **PersonalBlog** project by **Syahril Arfian Almazril (Arfazrll)**. See [License and credits](docs/wiki/License-and-Credits.md).

## Live preview

**Production website:** [https://necrotixlab.com/](https://necrotixlab.com/)

**Current application version:** `1.2.19`

## Highlights

### Public portfolio

- CMS-managed visual homepage and identity.
- Projects archive and individual project pages.
- Blog/publications with multiple content types, comments, replies and likes.
- Gallery for artwork, photography and video content.
- Wiki / Articles / FAQ knowledge sections.
- Journey, Lab, Resume and dynamic CMS pages.
- Contact page and configurable footer/navigation.
- Day/Night themes.
- Responsive desktop, tablet and mobile layouts.
- Global and per-content SEO metadata.
- Open Graph and X/Twitter social previews.
- Sitemap, RSS and robots support.
- AI portfolio assistant when providers are configured.

### Digital Store

The public Store supports downloadable and externally hosted digital products without exposing private delivery URLs directly to customers.

- Free and paid digital products.
- Premium responsive marketplace-style catalog.
- Search, categories and sorting.
- Product detail pages and cart workflow.
- Per-item cart selection before checkout/download.
- Required acceptance of Terms and Digital Content Policy.
- Creem checkout integration.
- Lemon Squeezy variant integration.
- Local private product-file storage outside the public web directory.
- Optional masked external delivery links through the protected download route.
- Protected download grants instead of direct public file URLs.
- Media Library cover-image selection.

### Administration

The protected `/admin` area includes:

- Dashboard with database/application status and traffic overview.
- Projects and Blog editors with preview and draft recovery.
- SEO Title/Description assistance and editorial SEO health indicator.
- Comment moderation for OWNER/ADMIN.
- Pages, Homepage, Navigation and Footer management.
- Gallery and shared Media Library with Photo/Video workflows.
- Wiki/content management.
- Digital Store product management and Orders.
- Free/Paid product workflow with payment-provider selection.
- Creem product selection/creation through the API.
- Lemon Squeezy product/variant picker.
- In-place product save flow with saved/unsaved/error feedback.
- Global SEO, social thumbnails and structured custom meta tags.
- Redirect management.
- Users & Roles.
- Revision history where enabled.
- Site Mode controls.
- Application update/version status.

### Reliability and security

- OWNER/ADMIN protected administration.
- Auth.js credentials authentication with bcrypt password verification.
- Login throttling for repeated failed attempts.
- Active-user and role revalidation for protected admin requests.
- Real database health reporting in the Dashboard.
- CSP and additional security headers.
- Private digital-product delivery through controlled download grants.
- CI checks for TypeScript, lint, Prisma migrations, builds and responsive regressions.

## Self-updater

The Admin Dashboard can detect releases from `main/package.json` and install new versions from GitHub.

The updater uses a staged deployment workflow:

1. Download the latest `main` release.
2. Synchronize release-controlled files while preserving runtime data and uploads.
3. Install dependencies only when needed.
4. Generate Prisma Client and deploy migrations.
5. Build into a separate `.next-update` directory.
6. Activate the new build only after a successful staged build.
7. Preserve/restore the previous production build when activation fails.

From **v1.2.19**, the updater also protects upgrades from stale generated Next.js route types left behind after a route is removed.

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
- **Cloudflare R2 / S3 API** for supported media/storage workflows
- **Local private filesystem storage** for Digital Store files
- **Creem**
- **Lemon Squeezy**
- **Nodemailer / SMTP**
- **Framer Motion / GSAP / Lenis**
- **Playwright**
- **GitHub Actions**

## Quick start

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
npm ci
cp .env.example .env.local
```

On Windows PowerShell:

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
- Admin: `http://localhost:3000/admin`

For production deployment, do **not** rely only on this Quick Start. Use the environment-specific documentation below.

## Store configuration

For private Store file delivery, the application defaults to:

```text
<project>/storage/store-private
```

The directory is outside `public/` and ignored by Git. For production, a persistent absolute server path is recommended:

```env
STORE_PRIVATE_STORAGE_PATH="/absolute/private/path/necrotixlab-store"
```

Payment integrations are optional per product. Configure Creem and/or Lemon Squeezy only when paid products require them. Never commit API keys to the repository.

## Documentation

Detailed documentation is intentionally kept outside the README so the repository front page remains readable.

| Guide | Description |
| --- | --- |
| [Wiki Home](docs/wiki/Home.md) | Documentation index and recommended reading order. |
| [Requirements](docs/wiki/Requirements.md) | Runtime, database, hosting and environment requirements. |
| [Install on N0C / PlanetHoster](docs/wiki/Installation-N0C.md) | Passenger/N0C deployment and known hosting issues. |
| [Install on cPanel](docs/wiki/Installation-cPanel.md) | Generic cPanel Node.js deployment. |
| [Install on a Home Server](docs/wiki/Installation-Home-Server.md) | Linux self-hosting, reverse proxy, systemd/PM2 and network notes. |
| [Admin Dashboard](docs/wiki/Admin-Dashboard.md) | CMS modules and administrative workflows. |
| [SEO and Meta Tags](docs/wiki/SEO-and-Meta-Tags.md) | SEO editor, social previews and custom meta-tag syntax. |
| [Troubleshooting](docs/wiki/Troubleshooting.md) | Known N0C, Passenger, Prisma, CI and deployment issues/fixes. |
| [Updates and CI](docs/wiki/Updates-and-CI.md) | Versioning, updater detection, PR workflow and GitHub Actions. |
| [License and Credits](docs/wiki/License-and-Credits.md) | Original foundation, derivative work, contributors, dependencies and attribution rules. |

The files under `docs/wiki/` are structured as GitHub-Wiki-ready pages and remain version-controlled with the application.

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

## CI and responsive checks

Pull Requests are validated by GitHub Actions with checks including:

- release-version guard for deployed application changes
- Prisma schema and migration validation
- runtime Prisma singleton guard
- TypeScript typecheck
- lint of changed source files
- standard Next.js production build
- N0C / WASM compatibility build
- protected-design guard
- Playwright frontend visual smoke tests
- desktop/mobile horizontal-overflow checks
- live production responsive audit

## Contributing

Use feature/fix branches and Pull Requests. CI should be green before merge. Protected public visual files may require the `design-approved` PR label for intentional design changes.

Typical workflow:

```bash
git checkout -b feat/my-change
# make changes
npm run typecheck
npm run lint
npm run build
git push -u origin feat/my-change
```

Then open a Pull Request against `main`.

## Security

Never commit production secrets, database credentials, Auth secrets, payment-provider keys or private API keys. Deployment security also depends on HTTPS, database/network restrictions, server patching, backups and production log review.

Digital Store files intended to remain private should never be placed directly inside `public/`.

## License and credits

This repository is distributed under the MIT License. The original MIT notice for **PersonalBlog** is preserved in [`LICENSE`](LICENSE), together with an additional attribution notice for the substantially modified Portfolio derivative.

- **Original foundation:** PersonalBlog by Syahril Arfian Almazril (`Arfazrll`).
- **Current derivative / project-specific development:** Dr Necrotix.
- **Additional contributions:** respective repository contributors.
- **Third-party libraries and services:** remain subject to their own licenses, terms and trademarks.

See the full [License and Credits documentation](docs/wiki/License-and-Credits.md) for attribution, redistribution guidance and third-party notices.
