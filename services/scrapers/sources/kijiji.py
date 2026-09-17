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

from constants import (
    KIJIJI_CITIES,
    KIJIJI_UNIT_TYPE_FEEDS,
    KIJIJI_UNIT_TYPE_MAX_PAGES,
    MAX_PAGES_PER_CITY,
)
from normalization import RawRentalListing
from sources.browser import PageFetch, SourceFetchResult, open_page

logger = logging.getLogger(__name__)

SOURCE = "kijiji"
_BASE_URL = "https://www.kijiji.ca"
# b-apartments-condos = long-term rental category ("Apartments, Condos & Houses")
_SEARCH_URL = _BASE_URL + "/b-apartments-condos/{city}/page-{page}/c37l1700273"
# The same category filtered to one Unit Type: the type is a path segment and
# the attribute id a suffix (verified 2026-09-17: /house/ → 418, /townhouse/ → 90).
_UNIT_TYPE_URL = (
    _BASE_URL
    + "/b-apartments-condos/{city}/{unit_type}/page-{page}/c37l1700273a29276001"
)

# TEMPLATE selectors — verify against live markup on first deploy
_CARD_SELECTOR = "[data-testid='listing-card'], .search-item"
_TITLE_SELECTOR = "[data-testid='listing-title'], .title"
_RENT_SELECTOR = "[data-testid='listing-price'], .price"
_LOCATION_SELECTOR = "[data-testid='listing-location'], .location"
_LINK_SELECTOR = "a[href*='/v-']"
# Cards carry structured attributes as list items labelled by aria-label
# (verified 2026-09-17): Bedrooms "2" / "2.5" (den), Bathrooms "1.5",
# Unit type "Apartment" | "Condo" | "House" | "Townhouse" | "Basement" |
# "Duplex/Triplex", Size (sqft) "1190 sqft", Parking included "1".
_ATTR_SELECTOR = "li[aria-label='{label}']"
_ATTR_BEDS = "Bedrooms"
_ATTR_BATHS = "Bathrooms"
_ATTR_UNIT_TYPE = "Unit type"
_ATTR_SQFT = "Size (sqft)"

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
        # The unfiltered feed, then the feeds for the unit types the comps
        # table is thin on (D-120). An ad in both is one row: the upsert keys
        # on source_url.
        await _crawl(browser, result, city, city, _SEARCH_URL, MAX_PAGES_PER_CITY)
        for unit_type in KIJIJI_UNIT_TYPE_FEEDS:
            await _crawl(
                browser,
                result,
                city,
                f"{city}/{unit_type}",
                _UNIT_TYPE_URL,
                KIJIJI_UNIT_TYPE_MAX_PAGES,
                unit_type=unit_type,
            )

    logger.info("kijiji: scraped %d raw listings", len(result.listings))
    return result


async def _crawl(
    browser: Browser,
    result: SourceFetchResult,
    city: str,
    feed: str,
    url_template: str,
    max_pages: int,
    unit_type: str | None = None,
) -> None:
    """
    Page through one feed, appending cards' listings and a PageFetch per page.

    Args:
        browser: Running Playwright browser.
        result: Accumulator for listings and per-page fetch records.
        city: Kijiji city slug.
        feed: Label recorded on each PageFetch — the city, or city/unit-type.
        url_template: Search URL with {city}, {page} and optionally {unit_type}.
        max_pages: Pages to read before stopping; an empty page stops earlier.
        unit_type: Unit Type path segment for a filtered feed.
    """
    for page_num in range(1, max_pages + 1):
        url = url_template.format(city=city, page=page_num, unit_type=unit_type)
        fetch = await open_page(browser, url)
        if fetch.page is None:
            result.pages.append(
                PageFetch(SOURCE, feed, page_num, fetch.status, 0, fetch.blocked)
            )
            break
        page = fetch.page

        try:
            cards = await page.query_selector_all(_CARD_SELECTOR)
            result.pages.append(
                PageFetch(
                    SOURCE, feed, page_num, fetch.status, len(cards), fetch.blocked
                )
            )
            if not cards:
                break

            for card in cards:
                listing = await _parse_card(card)
                if listing is not None:
                    result.listings.append(listing)
        except Exception:
            logger.exception("Card parsing failed for %s page %d", feed, page_num)
        finally:
            await page.close()


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

        # The card's structured attributes (D-120). Beds from the attribute
        # when it is there; else from the full card text (title + description
        # preview), bound to a bed/bedroom/br suffix.
        beds_attr = await _attr(card, _ATTR_BEDS)
        beds_raw = (
            f"{beds_attr} bed"
            if beds_attr
            else _beds_from_text(await card.inner_text())
        )
        baths_raw = await _attr(card, _ATTR_BATHS)
        sqft_raw = await _attr(card, _ATTR_SQFT)
        unit_type = await _attr(card, _ATTR_UNIT_TYPE)

        link_el = await card.query_selector(_LINK_SELECTOR)
        href = await link_el.get_attribute("href") if link_el else None

        raw_json: dict[str, object] = {"title": title, "location": location}
        if unit_type:
            raw_json["unit_type"] = unit_type
        return RawRentalListing(
            source=SOURCE,
            source_url=(
                _BASE_URL + href if href and href.startswith("/") else href or _BASE_URL
            ),
            address=address,
            rent_raw=(await rent_el.inner_text()).strip(),
            beds_raw=beds_raw,
            baths_raw=baths_raw,
            sqft_raw=sqft_raw,
            # The two halves of `address`, kept apart: the location is what
            # places the ad (D-119) and the title is what names its type
            # (D-117) — or, since D-120, the card says the type itself.
            raw_json=raw_json,
        )
    except Exception:
        logger.exception("Failed to parse a kijiji card")
        return None


async def _attr(card: object, label: str) -> str | None:
    """The text of a card's labelled attribute item, or None when absent."""
    el = await card.query_selector(_ATTR_SELECTOR.format(label=label))
    if el is None:
        return None
    text = (await el.inner_text()).strip()
    return text or None
