"""
Scrape router — handles POST /scrape requests from the Fastify API.

Accepts a Realtor.ca listing URL and returns the flat structured listing data
(dataclasses.asdict of ScrapedListing) that apps/api/src/routes/scrape.ts maps
into a Listing. The API does its OWN province gate and partial-scrape detection
from that flat payload, so this route only distinguishes success (200 + the flat
listing) from a scrape failure (422). This mirrors services/scrapers/main.py — the
two /scrape servers are kept to the same contract on purpose.

Route handlers only call the scraper and shape the response; all scraping logic
lives in scrapers/realtor_scraper.py.
"""

import dataclasses
import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from models.scraper_schemas import ScrapeRequest
from scrapers.realtor_scraper import scrape_listing

logger = logging.getLogger(__name__)

router = APIRouter()


# Path "" so the full route (mounted at prefix "/scrape") is exactly POST /scrape,
# matching the Fastify API's `${SCRAPER_URL}/scrape` call with no trailing slash.
@router.post("")
async def scrape(body: ScrapeRequest) -> JSONResponse:
    """
    Scrape a Realtor.ca listing URL and return structured property data.

    Args:
        body: ScrapeRequest containing the Realtor.ca listing URL.

    Returns:
        200 with the flat ScrapedListing dict on success, or 422 with a
        SCRAPER_FAILED error the API turns into a manual-entry prompt.
    """
    result = await scrape_listing(body.url)

    if result is None:
        logger.warning("Scrape failed for URL: %s", body.url)
        return JSONResponse(
            status_code=422,
            content={
                "error": "SCRAPER_FAILED",
                "message": "Could not read that listing",
            },
        )

    return JSONResponse(status_code=200, content=dataclasses.asdict(result))
