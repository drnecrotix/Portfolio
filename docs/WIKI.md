# Portfolio CMS Wiki

This page documents the Portfolio administration area, publishing workflow, SEO/meta controls, and production deployment on N0C/Passenger or cPanel-style Node hosting.

> Keep this document versioned with the application. Commands and hosting paths may differ by provider, so verify the active Node application root and environment before running production commands.

## 1. Admin Dashboard overview

The admin area is intentionally separated into functional sections rather than placing every tool on the Dashboard home screen.

### Dashboard

Use the Dashboard for a quick health/status overview. Content editing belongs in the dedicated modules below.

### Blog

- Create and edit posts.
- Choose a reusable post type and category.
- Use the rich text or poetry editor depending on the selected type.
- Set featured image, excerpt, tags, status, author, publication date and schedule.
- Use **Preview** to inspect the current unsaved form values before saving.
- SEO Title and SEO Description are populated from the post title and excerpt while the SEO fields are untouched. Editing an SEO field makes it independent from the source field.
- The SEO health indicator is an editorial helper, not a Google ranking score.
- Blog comments are moderated from the dedicated Comments section. OWNER/ADMIN users can remove spam comments and replies.

### Projects

- Create and edit project pages.
- Manage title, slug, category, short description and long rich-text description.
- Insert supported project blocks with shortcodes such as `[[mission]]`, `[[features]]`, `[[chronicles]]`, and `[[installation]]`.
- Set cover image, status, technologies, tools, highlights, repository/demo URLs and project metadata.
- Use **Preview** to inspect unsaved changes before final save.
- SEO Title and SEO Description follow the title and short description until manually edited.

### Gallery

The Gallery editor follows a simplified media-library workflow.

1. Add media.
2. Select **Photo** or **Video**.
3. Choose/upload the media file.
4. Add title and description.
5. For Video only, optionally choose a thumbnail override.
6. Set visibility and order.

The public Gallery filters **All / Photos / Videos** using the saved media type. The automatic `public/gallery` image scan is only a fallback when no manually configured gallery items exist.

### Homepage

Homepage settings edit the protected Hero copy, links, tooltips, profile card content and sharing metadata.

The **Social thumbnails & meta tags** section contains:

- **Default social thumbnail**: fallback preview image.
- **Open Graph thumbnail**: optional override used by clients that consume Open Graph, including Facebook, LinkedIn, Discord and many chat/social preview systems.
- **X / Twitter thumbnail**: optional X Card override.
- **Custom meta tags**: structured extra `<meta>` values rendered safely into `<head>`.

Raw HTML is deliberately not accepted for custom meta tags.

### Media Library

Shared media uploaded from editors is available to Blog, Projects, Gallery, Homepage and other CMS modules. Prefer Media Library URLs over duplicated static files.

### Site Mode

Controls maintenance/coming-soon style public modes and templates. Site Mode owns its own viewport and should not inherit the normal public Navbar/Footer.

### SEO / global settings

Global SEO defaults provide fallback title, description, keywords, author/creator data, Open Graph values, X Card values, robots directives and verification data. Page-level Blog/Project SEO can override the relevant title and description.

---

## 2. Unsaved Preview workflow

Blog and Project forms provide an **Unsaved preview** action.

- Preview reads the current form state.
- It does not create, update or publish a database record.
- It opens a sandboxed preview frame so editor HTML cannot execute scripts in the Admin application.
- After reviewing the content, close Preview and use the normal Save/Publish action.

Preview is intended to catch layout/content mistakes before the final database write.

---

## 3. SEO editor and health indicator

### Auto-filled fields

When SEO fields have not been manually edited:

- Blog SEO Title follows the Blog Title.
- Blog SEO Description follows the Excerpt.
- Project SEO Title follows the Project Title.
- Project SEO Description follows the Short description.

As soon as an SEO input is edited manually, that field becomes independent and remains freely editable.

