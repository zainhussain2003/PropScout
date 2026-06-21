"""
PropScout Calc Engine — FastAPI application.

This file registers routers only. No business logic lives here.
All logic lives in routers/, calculations/, extraction/, and services/.
"""

import os
from pathlib import Path

# Load project-root .env so services/calc-engine inherits ANTHROPIC_API_KEY,
# MAPBOX_TOKEN, SCRAPER_API_KEY, etc. without needing the parent shell to
# export them. Matches what apps/api does via dotenv on the Node side.
# Skipped silently if python-dotenv isn't installed (production deploys may
# supply env vars another way, e.g. Railway dashboard).
try:
    from dotenv import load_dotenv

    _ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
    if _ENV_PATH.exists():
        load_dotenv(_ENV_PATH)
except ImportError:
    pass

# Sanity log for the keys the calc engine relies on — printed once at boot
# so misconfiguration shows up immediately, not on first request.
for _required in ("ANTHROPIC_API_KEY",):
    if not os.environ.get(_required):
        # Use stderr-style print (no logger yet) so this surfaces in uvicorn output
        print(
            f"[calc-engine] WARNING: {_required} not set — Haiku extraction will fail silently"
        )

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app = FastAPI(
    title="PropScout Calc Engine",
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

from routers import rates  # noqa: E402

app.include_router(rates.router, prefix="/rates")

from routers import analysis  # noqa: E402

app.include_router(analysis.router, prefix="/analysis")

from routers import scrape  # noqa: E402

app.include_router(scrape.router, prefix="/scrape")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    from datetime import datetime, timezone

    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}
