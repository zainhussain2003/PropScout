"""
Realtor.ca listing scraper — spec Section 11.2 (TEMPLATE CODE).

Fetches each listing URL through ScraperAPI with render=true so that
JS-loaded fields (taxes, condo fee, year built) are present in the returned
HTML. Two data sources are parsed from the rendered page:

  - window.dataLayer property block  (price, beds, baths, sqft, type, MLS)
  - schema.org JSON-LD <script> tag  (address, description, photos)
  - propertyDetailsSectionContentLabel/Value pairs  (taxes, fee, year built)

Direct calls to api2.realtor.ca are avoided: Incapsula blocks them and the
required params (PropertyID, CultureID, MlsNumber) shift between deployments.

country_code=ca is NOT sent — geotargeting requires a plan upgrade on the
current ScraperAPI subscription.

Update this file and the spec together whenever Realtor.ca changes their
page structure.
"""

import html as html_lib
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path

import httpx
from bs4 import BeautifulSoup


def _load_env_var(name: str) -> str:
    """Read an env var, falling back to the nearest .env up the tree for local dev.

    On Railway the value comes from os.getenv; locally we walk up from this file
    until a .env is found (this module lives at different depths in the scraper
    service vs the calc-engine, so the walk is depth-agnostic).
    """
    val = os.getenv(name)
    if val:
        return val
    here = Path(__file__).resolve()
    for parent in here.parents:
        env_path = parent / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith(name + "="):
                    return line.split("=", 1)[1].strip()
            break
    return ""


SCRAPER_API_KEY = _load_env_var("SCRAPER_API_KEY")
_SCRAPER_API_URL = "https://api.scraperapi.com"
# Attempts per listing — ScraperAPI premium is ~1-in-3 against Realtor.ca
# (measured live 2026-07-02); failures are not billed, retries are their
# documented recommendation. 4 attempts ≈ 87% expected success at that rate.
_SCRAPER_API_ATTEMPTS = 4


@dataclass
class ScrapedListing:
    """Raw scraped data before validation and normalisation."""

    url: str
    address: str
    price: int
    beds: int
    baths: float
    sqft: int | None
    property_type: str
    annual_taxes: int | None
    taxes_known: bool
    condo_fee_monthly: int | None
    condo_fee_known: bool
    year_built: int | None
    year_built_known: bool
    listing_type: str  # 'for_sale' | 'for_rent'
    listing_description: str | None
    photo_urls: list[str]
    days_on_market: int | None
    raw: dict[str, object]
    # Realtor.ca's propertyType is "Single Family" for BOTH a detached house
    # and a condo apartment — buildingType ('Apartment' / 'House' / 'Row …')
    # is the real discriminator (found live 2026-07-02: a Whitehaus condo
    # mapped to 'detached').
    building_type: str | None = None
    # "Total Parking Spaces" from the details section (was never captured —
    # the API hardcoded 0).
    parking_spaces: int | None = None


def _dl(field: str, block: str) -> str | None:
    """Extract a field value from a dataLayer property JS block.

    Matches the pattern:  fieldName: 'value',
    Returns the value string (may be empty), or None if the field is absent.
    """
    m = re.search(r"\b" + re.escape(field) + r":\s*'([^']*)'", block)
    return m.group(1) if m else None


@dataclass
class _DetailFields:
    """Fields parsed from the propertyDetailsSection label/value pairs."""

    annual_taxes: int | None = None
    taxes_known: bool = False
    condo_fee_monthly: int | None = None
    condo_fee_known: bool = False
    year_built: int | None = None
    year_built_known: bool = False
    parking_spaces: int | None = None
    beds_above_grade: int | None = None


