"""
Kijiji (rental category) source scraper — spec Section 11.2 (TEMPLATE CODE).

Kijiji rotates markup frequently and is aggressive about bot detection.
Selectors WILL need tuning on first deploy. Weekly rents appear here more
than on other sources — normalization handles the ×4.33 conversion.

TORONTO-ONLY (for now): Kijiji filters by a location ID in the URL, not the city
slug, so every city currently returns Toronto/GTA results. Scraping uses
KIJIJI_CITIES (= Toronto only), NOT TARGET_CITIES, until a verified
city→location-ID map exists. See constants.KIJIJI_CITIES and NIGHT_NOTES.
"""

import logging
import re

from playwright.async_api import Browser

from constants import KIJIJI_CITIES, MAX_PAGES_PER_CITY
from normalization import RawRentalListing
from sources.browser import PageFetch, SourceFetchResult, open_page

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
_LINK_SELECTOR = "a[href*='/v-']"

# Beds live in the free-text title AND description preview, usually spelled out
# ("two bedroom"). They are parsed from the card's full visible text.
#
# GUARD: a number is only read as a bed count when it is bound to a
# bed/bedroom/br/bdrm suffix — so a listing ID, unit number, or street number
# ("Indian Road - ID 544") can never be mistaken for beds. A wrong bed count is
# worse than a null: null is excluded from comps, wrong is included and skews them.
_STUDIO_RE = re.compile(r"\b(?:studio|bachelor)\b", re.IGNORECASE)
_NUM_BED_RE = re.compile(
    r"\b(?:one|two|three|four|five|six|seven|eight|nine|\d+)"
    r"[\s-]*(?:\+?\s*den\s*)?(?:bed(?:room)?s?|br|bdrm?s?)\b",
    re.IGNORECASE,
)


def _beds_from_text(text: str) -> str:
    """
    Extract a bed-count phrase from a Kijiji card's full text, or '' if none.

    Tie-break: the EARLIEST bed indicator in the text wins. The unit's own bed
    count is stated in the title / first line, ahead of any building-range or
    amenity mention — so a real "2 bedroom" is never overridden by a later
    "fitness studio". studio/bachelor → 0, but only when it is the earliest
    indicator.
    """
    num = _NUM_BED_RE.search(text)
    studio = _STUDIO_RE.search(text)
    if num and studio:
        return "studio" if studio.start() < num.start() else num.group(0)
    if num:
        return num.group(0)
    if studio:
        return "studio"
    return ""


async def fetch_listings(browser: Browser) -> SourceFetchResult:
    """
    Scrape active rental listings from Kijiji's apartments category.

    Iterates KIJIJI_CITIES (Toronto only) — NOT TARGET_CITIES — because Kijiji's
    city slug is ignored in favour of a URL location ID, so other cities would
    return Toronto data under the wrong label (see module docstring / NIGHT_NOTES).

    Args:
        browser: Running Playwright browser from sources.browser.

    Returns:
        SourceFetchResult: the raw listings across the gated cities and pages,
        plus a PageFetch per (city, page) fetched carrying status / row count /
        blocked (the yield-alarm signal). Failures are logged and skipped — one
        broken city never kills the run.
    """
    result = SourceFetchResult()

    for city in KIJIJI_CITIES:
        for page_num in range(1, MAX_PAGES_PER_CITY + 1):
            url = _SEARCH_URL.format(city=city, page=page_num)
            fetch = await open_page(browser, url)
            if fetch.page is None:
                result.pages.append(
                    PageFetch(SOURCE, city, page_num, fetch.status, 0, fetch.blocked)
                )
                break
            page = fetch.page

            try:
                cards = await page.query_selector_all(_CARD_SELECTOR)
                result.pages.append(
                    PageFetch(
                        SOURCE, city, page_num, fetch.status, len(cards), fetch.blocked
                    )
                )
                if not cards:
                    break

                for card in cards:
                    listing = await _parse_card(card)
                    if listing is not None:
                        result.listings.append(listing)
            except Exception:
                logger.exception("Card parsing failed for %s page %d", city, page_num)
            finally:
                await page.close()

    logger.info("kijiji: scraped %d raw listings", len(result.listings))
    return result


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

        # Beds from the full card text (title + description preview), not just the
        # title — the description often states beds the title omits.
        beds_raw = _beds_from_text(await card.inner_text())

        link_el = await card.query_selector(_LINK_SELECTOR)
        href = await link_el.get_attribute("href") if link_el else None

        return RawRentalListing(
            source=SOURCE,
            source_url=(
                _BASE_URL + href if href and href.startswith("/") else href or _BASE_URL
            ),
            address=address,
            rent_raw=(await rent_el.inner_text()).strip(),
            beds_raw=beds_raw,
        )
    except Exception:
        logger.exception("Failed to parse a kijiji card")
        return None
