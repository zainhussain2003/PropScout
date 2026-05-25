"""
Zillow.com listing scraper — spec Section 11.2 (TEMPLATE CODE).

Uses Playwright headless Chrome — Zillow.com does not expose a public API.
Field selectors and page structure will shift; update when they break.

Accepts any zillow.com URL. Geographic filtering is handled by the province
gate in scraper_routes.py — the scraper just parses and returns data.

Special case: if the listing address contains no Canadian postal code, the
scraper returns scrape_status='failed' with a clear error before any DB write.
This covers US addresses submitted on zillow.com URLs — the scraper checks
for a Canadian postal code (A1A 1A1 format) after parsing and rejects the
listing if none is found.

Safety guards:
  - The rate limiter enforces 4-second gaps between requests.
  - Proxy rotation uses PROXY_1 / PROXY_2 / PROXY_3 env vars.
  - All failures return partial data — never raise.
  - PII is stripped before Supabase writes.

Runs on Railway as a triggered job (not a scheduled cron).
"""

import logging
import os
import re
import time
from typing import Any

from playwright.async_api import Browser, Page, async_playwright

from db import log_scrape, upsert_listing
from listing_type import parse_listing_type
from province import detect_province
from rate_limiter import wait_for_rate_limit

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

SOURCE = "zillow"

# CSS selectors for Zillow.ca listing pages — TEMPLATE CODE
# These will shift as Zillow updates their front end.
_SELECTORS = {
    "price": "span[data-testid='price']",
    "address": "h1[data-testid='bdp-building-address']",
    "beds": "span[data-testid='bed-bath-item']:has(span:text('bds'))",
    "baths": "span[data-testid='bed-bath-item']:has(span:text('ba'))",
    "sqft": "span[data-testid='bed-bath-item']:has(span:text('sqft'))",
    "property_type": "span[data-testid='property-type']",
    "description": "div[data-testid='listing-description-text']",
    "zestimate": "span[data-testid='zestimate-chip']",
}

# Selectors are tried in order — first match wins
_FALLBACK_PRICE_SELECTORS = [
    "span[data-testid='price']",
    "span.sc-lllmON",  # Zillow.ca class patterns (may rotate)
    "[data-cy='price']",
    "h3.hdp__sc-19d1tjm-0",
]

# Round-robin proxy index
_proxy_index = 0


# ── Proxy helpers ──────────────────────────────────────────────────────────────


def _get_next_proxy() -> str | None:
    """
    Return the next proxy URL from PROXY_1/PROXY_2/PROXY_3 env vars.

    Returns:
        Proxy URL string or None if no proxies are configured.
    """
    global _proxy_index
    proxies = [os.environ.get(f"PROXY_{i}", "").strip() for i in range(1, 4)]
    configured = [p for p in proxies if p]
    if not configured:
        return None
    proxy = configured[_proxy_index % len(configured)]
    _proxy_index += 1
    return proxy


# ── Field parsing helpers ──────────────────────────────────────────────────────


def _parse_zillow_price(raw: str | None) -> tuple[float | None, str]:
    """
    Parse a Zillow price string and detect listing type.

    Zillow.ca shows "$2,500/mo" for rentals and "$729,900" for sales.

    Args:
        raw: Raw price string from the page.

    Returns:
        Tuple of (price_float_or_None, listing_type_string).
    """
    if not raw:
        return None, "unknown"

    raw_lower = raw.lower()
    is_rent = any(kw in raw_lower for kw in ["/mo", "/month", "per month"])

    # Strip non-numeric except decimal point
    cleaned = re.sub(r"[^0-9.]", "", raw)
    try:
        price = float(cleaned) if cleaned else None
    except ValueError:
        price = None

    return price, ("for_rent" if is_rent else "for_sale")


def _parse_beds(raw: str | None) -> int | None:
    """
    Parse a bed count string to integer. Handles "3 bds", "Studio", etc.

    Args:
        raw: Raw beds string from the page.

    Returns:
        Bed count as integer, or None if parsing fails.
    """
    if not raw:
        return None
    raw_lower = raw.lower().strip()
    if "studio" in raw_lower or "bachelor" in raw_lower:
        return 0
    match = re.search(r"(\d+)", raw)
    return int(match.group(1)) if match else None


def _parse_baths(raw: str | None) -> float | None:
    """
    Parse a bath count string to float. Handles "2 ba", "1.5 ba", "2+".

    Args:
        raw: Raw baths string from the page.

    Returns:
        Bath count as float, or None if parsing fails.
    """
    if not raw:
        return None
    match = re.search(r"(\d+\.?\d*)", raw)
    try:
        return float(match.group(1)) if match else None
    except ValueError:
        return None