def _parse_rendered_fields(page: str) -> _DetailFields:
    """
    Extract detail-section fields from the listing HTML.

    Uses BeautifulSoup to walk propertyDetailsSectionContentLabel →
    propertyDetailsSectionContentValue sibling pairs. Each field is only
    set if the label is found and the value is parseable; otherwise the
    _known flag stays False so the calc engine treats the field as missing.

    Args:
        page: HTML string returned by ScraperAPI.

    Returns:
        _DetailFields with whichever fields the page exposed.
    """
    out = _DetailFields()

    try:
        soup = BeautifulSoup(page, "lxml")

        for label_el in soup.find_all(class_="propertyDetailsSectionContentLabel"):
            label = label_el.get_text(strip=True).lower()
            val_el = label_el.find_next_sibling(
                class_="propertyDetailsSectionContentValue"
            )
            if not val_el:
                continue
            val = val_el.get_text(strip=True)

            if "annual property taxes" in label or "property taxes" in label:
                # e.g. "$2,696.29(CAD)" or "$3,326.00"
                m = re.search(r"\$([\d,]+\.?\d*)", val)
                if m:
                    out.annual_taxes = int(float(m.group(1).replace(",", "")))
                    out.taxes_known = True

            elif (
                "maintenance fees" in label
                and "include" not in label
                and "company" not in label
            ):
                # e.g. "$511.06 Monthly(CAD)" or "$761.00 Monthly"
                m = re.search(r"\$([\d,]+\.?\d*)", val)
                if m:
                    out.condo_fee_monthly = int(float(m.group(1).replace(",", "")))
                    out.condo_fee_known = True

            elif "year built" in label or "construction year" in label:
                # e.g. "2019" or "2015 approx"
                m = re.search(r"\b(19|20)\d{2}\b", val)
                if m:
                    out.year_built = int(m.group())
                    out.year_built_known = True

            elif "total parking spaces" in label:
                # e.g. "1" or "8" — the API previously hardcoded 0
                m = re.search(r"\d+", val)
                if m:
                    out.parking_spaces = int(m.group())

            elif label == "above grade":
                # Bedrooms section: "2 + 1" listings carry dataLayer bedrooms=3;
                # the den is NOT a legal bedroom (the whole tenant §02 story),
                # and comps key on beds — use the above-grade count instead.
                # The label only appears under Bedrooms (Bathrooms uses
                # Total/Partial), so no section disambiguation is needed.
                m = re.search(r"\d+", val)
                if m:
                    out.beds_above_grade = int(m.group())

    except Exception:
        logging.exception("_parse_rendered_fields failed")

    return out


# CDN photo URL: .../highres/<n>/<mls>_<seq>.jpg — the JSON-LD block only
# carries the first photo; the page HTML references the full set.
_PHOTO_RE = re.compile(
    r"https://cdn\.realtor\.ca/listings/[^\"'\s?]+/highres/[^\"'\s?]+?_(\d+)\.jpg"
)
_MAX_PHOTOS = 12


def _parse_photo_urls(page: str) -> list[str]:
    """All distinct highres CDN photo URLs on the page, in gallery order."""
    seen: dict[str, int] = {}
    for m in _PHOTO_RE.finditer(page):
        url = m.group(0)
        if url not in seen:
            seen[url] = int(m.group(1))
    ordered = sorted(seen, key=lambda u: seen[u])
    return ordered[:_MAX_PHOTOS]


