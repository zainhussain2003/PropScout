"""
PropScout Scraper Service — FastAPI app.
Entry point — registers routes only, no business logic here.
"""

import dataclasses
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from realtor_scraper import scrape_listing

app = FastAPI(title="PropScout Scraper Service")

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_url, "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    url: str


@app.post("/scrape")
async def scrape(request: ScrapeRequest) -> dict:
    """Scrape a Realtor.ca listing URL and return structured field data."""
    result = await scrape_listing(request.url)
    if result is None:
        return JSONResponse(
            status_code=422,
            content={
                "error": "SCRAPER_FAILED",
                "message": "Could not read that listing",
            },
        )
    return dataclasses.asdict(result)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
