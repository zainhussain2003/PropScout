"""
Realtor.ca listing scraper — spec Section 11.2 (TEMPLATE CODE).

Fetches the public listing page and parses data from:
  1. The embedded dataLayer.push() JavaScript object (price, beds, baths,
     property type, sqft, city, province, MLS number)
  2. HTML element IDs in the listing details section (annual taxes, condo fee,
     year built, days on market, listing description)

The Realtor.ca internal JSON API (api2.realtor.ca) is blocked by Incapsula
bot protection when called without a real browser session. Parsing the page
HTML is more reliable and does not require maintaining session cookies.

HTML structure and element IDs will shift when Realtor.ca updates their site.
Update this file and the spec together whenever the scraper changes.

Rate limiting: 4-second minimum between requests.
Proxy rotation: round-robin through PROXY_1 / PROXY_2 / PROXY_3 env vars.

PII policy: agent names, emails, and phone numbers are stripped before
writing to the database. Only property data is stored.

Runs on Railway as a triggered job (not a scheduled cron).

FUTURE: ScraperAPI integration ($49/mo) — replace the raw httpx fetch with a
ScraperAPI-proxied request so Incapsula is handled automatically. The parsing
logic stays identical; only the HTTP call changes. Pursue when bot-blocking
becomes a consistent production problem.

FUTURE: CREA DDF partnership — official data feed from the Canadian Real Estate
Association. Pursue when PropScout has 50+ paying users to meet CREA's minimum
participant threshold. Would replace the HTML scraper entirely for Realtor.ca
listings and provide structured, reliable data.
"""

import asyncio
import logging
import os
import random
import re
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import httpx

from db import log_scrape, upsert_listing
from listing_type import parse_listing_type
from province import detect_province

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

SOURCE = "realtor_ca"

# Realtor.ca listing page base URL — TEMPLATE CODE
_BASE_URL = "https://www.realtor.ca"

# Rotate between common browser User-Agent strings — fixed intervals and a
# single static UA are bot signals; humans use different browser versions.
USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) "
        "Gecko/20100101 Firefox/125.0"
    ),
]

