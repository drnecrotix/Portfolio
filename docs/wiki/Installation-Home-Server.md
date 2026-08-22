# Installation on a Home Server

This guide covers a self-managed Linux server in a home network or lab.

Recommended architecture:

```text
Internet
  -> Router / Firewall
  -> Reverse proxy (Nginx, Caddy or Apache)
  -> Portfolio Node.js application
  -> PostgreSQL
```

Do not expose PostgreSQL directly to the public internet.

## Recommended platform

Use a current LTS Linux distribution such as Ubuntu Server or Debian.

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

Install Node.js 22 and verify:

```bash
node --version
npm --version
```

## PostgreSQL

Install PostgreSQL locally or use a separate trusted database server.

```bash
sudo apt install -y postgresql postgresql-contrib
```

Create a dedicated database and application user. Do not run the application as the PostgreSQL superuser.

## Application user

Prefer a dedicated non-root Linux account:

```bash
sudo adduser portfolio
sudo -iu portfolio
```

Clone and install:

```bash
git clone https://github.com/drnecrotix/Portfolio.git
cd Portfolio
npm ci
```

## Environment variables

Store production variables in a protected environment file or process-manager configuration that is not committed to Git.

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://portfolio.example.com
DATABASE_URL=postgresql://portfolio:PASSWORD@127.0.0.1:5432/portfolio?schema=public
AUTH_SECRET=your-long-random-secret
```

On a dedicated server you usually do not need the very small shared-hosting Prisma pool used on N0C. Tune database limits according to actual server capacity.

## Prisma setup

```bash
npx prisma generate
npx prisma validate
npx prisma migrate deploy
```

## Build

```bash
npm run production:preflight
npm run build
```

Use the standard build on a normal Linux server. `build:n0c` is intended for restricted hosts where native SWC cannot run reliably.

## Run with systemd

Example service:

```ini
[Unit]
Description=Portfolio Next.js application
After=network.target postgresql.service

[Service]
Type=simple
User=portfolio
WorkingDirectory=/home/portfolio/Portfolio
Environment=NODE_ENV=production
EnvironmentFile=/home/portfolio/Portfolio/.env.production.local
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Adjust paths to the real Node/npm installation.

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now portfolio
sudo systemctl status portfolio
```

## Alternative: PM2

```bash
npm install -g pm2
pm2 start npm --name portfolio -- start
pm2 save
pm2 startup
```

Use one process-management strategy deliberately. Do not run systemd, PM2 and another supervisor around the same process unless you understand the consequences.

## Reverse proxy with Nginx

The application can listen on localhost, for example port 3000, while Nginx serves the public HTTPS endpoint.

```nginx
server {
    listen 80;
    server_name portfolio.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use Certbot, Caddy or another trusted mechanism for TLS.

## Router and firewall

For public hosting from home:

- forward only HTTP/HTTPS ports to the reverse proxy;
- never forward PostgreSQL 5432 publicly;
- prefer SSH keys;
- restrict SSH exposure where possible;
- enable a host firewall;
- keep the OS and dependencies patched.

Example UFW baseline:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Dynamic public IP / CGNAT

If the ISP changes your IP, use dynamic DNS or an API-driven DNS update.

If the connection uses CGNAT, normal inbound port forwarding may not work. Possible approaches include:

- request a public/static IP from the ISP;
- use Cloudflare Tunnel or a comparable reverse tunnel;
- host the reverse proxy on a VPS and tunnel back home.

## Backups

Back up at least:

- PostgreSQL database;
- uploaded media/local persistent storage;
- environment configuration/secrets in a secure backup;
- repository/custom deployment files not already in Git.

Test restoration, not only backup creation.

## Updating

```bash
git checkout main
git pull --ff-only
npm ci
npx prisma generate
npx prisma migrate deploy
npm run production:preflight
npm run build
sudo systemctl restart portfolio
```

If PM2 is used, restart the PM2 process instead.

## Home server troubleshooting

### Site works locally but not from the internet

Check:

- router port forwarding;
- host firewall;
- ISP CGNAT;
- DNS record;
- reverse-proxy `server_name`;
- TLS certificate;
- whether Node is actually listening.

### Reverse proxy returns 502

Check:

```bash
sudo systemctl status portfolio
curl http://127.0.0.1:3000
```

A 502 usually means the proxy cannot reach the Node process.

### Database connection refused

Confirm PostgreSQL is running and the application uses the correct local/private host:

```bash
sudo systemctl status postgresql
npx prisma migrate status
```

### Build consumes too much RAM

Add sufficient RAM/swap or build on a stronger machine/environment and deploy using a controlled artifact workflow. Do not hide real OOM problems with repeated restarts.
