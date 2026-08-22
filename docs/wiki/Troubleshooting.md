# Troubleshooting

This page collects reusable fixes for problems encountered while developing and deploying the Portfolio project.

## N0C / Passenger: HTTP 500 immediately after deployment

A previous production incident was caused by conflicting `.htaccess` rewrite rules intercepting requests before Passenger handled the Next.js application.

Symptoms:

- immediate HTTP 500;
- application health route not reaching Next.js;
- Passenger configuration appears enabled but requests fail before Node logic runs.

Resolution:

1. Inspect `.htaccess` and hosting-generated Passenger rules.
2. Remove obsolete PHP/static rewrites that capture the Node application routes.
3. Preserve the rules required by the active Node application.
4. Restart Passenger.
5. Test a simple Node/Next.js route before debugging Prisma.

## N0C: DATABASE_URL visible in SSH but not in the application

The interactive shell environment and Passenger application environment can differ.

A successful:

```bash
printenv | grep DATABASE
```

does not prove that the Passenger process has the same value.

Resolution:

- configure `DATABASE_URL` in the hosting Node application settings;
- save the configuration;
- restart Passenger;
- retest a database-backed route.

## Prisma: too many idle connections

The project previously showed many idle PostgreSQL sessions because multiple Passenger Node processes could each maintain Prisma connections.

Mitigations used by the project:

- one shared Prisma runtime singleton;
- no scattered `new PrismaClient()` instances;
- bundled Dashboard/status queries where possible;
- conservative shared-hosting pool parameters:

```text
connection_limit=1&pool_timeout=20
```

Do not increase the pool without checking the provider's actual connection limit.

## Prisma migration state

Useful checks:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
```

Production should use `migrate deploy`, not `migrate dev`.

## Prisma major-version upgrade notice

The Prisma CLI may display a newer major release. This notice is not a deployment failure.

Do not perform a Prisma major upgrade during an outage or unrelated release fix. Major upgrades should be isolated and tested separately.

## Next.js native SWC fails on shared hosting

The N0C environment used by the project previously had trouble executing the native SWC binary.

Use the repository's compatibility build:

```bash
npm run build:n0c
```

This is preferable to randomly replacing Next.js dependencies on production.

## Build works locally but fails on N0C/cPanel

Check for:

- different Node version;
- missing production environment variables;
- memory/resource limits;
- stale `node_modules`;
- stale `.next` output;
- native binary incompatibility;
- wrong application root.

Safe recovery sequence:

```bash
rm -rf .next
npm ci
npx prisma generate
npm run production:preflight
npm run build:n0c
```

Do not delete production migrations or database data to solve a build problem.

## Visual smoke passes but CI still fails

Visual smoke is only one CI job. A release can still fail because of:

- TypeScript errors;
- ESLint errors;
- production build errors;
- N0C compatibility build errors;
- protected design guard.

Always inspect the exact failed job.

## React 19 lint: setState inside useEffect

The repository's lint configuration catches synchronous `setState()` in effects in several situations.

Avoid solving this by globally disabling the rule. Prefer:

- derived state;
- resetting state inside the user action that changes the relevant mode/filter;
- asynchronous callbacks when synchronizing with external systems;
- removing redundant state entirely.

This issue previously affected Home preload logic, MediaPicker and Gallery filter state.

## Protected design guard fails after adding `design-approved`

GitHub Actions pull-request event payloads are fixed at the time the event is created.

If `design-approved` is added after the original event, rerunning that old workflow may still fail because it sees the old label list.

Resolution:

1. add `design-approved`;
2. push/synchronize a new commit;
3. let the fresh pull-request event start a new workflow.

## Admin updater does not show a merged change

The updater relies on release/version information. If code is merged while the package version stays unchanged, the updater may have nothing new to report.

Resolution: bump the application version as part of releases that must be detectable by Admin.

## Gallery video appears selectable but upload fails

The UI and upload API must agree on supported media types.

The project previously had a mismatch where Gallery exposed Video but MediaPicker/API did not fully support video uploads.

Current video support should include the configured allowlist such as MP4, WebM, Ogg and MOV/QuickTime.

If this breaks again, check both:

- `MediaPicker` filtering/`accept` value;
- `/api/media` MIME and extension allowlists.

## Home mobile blank space below Footer

Mobile browser chrome changes viewport height dynamically. Fixed-height viewport layers can create scrollable blank regions when several wrappers compete.

The Home layout should avoid stacking multiple independent `100vh/min-h-screen` contracts. The mobile shell uses dynamic viewport behavior and the Hero should fill only the intended remaining space.

When debugging, inspect Navbar, Home shell, Home client, Hero and Footer together rather than adding another arbitrary height override.

## Home LinkedIn icon positioning

The intended composition places the LinkedIn icon in the visual gap between Hero Line 1 and Hero Line 2, before the second line, matching the desktop concept.

Avoid offsets that place the icon over the `DR.` text or make it an inline character inside the second line.

## Passenger / cPanel wrong application root

A common deployment trap is editing one repository directory while the hosting control panel runs another directory.

Verify the exact Application Root before installing, building or restarting.

## Reverse proxy 502 on a home server

A 502 usually means the proxy cannot reach the Node application.

Check:

```bash
curl http://127.0.0.1:3000
sudo systemctl status portfolio
```

Then inspect Nginx/Caddy/Apache logs.

## Security rule

Do not solve hosting errors by committing `.env`, database passwords, API keys or authentication secrets to the repository.
