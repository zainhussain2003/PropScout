"""
Realtor.ca listing scraper — spec Section 11.2 (TEMPLATE CODE).

Uses the Realtor.ca internal JSON API (not HTML scraping).
Endpoint URLs and field mappings will shift as Realtor.ca updates their API.
Update this file and the spec together whenever the scraper changes.

Rate limiting: 4-second minimum between requests.
Proxy rotation: round-robin through PROXY_1 / PROXY_2 / PROXY_3 env vars.

PII policy: agent names, emails, and phone numbers are stripped before
writing to the database. Only property data is stored.

Runs on Railway as a triggered job (not a scheduled cron).
"""

import logging
import os
import re
import time
from typing import Any

import httpx

from db import log_scrape, upsert_listing
from listing_type import parse_listing_type
from province import detect_province
from rate_limiter import wait_for_rate_limit

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

SOURCE = "realtor_ca"

# Realtor.ca internal PropertyDetails API — TEMPLATE CODE
# This endpoint is reverse-engineered from browser network tabs.
# Field paths will shift when Realtor.ca updates their API.
_DETAILS_URL = "https://api2.realtor.ca/Listing.svc/PropertyDetails"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.realtor.ca/",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-CA,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
}

# Round-robin index — persists within a single worker process
_proxy_index = 0


# ── Proxy rotation ─────────────────────────────────────────────────────────────


def _get_next_proxy() -> str | None:
    """
    Return the next proxy URL from PROXY_1/PROXY_2/PROXY_3 env vars.

    Rotates round-robin. Returns None if no proxies are configured.

    Returns:
        Proxy URL string (e.g. "http://user:pass@host:port") or None.
    """
    global _proxy_index
    proxies = [os.environ.get(f"PROXY_{i}", "").strip() for i in range(1, 4)]
    configured = [p for p in proxies if p]
    if not configured:
        return None
    proxy = configured[_proxy_index % len(configured)]
    _proxy_index += 1
    return proxy


# ── URL parsing ────────────────────────────────────────────────────────────────


def extract_listing_id(url: str) -> str | None:
    """
    Extract the numeric listing ID from a Realtor.ca URL.

    Realtor.ca URLs follow the pattern:
      https://www.realtor.ca/real-estate/{ID}/{slug}

    The ID is the first numeric segment after /real-estate/.

    Args:
        url: Full Realtor.ca listing URL.

    Returns:
        Listing ID string (e.g. "27123456") or None if not found.
    """
    match = re.search(r"/real-estate/(\d+)/", url)
    return match.group(1) if match else None


# ── Field parsing helpers ──────────────────────────────────────────────────────


def _parse_price(raw: str | None) -> float | None:
    """
    Parse a Realtor.ca price string to a float.

    Handles formats like "729,900" or "$729,900" or "729900".

    Args:
        raw: Raw price string from the API response.

    Returns:
        Price as a float, or None if parsing fails.
    """
    if not raw:
        return None
    cleaned = re.sub(r"[^0-9.]", "", str(raw))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _parse_int(raw: Any) -> int | None:
    """
    Parse a value to int, returning None on failure.

    Args:
        raw: Raw value (string, int, float, or None).

    Returns:
        Integer value or None.
    """
    if raw is None:
        return None
    try:
        return int(str(raw).strip())
    except (ValueError, AttributeError):
        return None


def _parse_float(raw: Any) -> float | None:
    """
    Parse a value to float, returning None on failure.

    Args:
        raw: Raw value (string, int, float, or None).

    Returns:
        Float value or None.
    """
    if raw is None:
        return None
    try:
        cleaned = re.sub(r"[^0-9.]", "", str(raw))
        return float(cleaned) if cleaned else None
    except (ValueError, AttributeError):
        return None


def _parse_sqft(raw: str | None) -> int | None:
    """
    Parse an interior size string to integer square feet.

    Handles "1,400 sqft", "1400", "130 m²" (converted to sqft).

    Args:
        raw: Raw size string from the API.

    Returns:
        Size in square feet as int, or None if parsing fails.
    """
    if not raw:
        return None
    raw_lower = raw.lower()

    # Extract the numeric part
    match = re.search(r"([\d,]+\.?\d*)", raw)
    if not match:
        return None

    try:
        value = float(match.group(1).replace(",", ""))
    except ValueError:
        return None

    # Convert m² to sqft if unit is metric
    if "m²" in raw_lower or "sq m" in raw_lower or "sqm" in raw_lower:
        value = value * 10.7639

    return int(value)


def _strip_pii(text: str | None) -> str | None:
    """
    Remove agent names, phone numbers, and email addresses from text.

    PII policy: only property data is stored — no agent contact details.

    Args:
        text: Raw text that may contain PII.

    Returns:
        Sanitised text, or None if input is None.
    """
    if not text:
        return text

    # Strip email addresses
    text = re.sub(r"\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b", "[email removed]", text)

    # Strip phone numbers (North American and international formats)
    text = re.sub(
        r"\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b",
        "[phone removed]",
        text,
    )

    return text


