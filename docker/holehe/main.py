"""Holehe API sidecar for NecrotixLab Digital Footprint.

POST /scan  Authorization: Bearer <HOLEHE_API_TOKEN>
Body: { "email": "user@example.com" }
Response: { "email": "...", "results": [ { "name", "domain", "exists", "rateLimit", ... } ] }
"""
from __future__ import annotations

import asyncio
import importlib
import os
import pkgutil
import time
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Holehe API", version="1.0.0", docs_url=None, redoc_url=None)

TOKEN = os.environ.get("HOLEHE_API_TOKEN", "").strip()
TIMEOUT_SEC = float(os.environ.get("HOLEHE_TIMEOUT", "90"))
MAX_CONCURRENT = int(os.environ.get("HOLEHE_MAX_CONCURRENT", "10"))

DOMAIN_HINTS = {
    "instagram": "instagram.com",
    "twitter": "twitter.com",
    "snapchat": "snapchat.com",
    "spotify": "spotify.com",
    "discord": "discord.com",
    "github": "github.com",
    "gitlab": "gitlab.com",
    "adobe": "adobe.com",
    "amazon": "amazon.com",
    "ebay": "ebay.com",
    "facebook": "facebook.com",
    "pinterest": "pinterest.com",
    "tumblr": "tumblr.com",
    "reddit": "reddit.com",
    "wordpress": "wordpress.com",
    "flickr": "flickr.com",
    "lastpass": "lastpass.com",
    "evernote": "evernote.com",
    "dropbox": "dropbox.com",
    "office365": "office.com",
    "microsoft": "microsoft.com",
    "yahoo": "yahoo.com",
    "google": "google.com",
    "protonmail": "proton.me",
    "mail_ru": "mail.ru",
    "vk": "vk.com",
    "odnoklassniki": "ok.ru",
    "nike": "nike.com",
    "samsung": "samsung.com",
    "docker": "hub.docker.com",
    "codepen": "codepen.io",
    "envato": "envato.com",
    "freelancer": "freelancer.com",
    "patreon": "patreon.com",
    "buymeacoffee": "buymeacoffee.com",
    "aboutme": "about.me",
    "gravatar": "gravatar.com",
    "imgur": "imgur.com",
    "quora": "quora.com",
    "firefox": "firefox.com",
    "archive": "archive.org",
    "codecademy": "codecademy.com",
    "replit": "replit.com",
    "smule": "smule.com",
    "soundcloud": "soundcloud.com",
    "sporcle": "sporcle.com",
    "bodybuilding": "bodybuilding.com",
    "deliveroo": "deliveroo.com",
    "blablacar": "blablacar.com",
    "eventbrite": "eventbrite.com",
    "hubspot": "hubspot.com",
    "atlassian": "atlassian.com",
    "bitmoji": "bitmoji.com",
    "parler": "parler.com",
    "plurk": "plurk.com",
    "myspace": "myspace.com",
    "fanpop": "fanpop.com",
    "ello": "ello.co",
    "diigo": "diigo.com",
    "devrant": "devrant.com",
    "issuu": "issuu.com",
    "seoclerks": "seoclerks.com",
    "komoot": "komoot.com",
    "garmin": "garmin.com",
    "zoho": "zoho.com",
}


class ScanRequest(BaseModel):
    email: EmailStr


def require_auth(authorization: str | None) -> None:
    if not TOKEN:
        raise HTTPException(status_code=500, detail="HOLEHE_API_TOKEN is not configured on the sidecar.")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token.")
    if authorization.removeprefix("Bearer ").strip() != TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token.")


def discover_modules() -> list[tuple[str, Any]]:
    import holehe.modules as modules_pkg

    found: list[tuple[str, Any]] = []
    for importer, modname, ispkg in pkgutil.walk_packages(modules_pkg.__path__, modules_pkg.__name__ + "."):
        if ispkg:
            continue
        try:
            mod = importlib.import_module(modname)
            name = modname.rsplit(".", 1)[-1]
            fn = getattr(mod, name, None)
            if callable(fn):
                found.append((name, fn))
        except Exception:
            continue
    return found


MODULES: list[tuple[str, Any]] | None = None


def get_modules() -> list[tuple[str, Any]]:
    global MODULES
    if MODULES is None:
        MODULES = discover_modules()
    return MODULES


async def run_module(name: str, fn: Any, email: str, client: Any, sem: asyncio.Semaphore) -> dict[str, Any] | None:
    async with sem:
        out: list[dict[str, Any]] = []
        try:
            await asyncio.wait_for(fn(email, client, out), timeout=12)
        except Exception:
            return None
        if not out:
            return None
        row = out[0]
        if not isinstance(row, dict):
            return None
        exists = bool(row.get("exists"))
        rate_limit = bool(row.get("rateLimit"))
        if not exists and not rate_limit:
            return None
        domain = DOMAIN_HINTS.get(name.lower()) or DOMAIN_HINTS.get(name.lower().replace("_", ""))
        return {
            "name": row.get("name") or name,
            "exists": exists,
            "rateLimit": rate_limit,
            "domain": domain,
            "emailrecovery": row.get("emailrecovery"),
            "phoneNumber": row.get("phoneNumber"),
            "others": row.get("others"),
        }


@app.get("/health")
async def health():
    return {"ok": True, "modules": len(get_modules()), "tokenConfigured": bool(TOKEN)}


@app.post("/scan")
async def scan(body: ScanRequest, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    email = str(body.email).lower().strip()
    modules = get_modules()
    if not modules:
        raise HTTPException(status_code=500, detail="No holehe modules loaded.")

    import httpx

    started = time.monotonic()
    sem = asyncio.Semaphore(MAX_CONCURRENT)

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        tasks = [run_module(name, fn, email, client, sem) for name, fn in modules]
        try:
            done = await asyncio.wait_for(asyncio.gather(*tasks), timeout=TIMEOUT_SEC)
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Holehe scan timed out.")

    results = [item for item in done if item and item.get("exists") is True]
    results.sort(key=lambda r: str(r.get("name") or "").lower())
    return {
        "email": email,
        "results": results,
        "checked": len(modules),
        "found": len(results),
        "durationMs": int((time.monotonic() - started) * 1000),
    }