# Browser-like headers to pass Incapsula bot detection on first request.
# Sec-Fetch-* headers are important for appearing as a real browser.
# User-Agent is set per-request from USER_AGENTS (rotated randomly).
_HEADERS = {
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-CA,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

# Minimum HTML length that indicates a real listing page (not a bot challenge).
# Incapsula challenge pages are ~1-5 KB; real listing pages are 150-250 KB.
_MIN_HTML_LENGTH = 50_000

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

    Handles formats like "729,900" or "$729,900" or "729900" or "569900.00".

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
        cleaned = re.sub(r"[^0-9]", "", str(raw).strip())
        return int(cleaned) if cleaned else None
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

    Handles:
      - "600 - 699 sqft" range  → midpoint (649)
      - "55.7414 m2"            → converted to sqft
      - "1,400 sqft"            → 1400
      - "1400"                  → 1400

    Args:
        raw: Raw size string.

    Returns:
        Size in square feet as int, or None if parsing fails.
    """
    if not raw:
        return None

    raw_lower = raw.lower()

    # Range like "600 - 699 sqft" → use midpoint
    range_match = re.search(r"([\d,]+)\s*-\s*([\d,]+)", raw)
    if range_match:
        try:
            lo = float(range_match.group(1).replace(",", ""))
            hi = float(range_match.group(2).replace(",", ""))
            value = (lo + hi) / 2
            # If unit is m², convert
            if "m2" in raw_lower or "m²" in raw_lower:
                value = value * 10.7639
            return int(value)
        except ValueError:
            pass

    # Single value
    match = re.search(r"([\d,]+\.?\d*)", raw)
    if not match:
        return None

    try:
        value = float(match.group(1).replace(",", ""))
    except ValueError:
        return None

    # Convert m² to sqft
    if "m2" in raw_lower or "m²" in raw_lower or "sq m" in raw_lower:
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


# ── HTML element value extraction ──────────────────────────────────────────────


def _get_element_value(html: str, element_id: str) -> str | None:
    """
    Extract the text content from a specific element ID in the Realtor.ca HTML.

    Realtor.ca uses stable element IDs for listing detail values.
    The pattern is: <div id="{element_id}">...<div class="...Value">{text}</div>

    Args:
        html:       Full HTML source of the listing page.
        element_id: The HTML element ID to look up.

    Returns:
        Stripped text content of the value div, or None if not found.
    """
    # Find the container div
    idx = html.find(element_id)
    if idx < 0:
        return None

    # Find the next "Value" div within 500 characters
    search_window = html[idx : idx + 500]
    value_match = re.search(
        r'class="propertyDetailsSectionContentValue"[^>]*>(.*?)</div>',
        search_window,
        re.DOTALL | re.IGNORECASE,
    )
    if not value_match:
        return None

    # Strip HTML tags and decode common entities
    raw = value_match.group(1)
    text = re.sub(r"<[^>]+>", " ", raw)
    text = text.replace("&amp;", "&").replace("&nbsp;", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text if text else None


def _parse_age_band(age_raw: str | None) -> tuple[int | None, int | None]:
    """
    Parse a Realtor.ca age band string into (year_built_earliest, year_built_latest).

    Realtor.ca agents may publish an age band instead of a specific year.
    Known band vocabulary:
      "0 to 5 years", "6 to 10 years", "11 to 15 years",
      "16 to 30 years", "31 to 50 years", "51 to 99 years",
      "100+ years", "Less than 1 year"

    Returns (None, None) if the input is absent or unparseable.
    Uses the current calendar year — never hardcoded.

    Args:
        age_raw: Raw age band string from the AgeOfBuilding element,
                 e.g. "11 to 15 years".

    Returns:
        (year_built_earliest, year_built_latest) as integers, or (None, None).
    """
    if not age_raw:
        return None, None

    current_year = datetime.now().year
    normalised = age_raw.strip().lower()

    # Pattern: "X to Y years" — e.g. "11 to 15 years"
    range_match = re.match(r"(\d+)\s+to\s+(\d+)\s+years?", normalised)
    if range_match:
        min_age = int(range_match.group(1))
        max_age = int(range_match.group(2))
        return current_year - max_age, current_year - min_age

    # Pattern: "100+ years" or "51+ years"
    plus_match = re.match(r"(\d+)\+\s*years?", normalised)
    if plus_match:
        min_age = int(plus_match.group(1))
        # Earliest is unbounded — use a sentinel of (current_year - 999)
        # so callers can always treat it as an integer.
        return current_year - 999, current_year - min_age

    # Pattern: "less than 1 year" or "0 to 1 years"
    if "less than" in normalised:
        return current_year - 1, current_year

    return None, None


def _extract_datalayer_property(html: str) -> dict[str, str]:
    """
    Extract the property object from the dataLayer.push() call in the page HTML.

    Realtor.ca embeds listing metadata in a JavaScript dataLayer.push() call
    inside a <script> tag. The property object contains key facts:
    price, beds, baths, property type, sqft, city, province, MLS number.

    Args:
        html: Full HTML source of the listing page.

    Returns:
        Dict of property fields (all values are strings). Empty dict if not found.
    """
    prop_match = re.search(r"property\s*:\s*\{([^}]+)\}", html, re.DOTALL)
    if not prop_match:
        return {}

    prop_str = prop_match.group(1)
    result: dict[str, str] = {}
    for kv in re.finditer(r"(\w+)\s*:\s*'([^']*)'", prop_str):
        result[kv.group(1)] = kv.group(2)
    return result


# ── Field extraction from page HTML ───────────────────────────────────────────


def _extract_fields(  # noqa: C901
    html: str,
    url: str,
    listing_id: str,
) -> tuple[dict[str, Any], list[str]]:
    """
    Extract listing fields from the Realtor.ca listing page HTML.

    This is TEMPLATE CODE — HTML structure and element IDs will shift when
    Realtor.ca updates their site. Update field mappings when they change.

    Data sources (in order of preference):
      1. dataLayer.push() object  — price, beds, baths, sqft, property type
      2. Element ID value divs    — taxes, condo fees, year built
      3. Page title / H1          — address, postal code

    Args:
        html:       Full HTML source of the listing page.
        url:        Original listing URL (used for listing_type detection).
        listing_id: Realtor.ca numeric listing ID.

    Returns:
        Tuple of (extracted_fields_dict, list_of_missing_field_names).
    """
    missing: list[str] = []

    # ── 1. dataLayer.push() object ────────────────────────────────────────────
    dl = _extract_datalayer_property(html)

    # ── 2. Address and postal code from page title ────────────────────────────
    # Page title format: "For sale: {ADDRESS}, {CITY}, {PROV} {POSTAL} - {MLS} | REALTOR.ca"
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html)
    title_text = title_match.group(1).strip() if title_match else ""

    # Extract postal code — Canadian format: A1A 1A1
    postal_match = re.search(r"\b([A-Z]\d[A-Z]\s*\d[A-Z]\d)\b", title_text.upper())
    postal_code: str | None = None
    if postal_match:
        raw_postal = postal_match.group(1).replace(" ", "")
        postal_code = (
            raw_postal[:3] + " " + raw_postal[3:] if len(raw_postal) == 6 else None
        )
    if not postal_code:
        missing.append("postal_code")

    # Extract street address from H1 (format: "5312 - 950 PORTAGE PKWY\nVaughan..., ON L4K0J7")
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL)
    address: str | None = None
    if h1_match:
        h1_raw = re.sub(r"<[^>]+>", "", h1_match.group(1))
        # H1 format: "{ADDRESS}{CITY}, Ontario {POSTAL}"
        # Address is everything before the first city/province line
        h1_lines = [line.strip() for line in h1_raw.split("\n") if line.strip()]
        if h1_lines:
            address = h1_lines[0]
            # If address contains the city on the same line, split at the postal code
            if postal_code:
                postal_plain = postal_code.replace(" ", "")
                addr_split = re.split(
                    re.escape(postal_plain), address, flags=re.IGNORECASE
                )
                if len(addr_split) > 1:
                    address = addr_split[0].rstrip(", ").strip()
    if not address:
        # Fallback: extract from title ("For sale: {ADDRESS}, {CITY}...")
        title_addr_match = re.search(
            r"For (?:sale|rent):\s*([^,]+)", title_text, re.IGNORECASE
        )
        if title_addr_match:
            address = title_addr_match.group(1).strip()
    if not address:
        missing.append("address")

    # ── 3. Price ──────────────────────────────────────────────────────────────
    price_raw = dl.get("price") or dl.get("leasePrice")
    price = _parse_price(price_raw) if price_raw else None
    if price is None:
        # Fallback: look for price in Open Graph meta tag
        og_price_match = re.search(
            r'property="og:price:amount"[^>]*content="([^"]+)"', html
        )
        if og_price_match:
            price = _parse_price(og_price_match.group(1))
    if price is None:
        missing.append("price")

    # ── 4. Listing type ───────────────────────────────────────────────────────
    lease_price = dl.get("leasePrice", "")
    price_str = lease_price if lease_price else (price_raw or "")
    listing_type = parse_listing_type(url, price_string=price_str)

    # ── 4a. Rental override ───────────────────────────────────────────────────
    # Rental override — URL-based detection always returns for_sale for
    # /real-estate/ paths. Correct it using page signals already extracted:
    #   - "for rent:" in the page <title> (Realtor.ca renders this explicitly)
    #   - leasePrice non-empty in the dataLayer (Realtor.ca sets this for rentals)
    # lease_price and title_text are already in scope. Only override to for_rent,
    # never to for_sale — keep parse_listing_type() result if neither signal fires.
    title_lower = title_text.lower() if title_text else ""
    if "for rent:" in title_lower or lease_price:
        listing_type = "for_rent"

    # ── 5. Beds ───────────────────────────────────────────────────────────────
    beds = _parse_int(dl.get("bedrooms"))
    if beds is None:
        # Fallback: HTML element for bedrooms above grade
        bed_val = _get_element_value(
            html, "propertyDetailsSectionContentSubCon_BedroomsAboveGrade"
        )
        if bed_val:
            beds = _parse_int(bed_val.split()[0])
    if beds is None:
        missing.append("beds")

    # ── 6. Baths ─────────────────────────────────────────────────────────────
    baths = _parse_float(dl.get("bathrooms"))
    if baths is None:
        bath_val = _get_element_value(
            html, "propertyDetailsSectionContentSubCon_BathroomTotal"
        )
        if bath_val:
            baths = _parse_float(bath_val.split()[0])
    if baths is None:
        missing.append("baths")

    # ── 7. Sqft ───────────────────────────────────────────────────────────────
    sqft: int | None = None
    # Try interior floor space from dataLayer (in m²)
    sqft_dl = dl.get("interiorFloorSpace", "")
    if sqft_dl:
        sqft = _parse_sqft(sqft_dl)
    if sqft is None:
        # Fallback: look for sqft range in HTML ("600 - 699 sqft")
        sqft_match = re.search(r"([\d,]+)\s*-\s*([\d,]+)\s*sqft", html, re.IGNORECASE)
        if sqft_match:
            lo = int(sqft_match.group(1).replace(",", ""))
            hi = int(sqft_match.group(2).replace(",", ""))
            sqft = (lo + hi) // 2
    if sqft is None:
        sqft_el = _get_element_value(
            html, "propertyDetailsSectionContentSubCon_SizeInterior"
        )
        if sqft_el:
            sqft = _parse_sqft(sqft_el)
    if sqft is None:
        missing.append("sqft")

    # ── 8. Property type ─────────────────────────────────────────────────────
    property_type = dl.get("propertyType") or dl.get("buildingType") or None
    if not property_type:
        pt_el = _get_element_value(
            html, "propertyDetailsSectionContentSubCon_PropertyType"
        )
        property_type = pt_el
    if not property_type:
        missing.append("property_type")

    # ── 9. Annual taxes ───────────────────────────────────────────────────────
    tax_val = _get_element_value(
        html, "propertyDetailsSectionContentSubCon_AnnualPropertyTaxes"
    )
    annual_taxes = _parse_float(tax_val) if tax_val else None
    taxes_known = annual_taxes is not None
    if not taxes_known:
        missing.append("annual_taxes")

    # ── 10. Condo / maintenance fee ───────────────────────────────────────────
    fee_val = _get_element_value(
        html, "propertyDetailsSectionVal_MonthlyMaintenanceFees"
    )
    condo_fee = _parse_float(fee_val) if fee_val else None
    condo_fee_known = condo_fee is not None
    if not condo_fee_known:
        missing.append("condo_fee")

    # ── 11. Year built ────────────────────────────────────────────────────────
    year_val = _get_element_value(html, "propertyDetailsSectionContentSubCon_YearBuilt")
    year_built = _parse_int(year_val) if year_val else None
    year_built_known = year_built is not None
    if not year_built_known:
        missing.append("year_built")

    # ── 11b. Age of building (fallback when YearBuilt is absent) ─────────────
    # Agents sometimes publish an age band ("11 to 15 years") instead of a
    # specific year. Parse it into a year range so callers can still bound
    # the construction date. year_built and year_built_known are unchanged —
    # year_built_known remains False when only a range is available.
    age_of_building_raw = _get_element_value(
        html, "propertyDetailsSectionContentSubCon_AgeOfBuilding"
    )
    year_built_earliest, year_built_latest = _parse_age_band(age_of_building_raw)

    # ── 12. Days on market ────────────────────────────────────────────────────
    dom_val = _get_element_value(
        html, "propertyDetailsSectionContentSubCon_DaysOnMarket"
    )
    days_on_market = _parse_int(dom_val) if dom_val else None
    if days_on_market is None:
        missing.append("days_on_market")

    # ── 13. Listing description ───────────────────────────────────────────────
    # Primary: direct div-text extraction from id="propertyDescriptionCon".
    # Description text sits directly inside this div — no nested value div —
    # so _get_element_value() cannot be used here (it requires a Value class).
    # Approach: find the opening tag boundary, read until the first </div>.
    listing_description: str | None = None

    idx = html.find('id="propertyDescriptionCon"')
    if idx >= 0:
        tag_end = html.find(">", idx)
        close = html.find("</div>", tag_end)
        if tag_end >= 0 and close >= 0:
            inner = html[tag_end + 1 : close]
            text = re.sub(r"<[^>]+>", " ", inner)
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                listing_description = _strip_pii(text)

    if not listing_description:
        # Last resort — class-based search for older Realtor.ca page versions.
        desc_match = re.search(
            r'class="[^"]*listingDescriptionText[^"]*"[^>]*>(.*?)</div>',
            html,
            re.DOTALL | re.IGNORECASE,
        )
        if desc_match:
            raw_desc2 = re.sub(r"<[^>]+>", " ", desc_match.group(1))
            listing_description = _strip_pii(re.sub(r"\s+", " ", raw_desc2).strip())

    if not listing_description:
        for cls in ["listingRemarks", "propertyDescription", "remarksText"]:
            desc_match2 = re.search(
                rf'class="[^"]*{cls}[^"]*"[^>]*>(.*?)</div>',
                html,
                re.DOTALL | re.IGNORECASE,
            )
            if desc_match2:
                raw_desc2 = re.sub(r"<[^>]+>", " ", desc_match2.group(1))
                listing_description = _strip_pii(re.sub(r"\s+", " ", raw_desc2).strip())
                if listing_description:
                    break

    if not listing_description:
        missing.append("listing_description")

    # ── 14. Photo URLs ────────────────────────────────────────────────────────
    # Photo URLs are loaded dynamically; count comes from dataLayer
    photo_count = _parse_int(dl.get("photos", "0")) or 0
    # We don't download photos — store empty list (count is in raw_json)
    photo_urls: list[str] = []

    # ── Province ─────────────────────────────────────────────────────────────
    province_name = dl.get("province")  # e.g. "Ontario"
    province_code = detect_province(postal_code) if postal_code else None

    # ── MLS number (extra metadata) ───────────────────────────────────────────
    mls_number = dl.get("listingID")  # e.g. "N13165754"

    fields: dict[str, Any] = {
        "source_url": url,
        "source": SOURCE,
        "listing_type": listing_type,
        "address": address,
        "postal_code": postal_code,
        "province": province_code or province_name,
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
        "age_of_building_raw": age_of_building_raw,
        "year_built_earliest": year_built_earliest,
        "year_built_latest": year_built_latest,
        "days_on_market": days_on_market,
        "listing_description": listing_description,
        "photo_urls": photo_urls,
    }
    # mls_number and photo_count are debug metadata — not DB columns.
    # They are merged into raw_json in scrape_listing() so they are
    # preserved for debugging without being sent as unknown columns.
    extras = {"mls_number": mls_number, "photo_count": photo_count}
    return fields, missing, extras


# ── Main scraper function ──────────────────────────────────────────────────────


async def scrape_listing(url: str) -> dict[str, Any]:
    """
    Scrape a single Realtor.ca listing and write the result to Supabase.

    Fetches the public listing page with browser-like headers. The page HTML
    contains embedded listing data (in a dataLayer.push call) plus structured
    detail sections with element IDs for financial data (taxes, condo fees).

    Enforces 4-second rate limiting between requests. Rotates through
    proxy IPs from PROXY_1 / PROXY_2 / PROXY_3 environment variables.

    Bot protection note: Incapsula protects Realtor.ca and will block repeated
    requests from the same IP. A short response (<50 KB) indicates a bot
    challenge page — the scraper returns 'failed' in that case. Use residential
    proxies (PROXY_1/2/3) for reliable operation in production.

    On any failure (timeout, blocked, parse error): logs the error, returns
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

    # Randomised delay — fixed 4-second intervals are a bot signal.
    # Humans don't request pages on a metronome; 3-7 seconds looks natural.
    delay = random.uniform(3.0, 7.0)
    await asyncio.sleep(delay)

    proxy = _get_next_proxy()

    start_ms = int(time.monotonic() * 1000)
    http_status: int | None = None
    error_msg: str | None = None

    # ── Request delivery — ScraperAPI or direct ───────────────────────────────
    # ScraperAPI handles Incapsula bypass via render=true (real browser session).
    # Falls back to a direct httpx request when the key is not configured —
    # direct requests work on clean IPs but fail on Incapsula-flagged ones.
    scraper_api_key = os.getenv("SCRAPER_API_KEY", "").strip()

    if scraper_api_key:
        encoded_url = urllib.parse.quote(url, safe="")
        request_url = (
            f"http://api.scraperapi.com"
            f"?api_key={scraper_api_key}"
            f"&url={encoded_url}"
            f"&render=true"
        )
        # ScraperAPI with render=true needs a longer timeout — real browser boots
        client_kwargs: dict = {"timeout": 60.0, "follow_redirects": True}
    else:
        logger.warning(
            "SCRAPER_API_KEY not configured — falling back to direct request. "
            "Realtor.ca will likely be blocked on flagged IPs."
        )
        # httpx 0.28+ uses proxy= (single URL string) instead of proxies= dict.
        # Pick a random User-Agent on each request — rotating UA looks more human.
        request_url = url
        client_kwargs = {
            "headers": {**_HEADERS, "User-Agent": random.choice(USER_AGENTS)},
            "timeout": 20.0,
            "follow_redirects": True,
        }
        if proxy:
            client_kwargs["proxy"] = proxy

    try:
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.get(request_url)
            http_status = response.status_code
            response.raise_for_status()
            html: str = response.text

    except httpx.HTTPStatusError as exc:
        http_status = exc.response.status_code
        error_msg = f"HTTP {http_status} from Realtor.ca"
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
        logger.error("scrape_listing network error for %s: %s", url, exc)
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

    # ── Bot challenge detection ────────────────────────────────────────────────
    # Incapsula injects <script> tags into EVERY page it protects — including
    # legitimate listing pages. A bare "Incapsula" in html check false-positives
    # on real pages fetched via ScraperAPI (which returns the full 1-2 MB DOM).
    # Instead: detect the challenge-specific fingerprints that only appear on
    # the challenge/block page, not on real listing pages.
    # /_Incapsula_Resource and incapsula_res are injected by Incapsula into
    # ALL pages it protects — including legitimate listing pages. They cannot
    # be used to distinguish challenge pages from real content. Only the
    # human-readable interstitial strings below are challenge-page-exclusive
    # (confirmed by comparing 1.5 MB real listing response vs 216 KB block page).
    _INCAPSULA_CHALLENGE_MARKERS = [
        "test your browser",  # Incapsula CAPTCHA interstitial text
        "checking your browser",  # Cloudflare/Incapsula interstitial text
    ]
    is_challenge = len(html) < _MIN_HTML_LENGTH or any(
        m.lower() in html.lower() for m in _INCAPSULA_CHALLENGE_MARKERS
    )
    if is_challenge:
        error_msg = f"Bot challenge detected (response length: {len(html)})"
        logger.warning("scrape_listing bot challenge for %s: %s", url, error_msg)
        await log_scrape(SOURCE, url, "failed", http_status, error_msg, duration_ms)
        return {
            "source_url": url,
            "source": SOURCE,
            "scrape_status": "failed",
            "error": (
                "Realtor.ca is temporarily blocking automated requests. "
                "Please try again in a few minutes or enter details manually."
            ),
        }

    # ── Parse the response ─────────────────────────────────────────────────────
    try:
        fields, missing, extras = _extract_fields(html, url, listing_id)
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

    # raw_json stores the datalayer dict plus debug extras (mls_number, photo_count).
    # These are not DB columns — they live inside the jsonb raw_json column only.
    dl = _extract_datalayer_property(html)
    raw_json = {**dl, **extras}

    record: dict[str, Any] = {
        **fields,
        "raw_json": raw_json,
        "scrape_status": status,
        "missing_fields": missing,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    # Write to Supabase
    saved = await upsert_listing(record)
    await log_scrape(SOURCE, url, status, http_status, None, duration_ms)

    if saved:
        return {**record, **saved}
    return record
