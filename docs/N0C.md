# PlanetHoster N0C deployment

This guide covers deployment of the Portfolio/CMS on PlanetHoster N0C using the panel's Node.js application support and Phusion Passenger.

## N0C application settings

Use the following values when creating the Node.js application:

- **Domain:** `necrotixlab.com`
- **Path:** empty, so the application serves the domain root
- **App directory:** `/home/<account>/necrotixlab`
- **Document root:** `/home/<account>/necrotixlab/public`
- **Boot file:** `server.js`
- **Application mode:** `Production`
- **Node.js:** use Node.js 22 when available

The application root and document root are intentionally different. Passenger starts `server.js` from the app directory while the domain document root points at `public/`.

`server.js` creates a standard Node `http.Server` and calls `listen()`. Passenger intercepts the first `http.Server.listen()` call and binds the application to its managed socket, so the numeric fallback port is only used when the same file is started outside Passenger.

The startup file loads `.env` from the application directory before Next.js initializes, fixes the working directory to the application root, and restores the canonical public host/protocol headers from `AUTH_URL` or `NEXT_PUBLIC_SITE_URL`. This is required because the N0C Passenger proxy may otherwise expose the backend origin as `localhost:3000`, which breaks Auth.js callback URLs.

## Initial upload

From SSH, enter the document/application directory and clone the repository contents. If the directory already exists and is empty:

```bash
cd /home/<account>/necrotixlab
git clone https://github.com/drnecrotix/Portfolio.git .
```

If N0C has already created files in the application directory, clone to a temporary directory and copy the repository contents without overwriting N0C-specific configuration until it has been reviewed.

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
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/portfolio?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
AUTH_URL="https://necrotixlab.com"
AUTH_TRUST_HOST=true
NEXT_PUBLIC_SITE_URL="https://necrotixlab.com"
OWNER_NAME="Dr Necrotix"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="replace-with-a-strong-password-at-least-12-characters"
```

Keep `.env` outside the public document root and restrict its permissions, for example `chmod 600 .env`. Configure SMTP, R2, GitHub, WakaTime, Groq and Gemini only when those features are enabled. Never commit real credentials.

If a database password contains URL-significant characters, URL-encode the password when constructing `DATABASE_URL`.

## Install, migrate and build

Activate the Node.js environment created by N0C before running application commands. The exact path is shown by the panel and typically looks like:

```bash
source /home/<account>/nodevenv/necrotixlab/22/bin/activate
```

Then run:

```bash
cd /home/<account>/necrotixlab
npm install --no-audit --no-fund
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:status
npm run db:seed
npm run build:n0c
```

The first production deployment should use `db:deploy`, not `prisma db push`.

`db:seed` is required for the initial OWNER bootstrap. Once the account exists and you have confirmed login, remove bootstrap password values from long-lived environment configuration if the deployment workflow allows it.

### Why N0C uses the Webpack build

The current N0C runtime can have an older glibc than the native Next.js/Turbopack SWC binary requires. A normal `next build` may therefore fail while loading the native SWC module. `npm run build:n0c` runs `next build --webpack`, which allows Next.js to use its WASM fallback on this hosting environment.

### Prisma engine compatibility

The Prisma client is generated for both the native development environment and the Debian/OpenSSL runtime used by N0C Passenger:

```prisma
binaryTargets = ["native", "debian-openssl-1.1.x"]
```

Run `npm run db:generate` after installing dependencies or changing the Prisma schema. If `/api/health` reports `database: unavailable` while a direct shell Prisma query succeeds, verify that the generated client contains the N0C-compatible query engine.

## Passenger configuration

A typical `public/.htaccess` configuration is:

```apache
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/<account>/necrotixlab"
PassengerBaseURI "/"
PassengerNodejs "/home/<account>/nodevenv/necrotixlab/22/bin/node"
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

PassengerAppEnv production
PassengerFriendlyErrorPages off
```

Do not place application secrets in `.htaccess`.

Also inspect any `.htaccess` inherited from the account home directory. On the verified N0C deployment, a conflicting inherited rewrite rule caused an internal redirect loop before Passenger could execute the application. Keep such a rule disabled or have PlanetHoster support replace it with a rule that does not affect the Node.js application.

## Starting and restarting

N0C/Passenger starts the application from `server.js`. Use the panel's Start/Restart action after:

- the first successful build;
- environment-variable changes;
- a new deployment;
- dependency changes;
- Prisma client regeneration when the running process already exists.

Do not use the Docker production stack on standard N0C Node.js hosting. The Docker files remain useful for VPS/HybridCloud deployments.

## Update procedure

Recommended release sequence:

```bash
cd /home/<account>/necrotixlab
source /home/<account>/nodevenv/necrotixlab/22/bin/activate
git pull --ff-only origin main
npm install --no-audit --no-fund
npm run db:generate
npm run db:validate
npm run db:deploy
npm run db:status
npm run build:n0c
```

Then restart the Node.js application from N0C.

Before migrations, create a PostgreSQL backup or snapshot.

## Verification

After restart verify:

- `https://necrotixlab.com/`
- `https://necrotixlab.com/projects`
- `https://necrotixlab.com/blog`
- `https://necrotixlab.com/contact`
- `https://necrotixlab.com/admin/login`
- `https://necrotixlab.com/admin`
- `https://necrotixlab.com/api/health`
- `https://necrotixlab.com/api/auth/providers`

The health endpoint should report `status: ok` and `database: ok`. The Auth.js providers endpoint should generate sign-in and callback URLs on `https://necrotixlab.com`, never `localhost:3000`.

## Troubleshooting

If Passenger reports a startup failure:

1. confirm `server.js` is in the configured app directory;
2. confirm `.next/` exists after `npm run build:n0c`;
3. confirm `NODE_ENV=production`;
4. confirm `.env` is readable from the app directory and the required variables are loaded before Next.js initializes;
5. check `npm run db:status` and database connectivity;
6. regenerate Prisma and confirm the N0C binary target is present;
7. inspect `public/.htaccess` and inherited parent-directory rewrite rules;
8. verify `/api/auth/providers` is using the public domain rather than `localhost:3000`;
9. inspect the N0C/Passenger application logs;
10. temporarily use N0C Development mode only while diagnosing an error, then return to Production.

After a successful deployment, remove temporary diagnostic startup logging or one-off Prisma probes added during troubleshooting.