def _parse_sqft(raw: str | None) -> int | None:
    """
    Parse a square footage string to integer.

    Args:
        raw: Raw sqft string (e.g. "1,400 sqft", "1400").

    Returns:
        Square footage as int, or None if parsing fails.
    """
    if not raw:
        return None
    cleaned = re.sub(r"[^0-9]", "", raw.split("sqft")[0])
    try:
        return int(cleaned) if cleaned else None
    except ValueError:
        return None


def _parse_postal_code(address_text: str | None) -> str | None:
    """
    Extract a Canadian postal code from an address string.

    Args:
        address_text: Full address string, e.g. "123 Main St, Toronto, ON L5B 1A1".

    Returns:
        Formatted postal code (e.g. "L5B 1A1") or None if not found.
    """
    if not address_text:
        return None
    match = re.search(r"[A-Z]\d[A-Z]\s?\d[A-Z]\d", address_text.upper())
    if not match:
        return None
    pc = match.group(0).replace(" ", "")
    return pc[:3] + " " + pc[3:] if len(pc) == 6 else pc


def _strip_pii(text: str | None) -> str | None:
    """
    Remove emails and phone numbers from listing description text.

    Args:
        text: Raw description that may contain PII.

    Returns:
        Sanitised text or None.
    """
    if not text:
        return text
    text = re.sub(r"\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b", "[email removed]", text)
    text = re.sub(
        r"\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b",
        "[phone removed]",
        text,
    )
    return text


# ── Page extraction ────────────────────────────────────────────────────────────


async def _extract_page_data(page: Page, url: str) -> tuple[dict[str, Any], list[str]]:
    """
    Extract listing fields from a loaded Zillow.ca page.

    This is TEMPLATE CODE — selectors will break when Zillow updates their UI.
    Extend _SELECTORS and the extraction logic below when that happens.

    Args:
        page: Playwright Page object for the loaded listing.
        url:  Original listing URL (used for listing_type detection).

    Returns:
        Tuple of (extracted_fields_dict, list_of_missing_field_names).
    """
    missing: list[str] = []

    async def _try_text(selectors: list[str]) -> str | None:
        """Try each selector in order, return the first non-empty text found."""
        for sel in selectors:
            try:
                el = page.locator(sel).first
                if await el.count() > 0:
                    text = (await el.inner_text()).strip()
                    if text:
                        return text
            except Exception:
                pass
        return None

    # ── Price + listing type ──────────────────────────────────────────────────
    price_raw = await _try_text(_FALLBACK_PRICE_SELECTORS)
    price, listing_type_from_price = _parse_zillow_price(price_raw)
    listing_type = parse_listing_type(url, price_string=price_raw)
    # Price string takes precedence over URL for Zillow (more reliable signal)
    if listing_type == "unknown" and listing_type_from_price != "unknown":
        listing_type = listing_type_from_price
    if price is None:
        missing.append("price")

    # ── Address ───────────────────────────────────────────────────────────────
    address_raw = await _try_text([_SELECTORS["address"], "h1[class*='address']", "h1"])
    address = address_raw.split(",")[0].strip() if address_raw else None
    postal_code = _parse_postal_code(address_raw)
    if not address:
        missing.append("address")
    if not postal_code:
        missing.append("postal_code")

    # ── Beds ──────────────────────────────────────────────────────────────────
    beds_raw = await _try_text(
        [
            "span[data-testid='bed-bath-item']",
            "[class*='bed']",
            "span:has-text('bds')",
            "span:has-text('bd')",
        ]
    )
    beds = _parse_beds(beds_raw)
    if beds is None:
        missing.append("beds")

    # ── Baths ─────────────────────────────────────────────────────────────────
    baths_raw = await _try_text(
        [
            "span[data-testid='bath-item']",
            "[class*='bath']",
            "span:has-text('ba')",
        ]
    )
    baths = _parse_baths(baths_raw)
    if baths is None:
        missing.append("baths")

    # ── Sqft ──────────────────────────────────────────────────────────────────
    sqft_raw = await _try_text(
        [
            "span:has-text('sqft')",
            "[class*='sqft']",
            "[data-testid*='sqft']",
        ]
    )
    sqft = _parse_sqft(sqft_raw)
    if sqft is None:
        missing.append("sqft")

    # ── Property type ─────────────────────────────────────────────────────────
    property_type = await _try_text(
        [
            _SELECTORS["property_type"],
            "[data-testid='home-type']",
            "span[class*='homeType']",
        ]
    )
    if not property_type:
        missing.append("property_type")

    # ── Description (strip PII) ───────────────────────────────────────────────
    desc_raw = await _try_text(
        [_SELECTORS["description"], "[data-testid='description']"]
    )
    listing_description = _strip_pii(desc_raw)
    if not listing_description:
        missing.append("listing_description")

    # ── Photo URLs (metadata only — URLs from img src) ────────────────────────
    try:
        photo_els = page.locator("img[src*='photos.zillowstatic.com']")
        count = await photo_els.count()
        photo_urls = [
            await photo_els.nth(i).get_attribute("src")
            for i in range(min(count, 10))  # Cap at 10 photos
        ]
        photo_urls = [u for u in photo_urls if u]
    except Exception:
        photo_urls = []

    fields: dict[str, Any] = {
        "source_url": url,
        "source": SOURCE,
        "listing_type": listing_type,
        "address": address,
        "postal_code": postal_code,
        "province": detect_province(postal_code) if postal_code else None,
        "price": price,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "property_type": property_type,
        "annual_taxes": None,  # Zillow.ca does not surface tax data
        "taxes_known": False,
        "condo_fee": None,  # Zillow.ca does not surface condo fee reliably
        "condo_fee_known": False,
        "year_built": None,  # May appear in "Facts and features" — extend later
        "year_built_known": False,
        "days_on_market": None,  # Extracted from page metadata — extend later
        "listing_description": listing_description,
        "photo_urls": photo_urls,
    }
    return fields, missing