async def scrape_listing(url: str) -> ScrapedListing | None:
    """
    Scrape a single Realtor.ca listing URL via ScraperAPI (premium proxy).

    Uses `premium=true` only (no `render=true`). ScraperAPI's render mode
    fails with HTTP 500 on Realtor.ca listing pages — their JS bot detection
    catches the headless browser even with a residential proxy. The static
    HTML returned by `premium=true` already contains the dataLayer.property
    JS block, the JSON-LD <script>, and the propertyDetailsSection label/value
    pairs (taxes), so the parser has everything it needs.

    Caveat: condo fee and year built are sometimes JS-injected (only show up
    with render). Those fields are wrapped in _known flags — the calc engine
    treats them as missing when absent, which is the right behaviour.

    Args:
        url: Full Realtor.ca listing URL.

    Returns:
        ScrapedListing with raw field data, or None if scraping fails.
    """
    try:
        if not re.search(r"/real-estate/\d+/", url):
            return None

        if not SCRAPER_API_KEY:
            logging.error("SCRAPER_API_KEY is not set")
            return None

        # ScraperAPI premium fetches fail intermittently (~1-in-3 succeeded in
        # live probing, 2026-07-02) as their proxy pool rotates against
        # Realtor.ca's bot detection. ScraperAPI's own guidance is to retry
        # failed requests — failures are not billed. Bounded retry, no backoff
        # needed (each attempt already takes ~25-30s through the proxy).
        response = None
        for attempt in range(1, _SCRAPER_API_ATTEMPTS + 1):
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.get(
                    _SCRAPER_API_URL,
                    params={
                        "api_key": SCRAPER_API_KEY,
                        "url": url,
                        "premium": "true",
                    },
                )
            if response.status_code == 200:
                break
            logging.warning(
                "ScraperAPI attempt %s/%s returned %s for %s",
                attempt,
                _SCRAPER_API_ATTEMPTS,
                response.status_code,
                url,
            )

        if response is None or response.status_code != 200:
            logging.error(
                "ScraperAPI failed after %s attempts for %s", _SCRAPER_API_ATTEMPTS, url
            )
            return None

        page = response.text

        # ── dataLayer.property block ──────────────────────────────────────────
        # The page injects a dataLayer.push call with a 'property' JS literal.
        dl_match = re.search(r"property:\s*\{([^}]+)\}", page, re.DOTALL)
        if not dl_match:
            return None
        dl = dl_match.group(1)

        price_raw = _dl("price", dl) or ""
        lease_raw = _dl("leasePrice", dl) or ""
        beds_raw = _dl("bedrooms", dl) or "0"
        baths_raw = _dl("bathrooms", dl) or "0"
        prop_type = _dl("propertyType", dl) or ""
        building_type = _dl("buildingType", dl)
        sqft_raw = _dl("interiorFloorSpace", dl) or ""

        # For-rent: leasePrice is populated; for-sale: price is populated.
        lease_val = float(lease_raw.replace(",", "") or 0)
        price_val_f = float(price_raw.replace(",", "") or 0)

        if lease_val > 0:
            listing_type = "for_rent"
            price_val = int(lease_val)
        elif price_val_f > 0:
            listing_type = "for_sale"
            price_val = int(price_val_f)
        else:
            return None

        beds = int(beds_raw or 0)
        baths = float(baths_raw or 0)

        sqft: int | None = None
        if sqft_raw:
            num = re.search(r"[\d.]+", sqft_raw)
            if num:
                val = float(num.group())
                # Realtor.ca reports interior floor space in m²; convert to sqft.
                if "m2" in sqft_raw.lower() or "m²" in sqft_raw:
                    val *= 10.7639
                sqft = int(round(val))

        # ── schema.org JSON-LD ────────────────────────────────────────────────
        address: str | None = None
        listing_description: str | None = None
        photo_urls: list[str] = []

        ld_match = re.search(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>\s*(\{.*?\})\s*</script>',
            page,
            re.DOTALL,
        )
        if ld_match:
            try:
                ld = json.loads(ld_match.group(1))
                address = ld.get("name")
                raw_desc = ld.get("description", "")
                if raw_desc:
                    listing_description = html_lib.unescape(raw_desc)
                imgs = ld.get("image", [])
                if isinstance(imgs, str):
                    imgs = [imgs]
                photo_urls = [i for i in imgs if "highres" in i.lower()]
            except (json.JSONDecodeError, AttributeError):
                pass

        # The JSON-LD image list only carries the first photo — sweep the page
        # for the full CDN set (18–42 photos on live listings).
        page_photos = _parse_photo_urls(page)
        if len(page_photos) > len(photo_urls):
            photo_urls = page_photos

        if not address or price_val <= 0:
            return None

        # ── Detail-section fields (taxes, fee, year, parking, beds) ──────────
        details = _parse_rendered_fields(page)

        # "2 + 1" listings carry dataLayer bedrooms=3; the above-grade count is
        # the honest bedroom number (a den is not a legal bedroom) and the one
        # rental comps should key on.
        if (
            details.beds_above_grade is not None
            and 0 < details.beds_above_grade <= beds
        ):
            beds = details.beds_above_grade

        return ScrapedListing(
            url=url,
            address=address,
            price=price_val,
            beds=beds,
            baths=baths,
            sqft=sqft,
            property_type=prop_type,
            annual_taxes=details.annual_taxes,
            taxes_known=details.taxes_known,
            condo_fee_monthly=details.condo_fee_monthly,
            condo_fee_known=details.condo_fee_known,
            year_built=details.year_built,
            year_built_known=details.year_built_known,
            listing_type=listing_type,
            listing_description=listing_description,
            photo_urls=photo_urls,
            days_on_market=None,
            raw={
                "mls": _dl("listingID", dl),
                "city": _dl("city", dl),
                "province": _dl("province", dl),
            },
            building_type=building_type,
            parking_spaces=details.parking_spaces,
        )

    except Exception:
        logging.exception("scrape_listing failed for URL: %s", url)
        return None
