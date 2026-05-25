"""
PropScout Scraper Service — FastAPI application.

Exposes two endpoints used by the Fastify API:
  POST /scrape/listing   — trigger a Realtor.ca or Zillow.ca scrape
  GET  /rentals/comps    — query rental comps by lat/lng radius

Runs on Railway as a separate service from the calc engine.
Internal use only at MVP — no auth required yet.

Environment variables:
  SUPABASE_URL              — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY — Service role key (backend-only)
  PROXY_1, PROXY_2, PROXY_3 — Proxy URLs for scraper rotation (optional)
  PORT                      — HTTP port (default 3002)
"""

import sys
import os

from dotenv import find_dotenv, load_dotenv

# find_dotenv() walks up from CWD until it locates .env — works whether the
# service is started from services/scrapers/ or the project root.
load_dotenv(find_dotenv())

# Ensure modules in this package can import each other
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app = FastAPI(
    title="PropScout Scraper Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Fastify API only
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

from routers import scraper_routes  # noqa: E402

app.include_router(scraper_routes.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint for Railway."""
    from datetime import datetime, timezone

    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 3002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