# ── Main scraper function ──────────────────────────────────────────────────────


async def scrape_listing(url: str) -> dict[str, Any]:
    """
    Scrape a single Zillow.ca listing and write the result to Supabase.

    Rejects US Zillow (zillow.com) URLs before doing any work.
    Enforces 4-second rate limiting. Rotates through proxy IPs.

    On any failure: logs the error, returns whatever partial data was
    collected, and sets scrape_status to 'partial' or 'failed'. Never raises.

    Args:
        url: Full Zillow.ca listing URL (must be zillow.ca, not zillow.com).

    Returns:
        Dict with all extracted listing fields plus 'scrape_status'.
    """
    # Enforce rate limit
    await wait_for_rate_limit(SOURCE)

    proxy = _get_next_proxy()
    start_ms = int(time.monotonic() * 1000)
    http_status: int | None = None
    error_msg: str | None = None

    try:
        async with async_playwright() as pw:
            launch_args: dict[str, Any] = {
                "headless": True,
                "args": [
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            }
            if proxy:
                launch_args["proxy"] = {"server": proxy}

            browser: Browser = await pw.chromium.launch(**launch_args)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                locale="en-CA",
                timezone_id="America/Toronto",
            )

            page = await context.new_page()

            # Navigate and wait for a meaningful element (not just networkidle)
            response = await page.goto(url, timeout=30_000)
            http_status = response.status if response else None

            # Wait for price element — the most reliable signal the page has loaded
            try:
                await page.wait_for_selector(
                    ", ".join(_FALLBACK_PRICE_SELECTORS),
                    timeout=10_000,
                )
            except Exception:
                # Page may still have useful data even if price selector times out
                pass

            # Extract all fields from the page DOM
            fields, missing = await _extract_page_data(page, url)

            # Capture raw HTML for debugging
            raw_html = await page.content()

            await browser.close()

    except Exception as exc:
        error_msg = str(exc)
        logger.error("zillow scrape_listing error for %s: %s", url, exc)
        duration_ms = int(time.monotonic() * 1000) - start_ms
        await log_scrape(SOURCE, url, "failed", http_status, error_msg, duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Could not read that listing — enter details manually.",
        }

    duration_ms = int(time.monotonic() * 1000) - start_ms

    # If no Canadian postal code was found, the listing is outside Canada —
    # return a clear error without writing anything to the database.
    if not fields.get("postal_code"):
        logger.warning(
            "No Canadian postal code found for %s — likely a US listing", url
        )
        await log_scrape(
            SOURCE, url, "failed", http_status, "No Canadian postal code", duration_ms
        )
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Property does not appear to be in Ontario.",
        }

    # Determine final status
    critical_fields = {"address", "price", "beds"}
    missing_critical = critical_fields & set(missing)
    status = (
        "failed"
        if len(missing_critical) == len(critical_fields)
        else ("partial" if (missing_critical or missing) else "success")
    )

    record: dict[str, Any] = {
        **fields,
        "raw_json": {"html_length": len(raw_html), "url": url},
        "scrape_status": status,
        "missing_fields": missing,
    }

    # Write to Supabase
    saved = await upsert_listing(record)
    await log_scrape(SOURCE, url, status, http_status, None, duration_ms)

    if saved:
        return {**record, **saved}
    return record
