# Redirects CMS

The Portfolio CMS manages exact-path redirects through the Prisma `Redirect` model.

- Configure redirects at `/admin/redirects`.
- Permanent redirects use HTTP 308.
- Temporary redirects use HTTP 307.
- Source paths are normalized to a leading slash and trailing slashes are removed (except `/`).
- `/admin`, `/api`, `/_next` and `/site-status` cannot be used as redirect sources.
- Targets may be internal paths or absolute HTTP/HTTPS URLs.
- Runtime resolution fails open if the database is temporarily unavailable.
- Redirect resolution runs before Site Mode enforcement so moved URLs remain canonical even during normal operation.

Redirects are exact-path only in this phase; wildcard and regex redirects are intentionally not supported.
