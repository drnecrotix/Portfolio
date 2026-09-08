# Holehe integration (email → registered accounts)

Holehe checks whether an email is registered on **120+** services via registration / password-recovery endpoints. It does **not** send email to the target and does **not** return passwords.

## Architecture

```
Browser → Next.js /api/digital-footprint/scan
              → holehe provider (if configured)
              → HOLEHE_API_URL POST /scan
              → Holehe sidecar (Python FastAPI + holehe modules)
```

## Quick start

```bash
export HOLEHE_API_TOKEN="$(openssl rand -hex 24)"
docker compose -f docker/holehe/docker-compose.yml up -d --build
```

Add to the app environment (`.env` / host panel):

```bash
HOLEHE_API_URL=http://127.0.0.1:8787
HOLEHE_API_TOKEN=<same token as above>
```

Health check:

```bash
curl -s http://127.0.0.1:8787/health
# {"ok":true,"modules":120+,"tokenConfigured":true}
```

Test scan:

```bash
curl -s -X POST http://127.0.0.1:8787/scan \
  -H "Authorization: Bearer $HOLEHE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

## Notes

- Scans can take **30–90 seconds** (many remote sites). The Digital Footprint provider uses a longer timeout when Holehe is configured.
- Only `exists: true` results become findings / related accounts.
- Rate limits on target sites are normal; change IP / retry later if many modules report `rateLimit`.
- Use only for **self-audit** or authorized checks (same consent as the rest of Digital Footprint).
