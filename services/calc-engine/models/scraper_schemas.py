"""
Pydantic model for the scraper endpoint request.

The /scrape RESPONSE is the flat dataclasses.asdict of
scrapers.realtor_scraper.ScrapedListing (returned directly by the router), kept
in sync with the Fastify API's ScrapedListingResponse contract — see
scrapers/realtor_scraper_test.py::test_scrape_response_shape_matches_api_contract.
"""

from pydantic import BaseModel


class ScrapeRequest(BaseModel):
    """Request body for the POST /scrape endpoint."""

    url: str
