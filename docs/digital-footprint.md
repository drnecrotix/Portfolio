# Digital Footprint module

The public `/digital-footprint` route is a privacy exposure lookup for email addresses, phone numbers and usernames. It follows an independent NecrotixLab interface and borrows only functional patterns from public OSINT products and projects.

## Privacy boundary

- No account or verification email is required.
- Every scan requires an explicit authorization statement, a signed time-bound bot challenge and passes per-IP rate limits.
- Scan results are returned to the current browser and are not persisted.
- Password checks hash the password in the browser and send only the first five SHA-1 characters to the HIBP Pwned Passwords range API.
- Plaintext passwords, tokens, cookies and private messages are never requested, retrieved or displayed.
- All safe metadata returned by configured providers is available without a premium tier.

## Providers

Set `HIBP_API_KEY` and `EMAILREP_API_KEY` to enable their respective providers. `GITHUB_TOKEN` raises GitHub API limits. LeakCheck Public, XposedOrNot, DNS, Gravatar, GitHub public search and the small built-in public-profile checks require no dedicated key. Provider coverage varies by identifier type. LeakCheck attribution is displayed in the result view as required by its public API terms.

Holehe remains an independently deployed GPL-3.0 service and is not copied into this repository. Configure `HOLEHE_API_URL` and `HOLEHE_API_TOKEN`. The sidecar contract is:

```http
POST /scan
Authorization: Bearer <token>
Content-Type: application/json

{"email":"example@example.com"}
```

Response:

```json
{"results":[{"name":"Service","domain":"service.example","exists":true}]}
```

The modular provider interface is influenced by SpiderFoot, Holehe, Sherlock, WhatsMyName, Maigret and MOSINT. Their code and datasets are not bundled here; any future import must preserve the upstream license and attribution.
