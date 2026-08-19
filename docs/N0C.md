# PlanetHoster N0C deployment

This guide covers deployment of the Portfolio/CMS on PlanetHoster N0C using the panel's Node.js application support and Phusion Passenger.

## N0C application settings

Use the following values when creating the Node.js application:

- **Domain:** `necrotixlab.com`
- **Path:** empty, so the application serves the domain root
- **App directory:** `/home/<account>/necrotixlab`
- **Boot file:** `server.js`
- **Application mode:** `Production`
- **Node.js:** use the newest supported LTS compatible with Next.js 16; prefer Node.js 22, otherwise Node.js 20

`server.js` creates a standard Node `http.Server` and calls `listen()`. Passenger intercepts the first `http.Server.listen()` call and binds the application to its managed socket, so the numeric fallback port is only used when the same file is started outside Passenger.

## Initial upload

From SSH, enter the document/application directory and clone the repository contents. If the directory already exists and is empty:

```bash
cd /home/<account>/necrotixlab
git clone https://github.com/drnecrotix/Portfolio.git .
```

For later updates:

```bash
cd /home/<account>/necrotixlab
git pull --ff-only origin main
```

Do not overwrite a directory containing another site or application.

## Environment

Production requires at minimum:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/portfolio?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
AUTH_TRUST_HOST=true
NEXT_PUBLIC_SITE_URL="https://necrotixlab.com"
OWNER_NAME="Dr Necrotix"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="replace-with-a-strong-password-at-least-12-characters"
```

Configure SMTP, R2, GitHub, WakaTime, Groq and Gemini only when those features are enabled. Never commit real credentials.

## Install, migrate and build

Run these commands through SSH after configuring the database and environment:

```bash
npm install --no-audit --no-fund
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:status
npm run db:seed
npm run build
```

The first production deployment should use `db:deploy`, not `prisma db push`.

`db:seed` is required for the initial OWNER bootstrap. Once the account exists and you have confirmed login, remove bootstrap password values from long-lived environment configuration if the N0C workflow allows it.

## Starting and restarting

N0C/Passenger starts the application from `server.js`. Use the panel's Start/Restart action after:

- the first successful build;
- environment-variable changes;
- a new deployment;
- dependency changes.

Do not use the Docker production stack on standard N0C Node.js hosting. The Docker files remain useful for VPS/HybridCloud deployments.

## Update procedure

Recommended release sequence:

```bash
cd /home/<account>/necrotixlab
git pull --ff-only origin main
npm install --no-audit --no-fund
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:status
npm run build
```

Then restart the Node.js application from N0C.

Before migrations, create a PostgreSQL backup or snapshot.

## Verification

After restart verify:

- `https://necrotixlab.com/`
- `https://necrotixlab.com/projects`
- `https://necrotixlab.com/blog`
- `https://necrotixlab.com/contact`
- `https://necrotixlab.com/admin`
- `https://necrotixlab.com/api/health`

The health endpoint should report a successful application/database state.

## Troubleshooting

If Passenger reports a startup failure:

1. confirm `server.js` is in the configured app directory;
2. confirm `.next/` exists after `npm run build`;
3. confirm `NODE_ENV=production`;
4. confirm all required environment variables are visible to the Node.js application;
5. check `npm run db:status` and database connectivity;
6. inspect the N0C/Passenger application logs;
7. temporarily use N0C Development mode only while diagnosing an error, then return to Production.
