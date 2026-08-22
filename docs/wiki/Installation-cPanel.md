# Installation on cPanel

This guide covers a typical cPanel hosting environment with **Setup Node.js App**, **Application Manager**, or a similar Node application interface.

## 1. Create the Node application

In cPanel:

1. Open the Node.js application manager.
2. Create a new application.
3. Select Node.js 22 if available.
4. Set **Production** mode.
5. Set the **Application root** to the Portfolio repository directory.
6. Attach the required domain/subdomain.
7. Configure the application startup method according to the provider's Node/Passenger integration.

The exact UI differs by hosting company.

## 2. Upload or clone the repository

Using SSH/Terminal:

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
```

For updates:

```bash
git checkout main
git pull --ff-only
```

## 3. Configure environment variables

Define production variables in the cPanel Node application environment.

Example:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
AUTH_SECRET=your-long-production-secret
```

If the hosting plan has a small PostgreSQL connection limit, consider the project's shared-hosting settings:

```text
connection_limit=1&pool_timeout=20
```

Add integration-specific secrets separately.

Never place secrets in Git-tracked source files.

## 4. Install dependencies

```bash
npm ci
```

## 5. Prepare Prisma

```bash
npx prisma generate
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
```

Use `migrate deploy` in production.

## 6. Run preflight

```bash
npm run production:preflight
```

Fix missing variables before building.

## 7. Build

Try the standard build:

```bash
npm run build
```

If the hosting provider uses a CloudLinux/N0C-like environment where native SWC fails, the repository includes:

```bash
npm run build:n0c
```

## 8. Restart the application

Use the cPanel **Restart Application** action after:

- changing environment variables;
- pulling a new release;
- rebuilding;
- deploying migrations when the application needs a fresh process.

## 9. Verify

Check:

- public Home;
- Blog;
- Projects;
- Gallery;
- Admin login;
- Media Library;
- database connectivity;
- server error log;
- Admin Updater version.

## Common cPanel problems

### Wrong Application root

If cPanel points to a parent/old directory, the Node process can run another copy of the site while SSH commands are executed elsewhere.

Confirm the exact application root before deployment.

### Environment variable visible in shell but not in app

The Node manager may have its own environment. Configure variables there and restart the application.

### HTTP 500 after enabling Node app

Check:

- startup configuration;
- `.htaccess` or Apache proxy rules;
- Node version;
- build output;
- application logs;
- missing environment variables.

### Build killed because of memory

Shared cPanel hosting may have a build memory limit. Possible solutions:

- build during lower load;
- use the provider-supported compatible Node version;
- use `npm run build:n0c` when the problem is SWC-specific;
- upgrade the hosting resource limit if the process is genuinely OOM-killed.

### Database connection exhaustion

Use the shared Prisma singleton already present in the project and keep connection pool settings appropriate for the host.

## Production update checklist

```bash
git checkout main
git pull --ff-only
npm ci
npx prisma generate
npx prisma migrate deploy
npm run production:preflight
npm run build
```

Use `npm run build:n0c` instead of the normal build only when the hosting environment requires it. Restart the application afterward.
