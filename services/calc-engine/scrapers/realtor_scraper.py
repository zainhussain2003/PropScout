"""
Realtor.ca on-demand scraper — spec Section 11.2 (TEMPLATE CODE).

Uses Realtor.ca's internal JSON API (the same endpoints their website uses).
httpx is used instead of Playwright — lighter weight for on-demand requests.

Endpoint URLs, headers, and response field names will shift without notice.
Update field mappings and endpoints whenever the scraper breaks.
"""

import logging
import re
from typing import Any

import httpx

from constants.provinces import ONTARIO_FSA_PREFIXES
from models.scraper_schemas import ScrapedListing

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

_API_BASE = "https://api2.realtor.ca/Listing.svc/RecordDetails"
_API_PARAMS_BASE = {
    "ApplicationId": "1",
    "lang": "en",
    "PropertyID": "",  # filled per request
}

_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.realtor.ca/",
    "Accept": "application/json",
    "Accept-Language": "en-CA,en;q=0.9",
}

_REQUEST_TIMEOUT_SECONDS = 15

# Toronto / North York / Scarborough postal codes start with M
_TORONTO_FSA_PREFIX = "M"

# Property type normalisation — Realtor.ca codes → PropScout types
_PROPERTY_TYPE_MAP: dict[str, str] = {
    "apartment": "condo",
    "condo": "condo",
    "condominium": "condo",
    "detached": "house",
    "house": "house",
    "semi-detached": "semi",
    "semi": "semi",
    "townhouse": "townhouse",
    "row / townhouse": "townhouse",
    "row/townhouse": "townhouse",
    "attached/row/townhouse": "townhouse",
}

_URL_ID_PATTERN = re.compile(r"/real-estate/(\d+)/")


# ── Helpers ────────────────────────────────────────────────────────────────────


def _extract_property_id(url: str) -> str | None:
    """
    Extract the numeric listing ID from a Realtor.ca URL.

    Args:
        url: Full Realtor.ca listing URL, e.g.
             https://www.realtor.ca/real-estate/12345678/some-address

    Returns:
        Listing ID as a string, or None if not found.
    """
    match = _URL_ID_PATTERN.search(url)
    return match.group(1) if match else None


def _detect_province(postal_code: str) -> str:
    """
    Detect province from postal code FSA prefix.

    Only Ontario is supported at MVP (K, L, M, N, P).

    Args:
        postal_code: Canadian postal code, e.g. "L4K 5W4".

    Returns:
        Province abbreviation — "ON" for Ontario, or the detected non-Ontario
        code (BC, AB, QC, etc.) using a best-effort lookup.
    """
    fsa = postal_code.strip().upper()[0] if postal_code.strip() else ""
    if fsa in ONTARIO_FSA_PREFIXES:
        return "ON"
    # Non-Ontario FSA prefixes — best-effort mapping for gate message
    _NON_ONTARIO: dict[str, str] = {
        "V": "BC",
        "T": "AB",
        "S": "SK",
        "R": "MB",
        "G": "QC",
        "H": "QC",
        "J": "QC",
        "B": "NS",
        "E": "NB",
        "C": "PE",
        "A": "NL",
        "X": "NT",
        "Y": "YT",
    }
    return _NON_ONTARIO.get(fsa, "UNKNOWN")


def _normalise_property_type(raw_type: str) -> str:
    """
    Normalise a Realtor.ca property type string to a PropScout type.

    Args:
        raw_type: Raw property type string from the API response.

    Returns:
        One of "condo", "house", "townhouse", "semi".
    """
    return _PROPERTY_TYPE_MAP.get(raw_type.strip().lower(), "house")


