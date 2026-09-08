# Digital Footprint module

The public `/digital-footprint` route is a verified self-audit tool. It follows an independent NecrotixLab interface and borrows only functional patterns from public OSINT products and projects.

## Privacy boundary

- Email ownership is verified before provider scans.
- Verification records are encrypted and expire after at most 30 minutes.
- Scan results are returned to the current browser and are not persisted.
- Password checks hash the password in the browser and send only the first five SHA-1 characters to the HIBP Pwned Passwords range API.
- Plaintext passwords, tokens, cookies and private messages are never requested, retrieved or displayed.
- All results returned by configured providers are available without a premium tier.

## Providers

Set `HIBP_API_KEY` and `EMAILREP_API_KEY` to enable their respective providers. `GITHUB_TOKEN` raises GitHub API limits. DNS, Gravatar, GitHub public search and the small built-in public-profile checks require no dedicated key.

Holehe remains an independently deployed GPL-3.0 service and is not copied into this repository. Configure `HOLEHE_API_URL` and `HOLEHE_API_TOKEN`. The sidecar contract is:

```http
POST /scan
Authorization: Bearer <token>
Content-Type: application/json

{"email":"verified@example.com"}
```

Response:

```json
{"results":[{"name":"Service","domain":"service.example","exists":true}]}
```

The modular provider interface is influenced by SpiderFoot, Holehe, Sherlock, WhatsMyName, Maigret and MOSINT. Their code and datasets are not bundled here; any future import must preserve the upstream license and attribution.

SMTP delivery can be configured from **Admin > API Integrations > SMTP email delivery**. Encrypted CMS values override `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT` and `SMTP_SECURE` environment variables.
