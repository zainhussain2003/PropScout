"""
PropScout Calc Engine — FastAPI application.

This file registers routers only. No business logic lives here.
All logic lives in routers/, calculations/, extraction/, and services/.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Routers are registered here as each is built:
# from routers import analysis
# app.include_router(analysis.router, prefix="/analysis")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    from datetime import datetime, timezone
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}
