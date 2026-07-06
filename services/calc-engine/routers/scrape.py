"""
Scrape router — handles POST /scrape requests from the Fastify API.

Accepts a Realtor.ca listing URL and returns structured property data.
Route handlers only call the scraper service and return responses.
All scraping logic lives in scrapers/realtor_scraper.py.
"""

import logging

from fastapi import APIRouter

from models.scraper_schemas import ScrapeRequest, ScrapeResponse
from scrapers.realtor_scraper import scrape_listing

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ScrapeResponse)
async def scrape(body: ScrapeRequest) -> ScrapeResponse:
    """
    Scrape a Realtor.ca listing URL and return structured property data.

    Steps:
      1. Call scrape_listing() to fetch data from Realtor.ca's internal API.
      2. If scraping fails, return error="scrape_failed".
      3. If province is not Ontario, return error="province_not_supported"
         with the detected province code so Fastify can show the waitlist prompt.
      4. Return the structured listing data.

    Args:
        body: ScrapeRequest containing the Realtor.ca listing URL.

    Returns:
        ScrapeResponse with the parsed listing or an error indicator.
    """
    listing = await scrape_listing(body.url)

    if listing is None:
        logger.warning("Scrape failed for URL: %s", body.url)
        return ScrapeResponse(listing=None, error="scrape_failed")

    if listing.province != "ON":
        logger.info(
            "Province gate triggered for %s (province=%s)", body.url, listing.province
        )
        return ScrapeResponse(
            listing=None,
            error="province_not_supported",
            province=listing.province,
        )

    return ScrapeResponse(listing=listing)
