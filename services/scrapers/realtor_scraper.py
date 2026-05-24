"""
Realtor.ca listing scraper — spec Section 11.2 (TEMPLATE CODE).
Endpoint URLs and field mappings will shift as Realtor.ca updates their API.
Update this file and the spec together whenever the scraper changes.

Runs on Railway as a triggered job (not scheduled).
"""

# TODO: Implement Realtor.ca scraper using Playwright.
# See spec Section 11.2 for field mapping reference.

from dataclasses import dataclass


@dataclass
class ScrapedListing:
    """Raw scraped data before validation and normalisation."""
    url: str
    raw: dict[str, object]


async def scrape_listing(url: str) -> ScrapedListing | None:
    """
    Scrape a single Realtor.ca listing URL.

    Args:
        url: Full Realtor.ca listing URL.

    Returns:
        ScrapedListing with raw field data, or None if scraping fails.
    """
    raise NotImplementedError("Realtor.ca scraper: not yet implemented")
