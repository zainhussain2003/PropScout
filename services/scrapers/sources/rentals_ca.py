"""
Rentals.ca source scraper — spec Section 11.2 (TEMPLATE CODE).

CSS selectors below match Rentals.ca's current listing-card markup and WILL
shift when the site updates. When this source returns zero results across all
cities, the selectors are the first thing to check.
"""

import logging
import re

from playwright.async_api import Browser

from constants import MAX_PAGES_PER_CITY, TARGET_CITIES
from normalization import RawRentalListing
from sources.browser import open_page

logger = logging.getLogger(__name__)

SOURCE = "rentals_ca"
_BASE_URL = "https://rentals.ca"
_SEARCH_URL = _BASE_URL + "/{city}?p={page}"

# TEMPLATE selectors — verify against live markup on first deploy
_CARD_SELECTOR = "[class*='listing-card']"
_ADDRESS_SELECTOR = "[class*='listing-card__title'], [class*='address']"
_RENT_SELECTOR = "[class*='listing-card__price'], [class*='price']"
_SQFT_SELECTOR = "[class*='sqft'], [class*='dimension']"
_LINK_SELECTOR = "a[href*='/']"

# Beds are not in a dedicated element — they sit in the card text as "1 - 3 BED"
# (often a building range). Capture the range; the normaliser takes the low end.
_BEDS_TEXT_RE = re.compile(
    r"(studio|bachelor|\d+(?:\s*[-–]\s*\d+)?)\s*bed", re.IGNORECASE
)


async def fetch_listings(browser: Browser) -> list[RawRentalListing]:
    """
    Scrape active rental listings from Rentals.ca for all target cities.

    Args:
        browser: Running Playwright browser from sources.browser.

    Returns:
        Raw listings across all cities and pages. Per-city failures are
        logged and skipped — one broken city never kills the run.
    """
    listings: list[RawRentalListing] = []

    for city in TARGET_CITIES:
        for page_num in range(1, MAX_PAGES_PER_CITY + 1):
            url = _SEARCH_URL.format(city=city, page=page_num)
            page = await open_page(browser, url)
            if page is None:
                break  # navigation failure — move to next city

            try:
                cards = await page.query_selector_all(_CARD_SELECTOR)
                if not cards:
                    break  # past the last page of results

                for card in cards:
                    listing = await _parse_card(card)
                    if listing is not None:
                        listings.append(listing)
            except Exception:
                logger.exception("Card parsing failed for %s page %d", city, page_num)
            finally:
                await page.close()

    logger.info("rentals_ca: scraped %d raw listings", len(listings))
    return listings


async def _parse_card(card: object) -> RawRentalListing | None:
    """
    Extract one raw listing from a Rentals.ca listing card element.

    Args:
        card: Playwright element handle for a listing card.

    Returns:
        RawRentalListing, or None if required fields are missing.
    """
    try:
        address_el = await card.query_selector(_ADDRESS_SELECTOR)
        rent_el = await card.query_selector(_RENT_SELECTOR)
        if address_el is None or rent_el is None:
            return None

        address = (await address_el.inner_text()).strip()
        rent_raw = (await rent_el.inner_text()).strip()

        sqft_el = await card.query_selector(_SQFT_SELECTOR)
        link_el = await card.query_selector(_LINK_SELECTOR)

        # Beds come from the card's visible text, not a dedicated element.
        beds_match = _BEDS_TEXT_RE.search(await card.inner_text())

        href = await link_el.get_attribute("href") if link_el else None
        source_url = (
            href
            if href and href.startswith("http")
            else _BASE_URL + href if href else _BASE_URL
        )

        return RawRentalListing(
            source=SOURCE,
            source_url=source_url,
            address=address,
            rent_raw=rent_raw,
            beds_raw=beds_match.group(0) if beds_match else "",
            baths_raw=None,
            sqft_raw=(await sqft_el.inner_text()).strip() if sqft_el else None,
        )
    except Exception:
        logger.exception("Failed to parse a rentals_ca card")
        return None
