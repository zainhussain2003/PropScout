"""
PadMapper source scraper — spec Section 11.2 (TEMPLATE CODE).

PadMapper renders listings client-side, so cards need the network to settle
before they exist in the DOM.

Selectors are anchored on PadMapper's schema.org microdata, NOT on its hashed
CSS-module class names. Each result card is a
``[itemscope][itemtype*='schema.org/ApartmentComplex']`` element exposing
``itemprop`` fields (streetAddress / addressLocality / addressRegion /
postalCode). This survives CSS refactors — when PadMapper renamed its hashed
``ListItem_xxxx`` classes the old class selectors broke silently; microdata did
not. Rent and bed counts are not in the microdata, so they are read from the
card's visible text by pattern.

NOTE — building-level ranges: PadMapper search cards are *buildings* with a rent
and bedroom RANGE ("$2,174–$3,956", "1–3 Bedrooms"), not single units. The
normaliser takes the first number of any string, so these become the
conservative "starting-from" value (rent 2174, beds 1). That is a coarser comp
than the per-unit listings from rentals.ca / kijiji — flagged deliberately.
"""

import logging
import re

from playwright.async_api import Browser

from constants import MAX_PAGES_PER_CITY, TARGET_CITIES
from normalization import RawRentalListing
from sources.browser import PageFetch, SourceFetchResult, open_page

logger = logging.getLogger(__name__)

SOURCE = "padmapper"
_BASE_URL = "https://www.padmapper.com"
_SEARCH_URL = _BASE_URL + "/apartments/{city}-on?page={page}"

# Hash-independent anchors: schema.org microdata + semantic href, never CSS hashes.
_CARD_SELECTOR = "[itemscope][itemtype*='schema.org/Apartment']"
_STREET_SELECTOR = "[itemprop='streetAddress']"
_LOCALITY_SELECTOR = "[itemprop='addressLocality']"
_REGION_SELECTOR = "[itemprop='addressRegion']"
_POSTAL_SELECTOR = "[itemprop='postalCode']"
_LINK_SELECTOR = "a[href*='/buildings/']"

# Rent / beds live only in the visible card text (no microdata for them).
_DASH = "–—-"  # en-dash, em-dash, hyphen — PadMapper uses an en-dash range
_PRICE_RE = re.compile(rf"\$[\d,]+(?:\s*[{_DASH}]\s*\$?[\d,]+)?")
_BEDS_RE = re.compile(
    rf"(?:studio|bachelor|\d+)(?:\s*[{_DASH}]\s*(?:studio|bachelor|\d+))?\s*bedrooms?",
    re.IGNORECASE,
)


async def fetch_listings(browser: Browser) -> SourceFetchResult:
    """
    Scrape active rental listings from PadMapper for all target cities.

    Args:
        browser: Running Playwright browser from sources.browser.

    Returns:
        SourceFetchResult: the raw listings across all cities and pages
        (deduplicated by listing URL), plus a PageFetch per (city, page) fetched
        carrying status / row count / blocked (the yield-alarm signal). The
        recorded row count is the raw cards rendered on the page, before the
        in-source URL dedupe. Failures are logged and skipped — one broken city
        never kills the run.
    """
    result = SourceFetchResult()
    seen_urls: set[str] = set()

    for city in TARGET_CITIES:
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
                # Client-side render — wait for cards rather than DOM-ready
                await page.wait_for_selector(_CARD_SELECTOR, timeout=10_000)
            except Exception:
                # No cards rendered — past last page or blocked. Record the
                # signal (0 rows, with the captured status/blocked) before break.
                result.pages.append(
                    PageFetch(SOURCE, city, page_num, fetch.status, 0, fetch.blocked)
                )
                await page.close()
                break  # no cards rendered — past last page or blocked

            try:
                cards = await page.query_selector_all(_CARD_SELECTOR)
                result.pages.append(
                    PageFetch(
                        SOURCE, city, page_num, fetch.status, len(cards), fetch.blocked
                    )
                )
                for card in cards:
                    listing = await _parse_card(card)
                    if listing is None or listing.source_url in seen_urls:
                        continue
                    seen_urls.add(listing.source_url)
                    result.listings.append(listing)
            except Exception:
                logger.exception("Card parsing failed for %s page %d", city, page_num)
            finally:
                await page.close()

    logger.info("padmapper: scraped %d raw listings", len(result.listings))
    return result


async def _prop(card: object, selector: str) -> str:
    """Read a microdata field's value (``content`` attribute or text), or ''."""
    el = await card.query_selector(selector)
    if el is None:
        return ""
    content = await el.get_attribute("content")
    if content:
        return content.strip()
    return (await el.inner_text()).strip()


async def _parse_card(card: object) -> RawRentalListing | None:
    """
    Extract one raw listing from a PadMapper result card (schema.org microdata).

    Args:
        card: Playwright element handle for an ApartmentComplex card.

    Returns:
        RawRentalListing, or None if the address or price is missing.
    """
    try:
        street = await _prop(card, _STREET_SELECTOR)
        if not street:
            return None  # not a real listing card

        locality = await _prop(card, _LOCALITY_SELECTOR)
        region = await _prop(card, _REGION_SELECTOR)
        postal = await _prop(card, _POSTAL_SELECTOR)
        address = ", ".join(p for p in (street, locality) if p)
        tail = " ".join(p for p in (region, postal) if p)
        if tail:
            address = f"{address}, {tail}" if address else tail

        text = await card.inner_text()
        price_match = _PRICE_RE.search(text)
        if price_match is None:
            return None  # no price — can't be a rental comp
        beds_match = _BEDS_RE.search(text)

        link_el = await card.query_selector(_LINK_SELECTOR)
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
            rent_raw=price_match.group(0),
            beds_raw=beds_match.group(0) if beds_match else "",
        )
    except Exception:
        logger.exception("Failed to parse a padmapper card")
        return None