# ── Field extraction from API response ────────────────────────────────────────


def _extract_fields(
    data: dict[str, Any],
    url: str,
    listing_id: str,
) -> tuple[dict[str, Any], list[str]]:
    """
    Extract listing fields from the Realtor.ca PropertyDetails API response.

    This is TEMPLATE CODE — field paths may shift when Realtor.ca updates their API.
    Extend the mapping below when new fields are encountered.

    Args:
        data:       Full parsed API response dict.
        url:        Original listing URL (used for listing_type detection).
        listing_id: Realtor.ca listing ID (used as fallback identifier).

    Returns:
        Tuple of (extracted_fields_dict, list_of_missing_field_names).
    """
    # The API wraps all data under a top-level "PropertyDetails" key
    pd = data.get("PropertyDetails", data)

    prop = pd.get("Property", {})
    building = pd.get("Building", {})
    tax_info = pd.get("AnnualTax", {}) or {}
    address_info = prop.get("Address", {})

    missing: list[str] = []

    # ── Address ───────────────────────────────────────────────────────────────
    # AddressText is pipe-delimited: "5702 BUTTERMILL Ave|Vaughan, Ontario L4K 5N2"
    raw_address = address_info.get("AddressText", "")
    address = raw_address.split("|")[0].strip() if raw_address else None
    if not address:
        missing.append("address")

    # ── Postal code ───────────────────────────────────────────────────────────
    postal_match = re.search(r"[A-Z]\d[A-Z]\s?\d[A-Z]\d", raw_address.upper())
    postal_code = postal_match.group(0).replace(" ", "") if postal_match else None
    # Re-format with space: "L4K5N2" → "L4K 5N2"
    if postal_code and len(postal_code) == 6:
        postal_code = postal_code[:3] + " " + postal_code[3:]
    if not postal_code:
        missing.append("postal_code")

    # ── Price ─────────────────────────────────────────────────────────────────
    price_raw = prop.get("Price") or prop.get("PriceUnformattedValue")
    price = _parse_price(str(price_raw)) if price_raw else None
    if price is None:
        missing.append("price")

    # ── Listing type ──────────────────────────────────────────────────────────
    price_str = str(prop.get("Price", ""))
    listing_type = parse_listing_type(url, price_string=price_str)

    # ── Beds ──────────────────────────────────────────────────────────────────
    beds_raw = (
        building.get("BedroomsAboveGround")
        or building.get("BedroomsTotal")
        or building.get("Bedrooms")
    )
    beds = _parse_int(beds_raw)
    if beds is None:
        missing.append("beds")

    # ── Baths ─────────────────────────────────────────────────────────────────
    baths_raw = building.get("BathroomTotal") or building.get("Bathrooms")
    baths = _parse_float(baths_raw)
    if baths is None:
        missing.append("baths")

    # ── Sqft ──────────────────────────────────────────────────────────────────
    sqft_raw = building.get("SizeInterior")
    sqft = _parse_sqft(str(sqft_raw)) if sqft_raw else None
    if sqft is None:
        missing.append("sqft")

    # ── Property type ─────────────────────────────────────────────────────────
    property_type = None
    type_obj = prop.get("Type")
    if isinstance(type_obj, dict):
        property_type = type_obj.get("Name")
    elif isinstance(type_obj, str):
        property_type = type_obj
    if not property_type:
        missing.append("property_type")

    # ── Annual taxes ──────────────────────────────────────────────────────────
    tax_raw = tax_info.get("TaxAmount") or pd.get("AnnualTax")
    annual_taxes = _parse_float(tax_raw)
    taxes_known = annual_taxes is not None
    if not taxes_known:
        missing.append("annual_taxes")

    # ── Condo fee ─────────────────────────────────────────────────────────────
    fee_raw = (
        pd.get("MaintenanceFee") or pd.get("CondoFee") or prop.get("MaintenanceFee")
    )
    condo_fee = _parse_float(fee_raw)
    # A fee of 0 is valid (no condo fee) but unknown is None
    condo_fee_known = condo_fee is not None
    if not condo_fee_known:
        missing.append("condo_fee")

    # ── Year built ────────────────────────────────────────────────────────────
    year_raw = building.get("YearBuilt") or building.get("BuiltIn")
    year_built = _parse_int(year_raw)
    year_built_known = year_built is not None
    if not year_built_known:
        missing.append("year_built")

    # ── Days on market ────────────────────────────────────────────────────────
    dom_raw = pd.get("DaysOnMarket") or prop.get("DaysOnMarket")
    days_on_market = _parse_int(dom_raw)
    if days_on_market is None:
        missing.append("days_on_market")

    # ── Listing description (strip PII) ───────────────────────────────────────
    description_raw = (
        pd.get("PublicRemarks") or pd.get("Description") or prop.get("Description")
    )
    listing_description = _strip_pii(description_raw)
    if not listing_description:
        missing.append("listing_description")

    # ── Photo URLs (metadata only — do not download) ──────────────────────────
    photos_raw = prop.get("Photo") or []
    photo_urls = [
        p["LargePhotoUrl"]
        for p in (photos_raw if isinstance(photos_raw, list) else [])
        if isinstance(p, dict) and "LargePhotoUrl" in p
    ]

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
        "annual_taxes": annual_taxes,
        "taxes_known": taxes_known,
        "condo_fee": condo_fee,
        "condo_fee_known": condo_fee_known,
        "year_built": year_built,
        "year_built_known": year_built_known,
        "days_on_market": days_on_market,
        "listing_description": listing_description,
        "photo_urls": photo_urls,
    }
    return fields, missing


