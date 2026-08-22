# Dr Necrotix Portfolio

A full-stack personal portfolio and content-management system built with **Next.js, PostgreSQL, Prisma and Auth.js**. It combines a protected visual portfolio with a custom CMS for Projects, Blog, Gallery, Pages, navigation, media, SEO, comments, redirects, site modes, users and production updates.

> This repository is a heavily modified derivative of the MIT-licensed **PersonalBlog** project by **Syahril Arfian Almazril (Arfazrll)**. See [License and credits](docs/wiki/License-and-Credits.md).

## Live preview

**Production website:** [https://necrotixlab.com/](https://necrotixlab.com/)

## Highlights

### Public portfolio

- CMS-managed visual homepage and identity.
- Projects archive and individual project pages.
- Blog/publications with multiple content types, comments, replies and likes.
- Gallery with **All / Photos / Videos** filtering.
- Dynamic CMS pages and contact page.
- Day/Night themes.
- Global and per-content SEO metadata.
- Open Graph and X/Twitter social previews.
- AI portfolio assistant when providers are configured.
- Responsive desktop/mobile layouts.

### Administration

The protected `/admin` area includes:

- Dashboard and Site Mode status.
- Projects and Blog editors with unsaved Preview.
- SEO Title/Description assistance and editorial SEO health indicator.
- Comment moderation for OWNER/ADMIN.
- Pages, Homepage, Navigation and Footer management.
- Gallery and shared Media Library with Photo/Video workflows.
- Global SEO, social thumbnails and structured custom meta tags.
- Redirect management.
- Users & Roles.
- Revision history where enabled.
- Application update/version status.

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
- **Cloudflare R2 / S3 API**
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

## Documentation

Detailed documentation is intentionally kept outside the README so the repository front page remains concise.

| Guide | Description |
| --- | --- |
| [Wiki Home](docs/wiki/Home.md) | Documentation index and recommended reading order. |
| [Requirements](docs/wiki/Requirements.md) | Runtime, database, hosting and environment requirements. |
| [Install on N0C / PlanetHoster](docs/wiki/Installation-N0C.md) | Passenger/N0C deployment and known hosting issues. |
| [Install on cPanel](docs/wiki/Installation-cPanel.md) | Generic cPanel Node.js deployment. |
| [Install on a Home Server](docs/wiki/Installation-Home-Server.md) | Linux self-hosting, reverse proxy, systemd/PM2 and network notes. |
| [Admin Dashboard](docs/wiki/Admin-Dashboard.md) | What the CMS modules and workflows do. |
| [SEO and Meta Tags](docs/wiki/SEO-and-Meta-Tags.md) | SEO editor, social previews and custom meta-tag syntax. |
| [Troubleshooting](docs/wiki/Troubleshooting.md) | Known N0C, Passenger, Prisma, CI, Gallery and Home issues/fixes. |
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
npm run test:visual     # Playwright visual smoke tests
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Development migration workflow
npm run db:seed         # Bootstrap/update OWNER account
npm run db:studio       # Prisma Studio
```

Production database migrations should use `prisma migrate deploy`; see the deployment guides.

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

Never commit production secrets, database credentials, Auth secrets or private API keys. Deployment security also depends on HTTPS, database/network restrictions, server patching, backups and production log review.

## License and credits

This repository is distributed under the MIT License. The original MIT notice for **PersonalBlog** is preserved in [`LICENSE`](LICENSE), together with an additional attribution notice for the substantially modified Portfolio derivative.

- **Original foundation:** PersonalBlog by Syahril Arfian Almazril (`Arfazrll`).
- **Current derivative / project-specific development:** Dr Necrotix.
- **Additional contributions:** respective repository contributors.
- **Third-party libraries and services:** remain subject to their own licenses, terms and trademarks.

See the full [License and Credits documentation](docs/wiki/License-and-Credits.md) for attribution, redistribution guidance and third-party notices.
