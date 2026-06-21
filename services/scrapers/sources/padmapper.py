"""
PadMapper source scraper — spec Section 11.2 (TEMPLATE CODE).

PadMapper renders listings client-side, so cards need the network to settle
before they exist in the DOM. Selectors WILL need tuning on first deploy.
"""

import logging

from playwright.async_api import Browser

from constants import MAX_PAGES_PER_CITY, TARGET_CITIES
from normalization import RawRentalListing
from sources.browser import open_page

logger = logging.getLogger(__name__)

SOURCE = "padmapper"
_BASE_URL = "https://www.padmapper.com"
_SEARCH_URL = _BASE_URL + "/apartments/{city}-on?page={page}"

# TEMPLATE selectors — verify against live markup on first deploy
_CARD_SELECTOR = "[class*='ListItemFull_'], [class*='ListItem_']"
_ADDRESS_SELECTOR = "[class*='address'], [class*='Address']"
_RENT_SELECTOR = "[class*='price'], [class*='Price']"
_BEDS_SELECTOR = "[class*='bed'], [class*='Bed']"
_LINK_SELECTOR = "a[href*='/apartments/']"


async def fetch_listings(browser: Browser) -> list[RawRentalListing]:
    """
    Scrape active rental listings from PadMapper for all target cities.

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
                # Client-side render — wait for cards rather than DOM-ready
                await page.wait_for_selector(_CARD_SELECTOR, timeout=10_000)
            except Exception:
                await page.close()
                break  # no cards rendered — past last page or blocked

            try:
                cards = await page.query_selector_all(_CARD_SELECTOR)
                for card in cards:
                    listing = await _parse_card(card)
                    if listing is not None:
                        listings.append(listing)
            except Exception:
                logger.exception("Card parsing failed for %s page %d", city, page_num)
            finally:
                await page.close()

    logger.info("padmapper: scraped %d raw listings", len(listings))
    return listings


async def _parse_card(card: object) -> RawRentalListing | None:
    """
    Extract one raw listing from a PadMapper listing card element.

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

        beds_el = await card.query_selector(_BEDS_SELECTOR)
        link_el = await card.query_selector(_LINK_SELECTOR)
        href = await link_el.get_attribute("href") if link_el else None

        return RawRentalListing(
            source=SOURCE,
            source_url=_BASE_URL + href if href and href.startswith("/") else href or _BASE_URL,
            address=(await address_el.inner_text()).strip(),
            rent_raw=(await rent_el.inner_text()).strip(),
            beds_raw=(await beds_el.inner_text()).strip() if beds_el else "",
        )
    except Exception:
        logger.exception("Failed to parse a padmapper card")
        return None
