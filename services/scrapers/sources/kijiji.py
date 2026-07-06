"""
Kijiji (rental category) source scraper — spec Section 11.2 (TEMPLATE CODE).

Kijiji rotates markup frequently and is aggressive about bot detection.
Selectors WILL need tuning on first deploy. Weekly rents appear here more
than on other sources — normalization handles the ×4.33 conversion.
"""

import logging

from playwright.async_api import Browser

from constants import MAX_PAGES_PER_CITY, TARGET_CITIES
from normalization import RawRentalListing
from sources.browser import open_page

logger = logging.getLogger(__name__)

SOURCE = "kijiji"
_BASE_URL = "https://www.kijiji.ca"
# b-apartments-condos = long-term rental category
_SEARCH_URL = _BASE_URL + "/b-apartments-condos/{city}/page-{page}/c37l1700273"

# TEMPLATE selectors — verify against live markup on first deploy
_CARD_SELECTOR = "[data-testid='listing-card'], .search-item"
_TITLE_SELECTOR = "[data-testid='listing-title'], .title"
_RENT_SELECTOR = "[data-testid='listing-price'], .price"
_LOCATION_SELECTOR = "[data-testid='listing-location'], .location"
_BEDS_SELECTOR = "[data-testid='listing-details'], .details"
_LINK_SELECTOR = "a[href*='/v-']"


async def fetch_listings(browser: Browser) -> list[RawRentalListing]:
    """
    Scrape active rental listings from Kijiji's apartments category for all
    target cities.

    Args:
        browser: Running Playwright browser from sources.browser.

    Returns:
        Raw listings across all cities and pages. Failures are logged and
        skipped — one broken city never kills the run.
    """
    listings: list[RawRentalListing] = []

    for city in TARGET_CITIES:
        for page_num in range(1, MAX_PAGES_PER_CITY + 1):
            url = _SEARCH_URL.format(city=city, page=page_num)
            page = await open_page(browser, url)
            if page is None:
                break

            try:
                cards = await page.query_selector_all(_CARD_SELECTOR)
                if not cards:
                    break

                for card in cards:
                    listing = await _parse_card(card)
                    if listing is not None:
                        listings.append(listing)
            except Exception:
                logger.exception("Card parsing failed for %s page %d", city, page_num)
            finally:
                await page.close()

    logger.info("kijiji: scraped %d raw listings", len(listings))
    return listings


async def _parse_card(card: object) -> RawRentalListing | None:
    """
    Extract one raw listing from a Kijiji search result card.

    Kijiji cards carry the address in the location element; the title plus
    location together form the stored address line.

    Args:
        card: Playwright element handle for a search result card.

    Returns:
        RawRentalListing, or None if required fields are missing.
    """
    try:
        title_el = await card.query_selector(_TITLE_SELECTOR)
        rent_el = await card.query_selector(_RENT_SELECTOR)
        location_el = await card.query_selector(_LOCATION_SELECTOR)
        if rent_el is None or (title_el is None and location_el is None):
            return None

        title = (await title_el.inner_text()).strip() if title_el else ""
        location = (await location_el.inner_text()).strip() if location_el else ""
        address = f"{title}, {location}".strip(", ")

        beds_el = await card.query_selector(_BEDS_SELECTOR)
        link_el = await card.query_selector(_LINK_SELECTOR)
        href = await link_el.get_attribute("href") if link_el else None

        return RawRentalListing(
            source=SOURCE,
            source_url=_BASE_URL + href if href and href.startswith("/") else href or _BASE_URL,
            address=address,
            rent_raw=(await rent_el.inner_text()).strip(),
            beds_raw=(await beds_el.inner_text()).strip() if beds_el else "",
        )
    except Exception:
        logger.exception("Failed to parse a kijiji card")
        return None