# ── Main scraper function ──────────────────────────────────────────────────────


async def scrape_listing(url: str) -> dict[str, Any]:
    """
    Scrape a single Realtor.ca listing and write the result to Supabase.

    Enforces 4-second rate limiting between requests. Rotates through
    proxy IPs from PROXY_1 / PROXY_2 / PROXY_3 environment variables.

    On any failure (timeout, 403, parse error): logs the error, returns
    whatever partial data was collected, and sets scrape_status to
    'partial' or 'failed'. Never raises — always returns a dict.

    Args:
        url: Full Realtor.ca listing URL.

    Returns:
        Dict with all extracted listing fields plus 'scrape_status'.
        On failure, 'scrape_status' is 'failed' or 'partial' and
        'error' contains a user-facing message.
    """
    listing_id = extract_listing_id(url)
    if not listing_id:
        logger.warning("Could not extract listing ID from URL: %s", url)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Could not extract a Realtor.ca listing ID from this URL.",
        }

    # Enforce rate limit before making any request
    await wait_for_rate_limit(SOURCE)

    params = {
        "ApplicationId": "1",
        "PropertyID": listing_id,
        "PropertyDetails.Culture": "en-CA",
    }

    proxy = _get_next_proxy()
    proxy_config = {"http://": proxy, "https://": proxy} if proxy else None

    start_ms = int(time.monotonic() * 1000)
    http_status: int | None = None
    error_msg: str | None = None

    try:
        async with httpx.AsyncClient(
            headers=_HEADERS,
            proxies=proxy_config,  # type: ignore[arg-type]
            timeout=15.0,
            follow_redirects=True,
        ) as client:
            response = await client.get(_DETAILS_URL, params=params)
            http_status = response.status_code
            response.raise_for_status()
            data: dict[str, Any] = response.json()

    except httpx.HTTPStatusError as exc:
        http_status = exc.response.status_code
        error_msg = f"HTTP {http_status} from Realtor.ca API"
        logger.error("scrape_listing HTTP error for %s: %s", url, error_msg)
        duration_ms = int(time.monotonic() * 1000) - start_ms
        await log_scrape(SOURCE, url, "failed", http_status, error_msg, duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Could not read that listing — enter details manually.",
        }

    except (httpx.TimeoutException, httpx.NetworkError) as exc:
        error_msg = f"Network error: {exc}"
        logger.error("scrape_listing network error for %s: %s", url, error_msg)
        duration_ms = int(time.monotonic() * 1000) - start_ms
        await log_scrape(SOURCE, url, "failed", None, error_msg, duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Network error reaching Realtor.ca — try again in a moment.",
        }

    except Exception as exc:
        error_msg = str(exc)
        logger.error("scrape_listing unexpected error for %s: %s", url, exc)
        duration_ms = int(time.monotonic() * 1000) - start_ms
        await log_scrape(SOURCE, url, "failed", http_status, error_msg, duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Unexpected error reading listing — enter details manually.",
        }

    duration_ms = int(time.monotonic() * 1000) - start_ms

    # ── Parse the response ─────────────────────────────────────────────────────
    try:
        fields, missing = _extract_fields(data, url, listing_id)
    except Exception as exc:
        logger.error("_extract_fields failed for %s: %s", url, exc)
        await log_scrape(SOURCE, url, "failed", http_status, str(exc), duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": "Could not parse listing data — enter details manually.",
        }

    # Determine final status
    critical_fields = {"address", "price", "beds"}
    missing_critical = critical_fields & set(missing)
    status = "partial" if missing_critical else ("partial" if missing else "success")

    record: dict[str, Any] = {
        **fields,
        "raw_json": data,
        "scrape_status": status,
        "missing_fields": missing,
    }

    # Write to Supabase
    saved = await upsert_listing(record)
    await log_scrape(SOURCE, url, status, http_status, None, duration_ms)

    if saved:
        return {**record, **saved}
    return record