def _safe_int(value: Any, default: int = 0) -> int:
    """Coerce a value to int, returning default on failure."""
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (ValueError, TypeError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Coerce a value to float, returning default on failure."""
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return default


def _parse_listing(data: dict[str, Any]) -> ScrapedListing:
    """
    Parse the Realtor.ca API response into a ScrapedListing model.

    The API response structure is treated as TEMPLATE CODE — field paths will
    shift as Realtor.ca updates their internal API.

    Args:
        data: Parsed JSON response from the Realtor.ca RecordDetails endpoint.

    Returns:
        ScrapedListing with all _known flags set.
    """
    # The top-level response wraps listing data under different keys
    # depending on whether it is a residential or commercial listing.
    listing = data.get("Results", [data])[0] if "Results" in data else data

    # ── Address ───────────────────────────────────────────────────────────────
    prop = listing.get("Property", {})
    address_obj = prop.get("Address", {})
    street = address_obj.get("AddressText", "")
    # AddressText often contains "StreetAddress|City Province  PostalCode"
    # Strip any pipe-delimited suffix if present
    address = street.split("|")[0].strip() if "|" in street else street.strip()

    postal_code = address_obj.get("PostalCode", "")
    # Some addresses embed the postal code in AddressText; extract if missing
    if not postal_code:
        pc_match = re.search(r"[A-Z]\d[A-Z]\s?\d[A-Z]\d", street.upper())
        postal_code = pc_match.group(0).replace(" ", "") if pc_match else ""

    province = _detect_province(postal_code)

    # ── Price ─────────────────────────────────────────────────────────────────
    raw_price = prop.get("Price", listing.get("ListPrice", "0"))
    price = _safe_int(str(raw_price).replace("$", "").replace(",", ""))

    # ── Taxes ─────────────────────────────────────────────────────────────────
    tax_raw = listing.get("Tax", {})
    if isinstance(tax_raw, dict):
        annual_tax_str = tax_raw.get("AnnualAmount", "") or tax_raw.get("Amount", "")
        annual_taxes = _safe_int(str(annual_tax_str).replace("$", "").replace(",", ""))
        tax_known = annual_taxes > 0
    else:
        annual_taxes = 0
        tax_known = False

    # ── Condo fee ─────────────────────────────────────────────────────────────
    building = listing.get("Building", {})
    maint_raw = listing.get("MaintenanceFee", "") or building.get("MaintenanceFee", "")
    if maint_raw:
        condo_fee_monthly = _safe_int(str(maint_raw).replace("$", "").replace(",", ""))
        condo_fee_known = condo_fee_monthly > 0
    else:
        condo_fee_monthly = None
        condo_fee_known = False

    # ── Beds / baths ──────────────────────────────────────────────────────────
    beds_raw = building.get("BedroomsTotal", building.get("BedroomsAboveGrade", "0"))
    beds = _safe_int(beds_raw)

    baths_raw = building.get("BathroomTotal", building.get("Bathrooms", "0"))
    baths = _safe_float(baths_raw)

    # ── Sqft ──────────────────────────────────────────────────────────────────
    # SizeInterior is the interior square footage in sqft or sqm
    size_raw = building.get("SizeInterior", "")
    if size_raw:
        # e.g. "950 sqft" or "88.26 m2"
        size_digits = re.sub(r"[^\d.]", "", size_raw.split()[0]) if size_raw else ""
        if "m2" in size_raw.lower() or "sqm" in size_raw.lower():
            # Convert sqm to sqft
            sqft = int(float(size_digits) * 10.764) if size_digits else None
        else:
            sqft = _safe_int(size_digits) if size_digits else None
        sqft_known = sqft is not None and sqft > 0
    else:
        sqft = None
        sqft_known = False

    # ── Year built ────────────────────────────────────────────────────────────
    year_built_raw = listing.get("YearBuilt", building.get("Age", ""))
    if year_built_raw:
        year_digits = re.sub(r"\D", "", str(year_built_raw))
        year_built = int(year_digits) if len(year_digits) == 4 else None
        year_built_known = year_built is not None
    else:
        year_built = None
        year_built_known = False

    # ── Property type ─────────────────────────────────────────────────────────
    type_raw = prop.get("Type", building.get("Type", "house"))
    property_type = _normalise_property_type(type_raw)

    # ── Is Toronto ────────────────────────────────────────────────────────────
    is_toronto = postal_code.strip().upper().startswith(_TORONTO_FSA_PREFIX)

    # ── Listing type ──────────────────────────────────────────────────────────
    # Realtor.ca on-demand endpoint is always for-sale listings
    listing_type = "for_sale"

    return ScrapedListing(
        address=address,
        postal_code=postal_code,
        price=price,
        annual_taxes=annual_taxes,
        tax_known=tax_known,
        condo_fee_monthly=condo_fee_monthly,
        condo_fee_known=condo_fee_known,
        beds=beds,
        baths=baths,
        sqft=sqft,
        sqft_known=sqft_known,
        year_built=year_built,
        year_built_known=year_built_known,
        province=province,
        property_type=property_type,
        is_toronto=is_toronto,
        listing_type=listing_type,
    )


# ── Public API ─────────────────────────────────────────────────────────────────


async def scrape_listing(url: str) -> ScrapedListing | None:
    """
    Fetch structured listing data from Realtor.ca for the given URL.

    Extracts the property ID from the URL, calls the Realtor.ca internal JSON
    API, and returns a validated ScrapedListing model.

    Args:
        url: Full Realtor.ca listing URL, e.g.
             https://www.realtor.ca/real-estate/27154381/5702-5-buttermill-ave-vaughan

    Returns:
        ScrapedListing if the listing was found and parsed successfully,
        or None if the API call failed or the listing was not found.
    """
    property_id = _extract_property_id(url)
    if not property_id:
        logger.warning("Could not extract property ID from URL: %s", url)
        return None

    params = {**_API_PARAMS_BASE, "PropertyID": property_id}

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(
                _API_BASE,
                params=params,
                headers=_REQUEST_HEADERS,
            )
            response.raise_for_status()
            data: dict[str, Any] = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Realtor.ca API returned HTTP %s for property %s: %s",
            exc.response.status_code,
            property_id,
            exc,
        )
        return None
    except httpx.RequestError as exc:
        logger.error(
            "Realtor.ca API request failed for property %s: %s", property_id, exc
        )
        return None
    except (
        Exception
    ) as exc:  # noqa: BLE001 — catch-all so one failure never crashes the app
        logger.error("Unexpected error scraping property %s: %s", property_id, exc)
        return None

    try:
        return _parse_listing(data)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Failed to parse Realtor.ca response for property %s: %s", property_id, exc
        )
        return None