### Health states

The CMS reports **Good**, **Medium**, or **Poor** using a practical editorial heuristic. It checks whether the page has:

- a descriptive SEO title;
- a useful title length;
- a meaningful SEO description;
- a useful description length;
- a readable slug;
- a featured/share image.

This score does **not** predict ranking. Google can generate or rewrite title links and snippets according to the search query and page content.

Google Search documentation:

- Title links: https://developers.google.com/search/docs/appearance/title-link
- Snippets/meta descriptions: https://developers.google.com/search/docs/appearance/snippet
- JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

### Meta description notes

Google does not define a strict character limit for `<meta name="description">`. Search result snippets are truncated according to available display width and may be generated from page content instead. The CMS therefore treats length ranges as editor guidance rather than hard validation.

### Open Graph and social previews

Typical Open Graph markup:

```html
<meta property="og:title" content="Page title">
<meta property="og:description" content="Page summary">
<meta property="og:image" content="https://example.com/share.jpg">
<meta property="og:url" content="https://example.com/page">
```

X/Twitter cards typically use:

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page title">
<meta name="twitter:description" content="Page summary">
<meta name="twitter:image" content="https://example.com/share-x.jpg">
```

The application already generates standard Open Graph and X metadata through the Next.js Metadata API.

---

## 4. Custom meta tag syntax

Homepage Admin accepts one structured tag per line.

### `name` meta tag

```text
name:application-name=Necrotix Lab
name:theme-color=#0a0a0f
name:author=Dr Necrotix
```

Produces the equivalent of:

```html
<meta name="application-name" content="Necrotix Lab">
```

### `property` meta tag

```text
property:profile:username=drnecrotix
```

Produces:

```html
<meta property="profile:username" content="drnecrotix">
```

### Important rules

- One tag per line.
- Format: `name:key=value` or `property:key=value`.
- Do not paste raw `<meta>` HTML.
- Do not duplicate existing Open Graph/X/robots tags unless there is a specific reason.
- Search engines may ignore unsupported or redundant metadata.

---

## 5. Production environment variables

The production Node process must receive the same required environment variables that the build/runtime expects.

At minimum verify values such as:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&connection_limit=1&pool_timeout=20
AUTH_SECRET=...
```

Actual required variables depend on enabled services. Never commit production secrets to GitHub.

### Prisma connection parameters

On shared hosting/Passenger, multiple Node processes can create more database sessions than expected. The project has previously experienced many idle Prisma/PostgreSQL connections. A conservative production connection string can include:

```text
connection_limit=1&pool_timeout=20
```

Adjust only after observing the hosting/database limits.

---

## 6. N0C / PlanetHoster / Passenger deployment

The project uses a Next.js production build under a Passenger-managed Node environment.

### Recommended deployment sequence

From the application root:

```bash
node --version
npm --version
npm ci
npx prisma generate
npx prisma migrate deploy
npm run production:preflight
npm run build:n0c
```

If the host provides the normal native SWC environment and `npm run build` is known to work, it can be used. For the N0C environment this project includes the WASM-oriented build command:

```bash
npm run build:n0c
```

After deploying the build, restart the Node/Passenger application from the hosting control panel. On Passenger environments that support restart files, the provider may use a mechanism similar to:

```bash
mkdir -p tmp
touch tmp/restart.txt
```

Use the host's documented restart method when available.

### Health verification

After restart:

1. Open the public site.
2. Verify the health/status endpoint if configured.
3. Check Admin dashboard/application status.
4. Verify database-backed routes such as Blog/Projects/Admin.
5. Check server logs for Prisma, Passenger, environment or build errors.

---

## 7. cPanel Node.js deployment

Exact screens differ by host, but the general flow is:

1. Create a Node.js application in cPanel.
2. Select the supported Node version used by CI/production.
3. Point **Application root** to the repository/application directory.
4. Configure the domain/application URL.
5. Add production environment variables in the Node app interface.
6. Open Terminal/SSH in the application root.
7. Install/build:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run production:preflight
npm run build
```

If native SWC cannot run on the host, use:

```bash
npm run build:n0c
```

8. Restart the Node application from cPanel.
9. Verify logs and database connectivity.

Do not run `prisma migrate dev` in production. Production deployment should use:

```bash
npx prisma migrate deploy
```

---

## 8. Known deployment problems and fixes

### Passenger HTTP 500 caused by `.htaccess`

A previous production incident was caused by a conflicting `.htaccess` rewrite rule that intercepted requests before Passenger handled the Next.js application.

Symptoms:

- immediate HTTP 500;
- application health endpoint not reaching Next.js;
- Passenger routing behaving inconsistently.

Fix:

- remove/disable conflicting legacy rewrite directives;
- keep only the hosting/Passenger rules required by the active Node application;
- restart Passenger and test the health endpoint again.

### Application reachable but database unavailable

After the routing issue was fixed, the application could be reached while database-backed health remained degraded.

Check:

```bash
printenv | grep DATABASE
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Important: an environment variable visible in an interactive SSH shell is not automatically guaranteed to exist inside the Passenger process. Configure variables in the hosting Node application environment and restart the app.

### Too many / idle Prisma database sessions

Symptoms can include connection exhaustion, timeouts or a database provider reporting many idle sessions.

Mitigations used by this project:

- reuse a production Prisma singleton;
- avoid creating a new PrismaClient per request/module refresh;
- keep shared-hosting connection limits conservative;
- bundle dashboard/status queries where possible;
- use `connection_limit=1` and an appropriate `pool_timeout` when required by the host.

### Native SWC/build failure on shared hosting

The repository includes `@next/swc-wasm-nodejs` and an N0C-specific build command. Use:

```bash
npm run build:n0c
```

when the hosting platform cannot execute the normal native SWC binary reliably.

### Typecheck/lint/build failures while visual checks pass

A visual smoke test passing does not mean a release is deployable. CI also checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Resolve these before merge/release.

### Protected frontend design guard

Several public design files are protected by CI. Pull requests touching them require the `design-approved` label.

Important GitHub Actions behavior discovered during development: if the label is added **after** the original pull_request event, rerunning that old workflow may still use the old event payload and fail the design guard. After adding `design-approved`, trigger a fresh `synchronize` event with a new commit so CI receives the updated PR labels.

---

## 9. Safe update checklist

Before merging a release:

```text
[ ] Version number updated when Admin updater must detect a new release
[ ] Prisma schema validated
[ ] Production migrations included if schema changed
[ ] Typecheck green
[ ] Lint green
[ ] Build / N0C build green
[ ] Visual smoke green
[ ] design-approved present when protected frontend files changed
[ ] Environment changes documented
[ ] No secrets committed
```

After merge/deployment:

```text
[ ] Admin updater sees the expected version
[ ] App restarted
[ ] Home page checked on mobile and desktop
[ ] Blog and Projects database reads tested
[ ] Gallery filters tested
[ ] Social metadata inspected in page source
[ ] Production logs checked for new errors
```

---

## 10. Useful commands

```bash
# Install exact dependencies
npm ci

# Prisma client
npx prisma generate

# Validate schema
npx prisma validate

# Production DB migrations
npx prisma migrate deploy

# Migration state
npx prisma migrate status

# Static type checking
npm run typecheck

# ESLint
npm run lint

# Standard production build
npm run build

# N0C / WASM SWC build
npm run build:n0c

# Production environment preflight
npm run production:preflight

# Start built application where direct Node start is supported
npm start
```

## 11. Documentation maintenance

Update this file whenever:

- Admin modules gain or remove features;
- deployment commands change;
- Prisma or Next.js deployment behavior changes;
- new production incidents reveal a reusable troubleshooting step;
- SEO/social metadata behavior changes.
