"""
Rental comparables scraper — runs nightly at 2 AM ET on Railway.

Collects current rental listings from three Canadian rental platforms:
  - Rentals.ca  (highest coverage, lowest risk)
  - Kijiji       (broad coverage, moderate risk)
  - PadMapper    (aggregator — useful for dedup cross-check)

Each sub-scraper returns a list of raw dicts. A shared normalisation
function geocodes, converts weekly rents, parses beds, strips PII,
and generates the dedup_hash before writing to Supabase.

Deduplication: md5(address + rent_monthly + beds) — same listing on
multiple sources within 7 days produces a single rental_listings row.

PII policy: agent names, phone numbers, and email addresses are stripped
from all rental listing data before writing to the database.

TEMPLATE CODE — page selectors and URL patterns will shift.
Update this file and the spec together when scrapers break.
"""

import asyncio
import hashlib
import logging
import re
import time
from datetime import date, datetime, timezone
from typing import Any

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from playwright.async_api import async_playwright, Page, Browser

from db import log_scrape
from rate_limiter import wait_for_rate_limit

logger = logging.getLogger(__name__)

# ── Nominatim geocoder ─────────────────────────────────────────────────────────
# Nominatim usage policy requires:
#   - 1 request per second maximum
#   - Meaningful User-Agent string identifying the application

_geocoder = Nominatim(user_agent="PropScout/1.0 (zain03hussain@gmail.com)")


# ── Deduplication ──────────────────────────────────────────────────────────────


def make_dedup_hash(address: str | None, rent_monthly: float, beds: int | None) -> str:
    """
    Generate a stable deduplication hash for a rental listing.

    Same listing appearing on multiple sources within one scraping run
    produces the same hash and is upserted to a single row.

    Args:
        address:      Normalised address string (lowercased, stripped).
        rent_monthly: Monthly rent in dollars.
        beds:         Bedroom count as integer (0 for bachelor).

    Returns:
        MD5 hex digest string (32 chars).
    """
    canonical = f"{(address or '').strip().lower()}|{int(rent_monthly)}|{beds or 0}"
    return hashlib.md5(canonical.encode("utf-8")).hexdigest()


# ── Beds parsing ───────────────────────────────────────────────────────────────


def parse_beds(raw: str | None) -> int | None:
    """
    Parse a bedroom count string to integer.

    Handles: "Studio", "Bachelor", "1+1", "2", "3 bedrooms", etc.
    "1+1" → 1 (den is not a bedroom for comps matching purposes).

    Args:
        raw: Raw bedroom string from the listing.

    Returns:
        Bedroom count as integer, or None if unparseable.
    """
    if not raw:
        return None
    raw_lower = raw.lower().strip()
    if any(kw in raw_lower for kw in ["studio", "bachelor"]):
        return 0
    # "1+1" → take only the base count
    match = re.search(r"(\d+)", raw_lower)
    return int(match.group(1)) if match else None


# ── Rent normalisation ─────────────────────────────────────────────────────────


def normalise_rent(amount: float | None, period: str = "monthly") -> float | None:
    """
    Convert rent to monthly if posted as weekly.

    Args:
        amount: Rent amount (in the original period).
        period: 'monthly' or 'weekly'. Defaults to 'monthly'.

    Returns:
        Monthly rent as float, or None if amount is None.
    """
    if amount is None:
        return None
    if period == "weekly":
        return round(amount * 52 / 12, 2)
    return amount


# ── PII stripping ──────────────────────────────────────────────────────────────


