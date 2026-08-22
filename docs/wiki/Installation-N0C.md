# Installation on N0C / PlanetHoster

This guide documents the deployment pattern used for the Portfolio project on a PlanetHoster N0C/CloudLinux-style environment with Passenger-managed Node.js.

## 1. Prepare the application

Clone or update the repository in the application root used by the Node app.

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
```

For an existing installation:

```bash
git fetch --all --prune
git checkout main
git pull --ff-only
```

Do not overwrite a production installation with unrelated branch files.

## 2. Select the Node version

The project CI currently uses Node.js 22. Match that version where possible.

```bash
node --version
npm --version
```

If N0C provides a Node selector, configure the application to use Node 22 before installing packages.

## 3. Configure environment variables

Configure variables in the N0C Node application settings, not only in the interactive SSH shell.

Typical values:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&connection_limit=1&pool_timeout=20
AUTH_SECRET=your-production-secret
```

Add any storage/API variables required by the active installation.

### Important Passenger detail

One of the production problems encountered during the original setup was that `DATABASE_URL` could be visible in SSH but missing inside the Passenger application process.

Always restart the Node application after changing environment variables.

## 4. Install dependencies

From the application root:

```bash
npm ci
```

If the lockfile intentionally changed, update the repository first rather than running an uncontrolled dependency upgrade directly on production.

## 5. Generate Prisma Client

```bash
npx prisma generate
```

The project currently uses Prisma 6. Do not perform a major Prisma upgrade during a production incident merely because the CLI reports a newer major version.

## 6. Validate and deploy the database

```bash
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
```

`migrate deploy` is the production command. Avoid `migrate dev` on N0C production.

## 7. Run production preflight

```bash
npm run production:preflight
```

If this reports a missing environment variable, fix the Node application environment rather than hardcoding the secret in source files.

## 8. Build for N0C

The normal build is:

```bash
npm run build
```

The N0C environment used by this project previously had native SWC compatibility problems. The repository therefore provides:

```bash
npm run build:n0c
```

Use the N0C/WASM build path when the native SWC binary cannot execute reliably on CloudLinux/shared hosting.

## 9. Restart Passenger

Use the restart control provided by N0C/PlanetHoster.

On Passenger installations where restart files are supported, the mechanism may resemble:

```bash
mkdir -p tmp
touch tmp/restart.txt
```

Prefer the host's official restart button/method if available.

## 10. Verify the deployment

After restart verify:

1. Home page loads.
2. `/admin` loads after authentication.
3. Blog and Projects can read from PostgreSQL.
4. Media Library can load.
5. Gallery renders.
6. Application health/status route, if enabled, reports correctly.
7. Server logs do not contain repeating Passenger/Prisma errors.
8. Admin Updater displays the expected application version.

## Recommended update sequence

For a normal release update:

```bash
git checkout main
git pull --ff-only
npm ci
npx prisma generate
npx prisma migrate deploy
npm run production:preflight
npm run build:n0c
```

Then restart Passenger and verify the site.

# Problems encountered while setting up this project

## `.htaccess` rewrite caused HTTP 500

A legacy/conflicting `.htaccess` rule intercepted requests before Passenger could correctly route them to the Next.js application.

Symptoms included:

- immediate HTTP 500;
- Next.js health/application routes not being reached;
- Passenger appearing configured while the application remained unavailable.

Resolution:

- remove obsolete PHP/static rewrites;
- preserve only the rules N0C/Passenger needs for the active Node application;
- restart Passenger;
- test a simple application route before debugging Prisma.

Do not assume every HTTP 500 is a database issue. Confirm that the request reaches Node first.

## Passenger process did not receive database environment variables

The shell environment and the Passenger runtime environment are not necessarily identical.

A variable may appear with:

```bash
printenv | grep DATABASE
```

while the web application still cannot see it.

Resolution:

- define `DATABASE_URL` in the N0C Node application environment;
- save the application configuration;
- restart Passenger;
- retest database-backed routes.

## Too many idle PostgreSQL sessions

During production troubleshooting, multiple Passenger Node processes resulted in a larger number of Prisma/PostgreSQL connections than expected. The database showed idle sessions and there was a risk of exhausting the shared-hosting connection limit.

The project was hardened by:

- using one shared Prisma runtime singleton;
- avoiding repeated `new PrismaClient()` instances;
- reducing duplicated Dashboard DB queries;
- adding conservative Prisma URL parameters on shared hosting:

```text
connection_limit=1&pool_timeout=20
```

If database limits differ, tune these values rather than increasing them blindly.

## Native Next.js SWC failed on the host

Shared CloudLinux environments can reject or fail to execute the native Next.js SWC binary.

Resolution used by this repository:

```bash
npm run build:n0c
```

The N0C build uses the compatibility/WASM path included in the project.

## Build succeeds locally but fails on N0C

Possible causes:

- different Node version;
- missing production environment variables;
- memory limit;
- native binary incompatibility;
- stale `node_modules`;
- stale `.next` build;
- Passenger using another application root.

Recommended recovery:

```bash
rm -rf .next
npm ci
npx prisma generate
npm run production:preflight
npm run build:n0c
```

Avoid deleting production database files or migrations while troubleshooting a build.

## Application works but updater does not report a change

The Admin updater detects version changes. A code-only merge that keeps the same package version may not appear as a new update.

For a release that must be visible in Admin, increment the application version before merge.

## Prisma CLI displays a major-version update notice

The CLI may advertise Prisma 7 while the project currently runs Prisma 6. This notice is not itself an error.

Do not upgrade major Prisma versions during an outage or deployment fix. Major upgrades should be a separate tested change.

## N0C troubleshooting order

When the site is down, test layers in this order:

```text
1. Domain/DNS/HTTPS
2. Passenger/Node routing
3. Application environment variables
4. Node dependencies
5. Prisma client generation
6. PostgreSQL connectivity
7. Migrations
8. Next.js build
9. Passenger restart
10. Public/Admin smoke test
```

This order prevents spending time on Prisma when the request is actually being blocked by Apache/Passenger routing.
