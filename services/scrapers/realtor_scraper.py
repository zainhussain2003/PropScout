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
    """Read an env var, falling back to the project-root .env for local dev."""
    val = os.getenv(name)
    if val:
        return val
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip()
    return ""


SCRAPER_API_KEY = _load_env_var("SCRAPER_API_KEY")
_SCRAPER_API_URL = "https://api.scraperapi.com"


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


def _dl(field: str, block: str) -> str | None:
    """Extract a field value from a dataLayer property JS block.

    Matches the pattern:  fieldName: 'value',
    Returns the value string (may be empty), or None if the field is absent.
    """
    m = re.search(r"\b" + re.escape(field) + r":\s*'([^']*)'", block)
    return m.group(1) if m else None


def _parse_rendered_fields(
    page: str,
) -> tuple[int | None, bool, int | None, bool, int | None, bool]:
    """
    Extract annual_taxes, condo_fee_monthly, and year_built from rendered HTML.

    Uses BeautifulSoup to walk propertyDetailsSectionContentLabel →
    propertyDetailsSectionContentValue sibling pairs. Each field is only
    set if the label is found and the value is parseable; otherwise the
    _known flag stays False so the calc engine treats the field as missing.

    Args:
        page: Fully rendered HTML string returned by ScraperAPI.

    Returns:
        (annual_taxes, taxes_known,
         condo_fee_monthly, condo_fee_known,
         year_built, year_built_known)
    """
    annual_taxes: int | None = None
    taxes_known = False
    condo_fee_monthly: int | None = None
    condo_fee_known = False
    year_built: int | None = None
    year_built_known = False

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
                    annual_taxes = int(float(m.group(1).replace(",", "")))
                    taxes_known = True

            elif (
                "maintenance fees" in label
                and "include" not in label
                and "company" not in label
            ):
                # e.g. "$511.06 Monthly(CAD)" or "$761.00 Monthly"
                m = re.search(r"\$([\d,]+\.?\d*)", val)
                if m:
                    condo_fee_monthly = int(float(m.group(1).replace(",", "")))
                    condo_fee_known = True

            elif "year built" in label or "construction year" in label:
                # e.g. "2019" or "2015 approx"
                m = re.search(r"\b(19|20)\d{2}\b", val)
                if m:
                    year_built = int(m.group())
                    year_built_known = True

    except Exception:
        logging.exception("_parse_rendered_fields failed")

    return (
        annual_taxes,
        taxes_known,
        condo_fee_monthly,
        condo_fee_known,
        year_built,
        year_built_known,
    )


async def scrape_listing(url: str) -> ScrapedListing | None:
    """
    Scrape a single Realtor.ca listing URL via ScraperAPI (render=true).

    Rendered requests typically take 15–30 s. Taxes, condo fee, and year built
    are populated from the JS-rendered DOM; all other fields come from the
    dataLayer JS block and schema.org JSON-LD present in the static HTML.

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

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.get(
                _SCRAPER_API_URL,
                params={
                    "api_key": SCRAPER_API_KEY,
                    "url": url,
                    "render": "true",
                    "premium": "true",
                },
            )

        if response.status_code != 200:
            logging.error("ScraperAPI returned %s for %s", response.status_code, url)
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

        if not address or price_val <= 0:
            return None

        # ── JS-rendered fields (taxes, condo fee, year built) ─────────────────
        (
            annual_taxes,
            taxes_known,
            condo_fee_monthly,
            condo_fee_known,
            year_built,
            year_built_known,
        ) = _parse_rendered_fields(page)

        return ScrapedListing(
            url=url,
            address=address,
            price=price_val,
            beds=beds,
            baths=baths,
            sqft=sqft,
            property_type=prop_type,
            annual_taxes=annual_taxes,
            taxes_known=taxes_known,
            condo_fee_monthly=condo_fee_monthly,
            condo_fee_known=condo_fee_known,
            year_built=year_built,
            year_built_known=year_built_known,
            listing_type=listing_type,
            listing_description=listing_description,
            photo_urls=photo_urls,
            days_on_market=None,
            raw={
                "mls": _dl("listingID", dl),
                "city": _dl("city", dl),
                "province": _dl("province", dl),
            },
        )

    except Exception:
        logging.exception("scrape_listing failed for URL: %s", url)
        return None