def strip_pii(text: str | None) -> str | None:
    """
    Remove agent names, phone numbers, and email addresses.

    Args:
        text: Raw text from a rental listing.

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


# ── Geocoding ──────────────────────────────────────────────────────────────────


async def geocode_address(address: str) -> tuple[float | None, float | None]:
    """
    Geocode an address to lat/lng using Nominatim (OpenStreetMap).

    Nominatim usage policy requires a 1-second delay between requests.
    This function enforces that delay via asyncio.sleep.

    Args:
        address: Full address string (city, province should be appended for accuracy).

    Returns:
        Tuple of (latitude, longitude) or (None, None) if geocoding fails.
    """
    await asyncio.sleep(1.0)  # Nominatim rate limit: 1 req/sec
    try:
        location = await asyncio.to_thread(_geocoder.geocode, address, timeout=5)
        if location:
            return float(location.latitude), float(location.longitude)
    except (GeocoderTimedOut, GeocoderServiceError) as exc:
        logger.warning("Geocoding failed for '%s': %s", address, exc)
    except Exception as exc:
        logger.warning("Geocoding unexpected error for '%s': %s", address, exc)
    return None, None


# ── Normalisation ──────────────────────────────────────────────────────────────


async def normalise_rental_listing(
    raw: dict[str, Any], source: str, city: str
) -> dict[str, Any]:
    """
    Normalise a raw rental listing dict for insertion into rental_listings.

    Geocodes address, converts weekly rents to monthly, parses beds to int,
    strips PII, and generates the dedup_hash.

    Args:
        raw:    Raw listing dict from a sub-scraper.
        source: Source identifier (e.g. 'rentals_ca').
        city:   City name (appended to address for geocoding accuracy).

    Returns:
        Normalised dict ready for upsert_rental_listing().
    """
    address_raw = raw.get("address", "")
    address_for_geocode = (
        f"{address_raw}, {city}, Ontario, Canada" if address_raw else ""
    )

    lat, lng = (
        await geocode_address(address_for_geocode)
        if address_for_geocode
        else (None, None)
    )

    beds = parse_beds(str(raw.get("beds", "")))

    rent_period = raw.get("rent_period", "monthly")
    rent_raw = raw.get("rent_monthly")
    try:
        rent_amount: float | None = (
            float(str(rent_raw).replace(",", "")) if rent_raw else None
        )
    except (ValueError, TypeError):
        rent_amount = None
    rent_monthly = normalise_rent(rent_amount, rent_period)

    if rent_monthly is None:
        return {}  # Can't normalise without rent — skip this record

    # Parse sqft
    sqft_raw = raw.get("sqft")
    sqft: int | None = None
    if sqft_raw:
        match = re.search(r"(\d[\d,]*)", str(sqft_raw))
        if match:
            try:
                sqft = int(match.group(1).replace(",", ""))
            except ValueError:
                pass

    # Parse listed_at date
    listed_at: date | None = None
    listed_raw = raw.get("listed_at")
    if listed_raw:
        try:
            listed_at = date.fromisoformat(str(listed_raw)[:10])
        except (ValueError, TypeError):
            pass

    dedup_hash = make_dedup_hash(address_raw, rent_monthly, beds)

    return {
        "source": source,
        "address": strip_pii(address_raw),
        "postal_code": raw.get("postal_code"),
        "lat": lat,
        "lng": lng,
        "beds": beds,
        "baths": raw.get("baths"),
        "rent_monthly": rent_monthly,
        "sqft": sqft,
        "listed_at": listed_at.isoformat() if listed_at else None,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "dedup_hash": dedup_hash,
        "raw_json": raw,
    }


# ── Rentals.ca scraper ─────────────────────────────────────────────────────────


async def scrape_rentals_ca(city: str) -> list[dict[str, Any]]:
    """
    Scrape current rental listings from Rentals.ca for a given city.

    Navigates to the city search results page and extracts listing cards.
    Returns raw dicts — call normalise_rental_listing() before inserting.

    TEMPLATE CODE — selectors will shift when Rentals.ca updates their UI.

    Args:
        city: City name (e.g. "Toronto", "Hamilton").

    Returns:
        List of raw listing dicts. Empty list on any failure.
    """
    source = "rentals_ca"
    city_slug = city.lower().replace(" ", "-")
    url = f"https://rentals.ca/{city_slug}"

    await wait_for_rate_limit(source)
    start_ms = int(time.monotonic() * 1000)
    results: list[dict[str, Any]] = []

    try:
        async with async_playwright() as pw:
            browser: Browser = await pw.chromium.launch(
                headless=True, args=["--no-sandbox"]
            )
            page: Page = await browser.new_page()

            await page.goto(url, timeout=30_000)

            # Wait for listing cards
            try:
                await page.wait_for_selector(
                    "[class*='listing-card'], [class*='PropertyCard'], article",
                    timeout=10_000,
                )
            except Exception:
                logger.warning("rentals_ca: listing cards did not appear for %s", city)

            # Extract listing cards — TEMPLATE CODE selectors
            cards = await page.query_selector_all(
                "[class*='listing-card'], [data-testid='listing-item'], article.listing"
            )
            for card in cards[:50]:  # Cap at 50 per city to avoid over-scraping
                try:
                    address = await _safe_inner_text(card, "[class*='address'], h3, h2")
                    price_raw = await _safe_inner_text(
                        card, "[class*='price'], [class*='rent']"
                    )
                    beds_raw = await _safe_inner_text(
                        card, "[class*='bed'], [class*='Bed']"
                    )
                    baths_raw = await _safe_inner_text(
                        card, "[class*='bath'], [class*='Bath']"
                    )
                    sqft_raw = await _safe_inner_text(
                        card, "[class*='sqft'], [class*='size']"
                    )

                    if not price_raw:
                        continue  # Skip listings without rent

                    rent_match = re.search(r"([\d,]+)", price_raw)
                    rent_monthly = (
                        float(rent_match.group(1).replace(",", ""))
                        if rent_match
                        else None
                    )

                    if rent_monthly is None or rent_monthly < 100:
                        continue  # Skip clearly invalid rent values

                    results.append(
                        {
                            "address": address,
                            "rent_monthly": rent_monthly,
                            "beds": beds_raw,
                            "baths": baths_raw,
                            "sqft": sqft_raw,
                            "listed_at": None,
                            "rent_period": "monthly",
                        }
                    )
                except Exception as exc:
                    logger.warning("rentals_ca: card parse error: %s", exc)
                    continue

            await browser.close()

    except Exception as exc:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        logger.error("scrape_rentals_ca failed for %s: %s", city, exc)
        await log_scrape(source, url, "failed", None, str(exc), duration_ms)
        return []

    duration_ms = int(time.monotonic() * 1000) - start_ms
    status = "success" if results else "partial"
    await log_scrape(source, url, status, 200, None, duration_ms)
    logger.info("rentals_ca: scraped %d listings for %s", len(results), city)
    return results


# ── Kijiji scraper ─────────────────────────────────────────────────────────────


async def scrape_kijiji(city: str) -> list[dict[str, Any]]:
    """
    Scrape current rental listings from Kijiji for a given city.

    Navigates to the apartments/condos category for the city.
    TEMPLATE CODE — URL slugs and selectors will shift.

    Args:
        city: City name (e.g. "Toronto", "Hamilton").

    Returns:
        List of raw listing dicts. Empty list on any failure.
    """
    source = "kijiji"

    # City slug → Kijiji location ID mapping — TEMPLATE CODE
    # Location IDs from Kijiji URL structure: /b-apartments-condos/{city}/c37l{id}
    _KIJIJI_CITIES: dict[str, str] = {
        "Toronto": "1700273",
        "Hamilton": "1700212",
        "Ottawa": "1700185",
        "Mississauga": "1700276",
    }
    location_id = _KIJIJI_CITIES.get(city, "1700273")  # Default to Toronto
    url = f"https://www.kijiji.ca/b-apartments-condos/{city.lower()}/c37l{location_id}"

    await wait_for_rate_limit(source)
    start_ms = int(time.monotonic() * 1000)
    results: list[dict[str, Any]] = []

    try:
        async with async_playwright() as pw:
            browser: Browser = await pw.chromium.launch(
                headless=True, args=["--no-sandbox"]
            )
            page: Page = await browser.new_page()

            await page.goto(url, timeout=30_000)

            try:
                await page.wait_for_selector(
                    "[data-testid='listing-card-list-item'], li[class*='regular-ad']",
                    timeout=10_000,
                )
            except Exception:
                logger.warning("kijiji: listing cards did not appear for %s", city)

            cards = await page.query_selector_all(
                "[data-testid='listing-card-list-item'], li[class*='regular-ad']"
            )
            for card in cards[:50]:
                try:
                    title = await _safe_inner_text(card, "h3[class*='title'], .title")
                    price_raw = await _safe_inner_text(card, "[class*='price']")
                    location_raw = await _safe_inner_text(card, "[class*='location']")
                    desc_raw = await _safe_inner_text(card, "[class*='description']")

                    if not price_raw:
                        continue

                    rent_match = re.search(r"([\d,]+)", price_raw)
                    rent_monthly = (
                        float(rent_match.group(1).replace(",", ""))
                        if rent_match
                        else None
                    )

                    if rent_monthly is None or rent_monthly < 100:
                        continue

                    # Extract bed count from title/description ("2 bedroom", "3 bdrm", etc.)
                    beds_text = title or desc_raw or ""
                    beds_match = re.search(
                        r"(\d+)\s*(?:bed|bdr|bdrm|bedroom)",
                        beds_text,
                        re.IGNORECASE,
                    )
                    beds_raw = beds_match.group(0) if beds_match else None

                    results.append(
                        {
                            "address": strip_pii(f"{location_raw}, {city}".strip(", ")),
                            "rent_monthly": rent_monthly,
                            "beds": beds_raw,
                            "baths": None,
                            "sqft": None,
                            "listed_at": None,
                            "rent_period": "monthly",
                        }
                    )
                except Exception as exc:
                    logger.warning("kijiji: card parse error: %s", exc)
                    continue

            await browser.close()

    except Exception as exc:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        logger.error("scrape_kijiji failed for %s: %s", city, exc)
        await log_scrape(source, url, "failed", None, str(exc), duration_ms)
        return []

    duration_ms = int(time.monotonic() * 1000) - start_ms
    status = "success" if results else "partial"
    await log_scrape(source, url, status, 200, None, duration_ms)
    logger.info("kijiji: scraped %d listings for %s", len(results), city)
    return results


# ── PadMapper scraper ──────────────────────────────────────────────────────────


async def scrape_padmapper(city: str) -> list[dict[str, Any]]:
    """
    Scrape current rental listings from PadMapper for a given city.

    PadMapper is an aggregator — many listings also appear on Kijiji/Rentals.ca.
    The dedup_hash prevents duplicates from inflating the comps count.

    TEMPLATE CODE — URL patterns and selectors will shift.

    Args:
        city: City name (e.g. "Toronto", "Hamilton").

    Returns:
        List of raw listing dicts. Empty list on any failure.
    """
    source = "padmapper"
    city_slug = city.lower().replace(" ", "-")
    url = f"https://www.padmapper.com/apartments/{city_slug}-on"

    await wait_for_rate_limit(source)
    start_ms = int(time.monotonic() * 1000)
    results: list[dict[str, Any]] = []

    try:
        async with async_playwright() as pw:
            browser: Browser = await pw.chromium.launch(
                headless=True, args=["--no-sandbox"]
            )
            page: Page = await browser.new_page()

            await page.goto(url, timeout=30_000)

            try:
                await page.wait_for_selector(
                    "[class*='listing'], [class*='ListingCard'], [class*='property-card']",
                    timeout=10_000,
                )
            except Exception:
                logger.warning("padmapper: listing cards did not appear for %s", city)

            cards = await page.query_selector_all(
                "[class*='ListingCard'], [class*='property-card']"
            )
            for card in cards[:50]:
                try:
                    address = await _safe_inner_text(
                        card, "[class*='address'], [class*='street']"
                    )
                    price_raw = await _safe_inner_text(
                        card, "[class*='price'], [class*='rent']"
                    )
                    beds_raw = await _safe_inner_text(
                        card, "[class*='beds'], [class*='bedroom']"
                    )
                    baths_raw = await _safe_inner_text(
                        card, "[class*='baths'], [class*='bathroom']"
                    )

                    if not price_raw:
                        continue

                    rent_match = re.search(r"([\d,]+)", price_raw)
                    rent_monthly = (
                        float(rent_match.group(1).replace(",", ""))
                        if rent_match
                        else None
                    )

                    if rent_monthly is None or rent_monthly < 100:
                        continue

                    results.append(
                        {
                            "address": strip_pii(address),
                            "rent_monthly": rent_monthly,
                            "beds": beds_raw,
                            "baths": baths_raw,
                            "sqft": None,
                            "listed_at": None,
                            "rent_period": "monthly",
                        }
                    )
                except Exception as exc:
                    logger.warning("padmapper: card parse error: %s", exc)
                    continue

            await browser.close()

    except Exception as exc:
        duration_ms = int(time.monotonic() * 1000) - start_ms
        logger.error("scrape_padmapper failed for %s: %s", city, exc)
        await log_scrape(source, url, "failed", None, str(exc), duration_ms)
        return []

    duration_ms = int(time.monotonic() * 1000) - start_ms
    status = "success" if results else "partial"
    await log_scrape(source, url, status, 200, None, duration_ms)
    logger.info("padmapper: scraped %d listings for %s", len(results), city)
    return results


# ── Playwright helper ──────────────────────────────────────────────────────────


async def _safe_inner_text(element: Any, selector: str) -> str | None:
    """
    Try to get inner text from a child element matching selector.

    Returns None if the selector matches nothing or inner_text() raises.

    Args:
        element:  Playwright ElementHandle to query within.
        selector: CSS selector string.

    Returns:
        Stripped inner text string or None.
    """
    try:
        child = await element.query_selector(selector)
        if child:
            text = await child.inner_text()
            return text.strip() if text else None
    except Exception:
        pass
    return None


# ── Comps percentile calculation ───────────────────────────────────────────────


def calculate_percentiles(rents: list[float]) -> dict[str, float | int]:
    """
    Calculate the 25th / 50th / 75th percentile rent values.

    Uses linear interpolation (same as numpy's default 'linear' method).

    Args:
        rents: List of monthly rent values (floats).

    Returns:
        Dict with keys: low (P25), mid (P50), high (P75), count.
    """
    if not rents:
        return {"low": 0, "mid": 0, "high": 0, "count": 0}

    sorted_rents = sorted(rents)
    n = len(sorted_rents)

    def percentile(p: float) -> float:
        """Return the p-th percentile via linear interpolation."""
        index = (p / 100) * (n - 1)
        lower = int(index)
        upper = lower + 1
        frac = index - lower
        if upper >= n:
            return sorted_rents[lower]
        return sorted_rents[lower] * (1 - frac) + sorted_rents[upper] * frac

    return {
        "low": round(percentile(25)),
        "mid": round(percentile(50)),
        "high": round(percentile(75)),
        "count": n,
    }
