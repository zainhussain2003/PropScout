"""Unit tests for realtor_scraper.py — no real HTTP calls.

The scraper fetches listing pages via ScraperAPI (render=true) and parses
three embedded data sources:
  1. window.dataLayer property block   → price, beds, baths, sqft, type, MLS
  2. schema.org JSON-LD <script> tag   → address, description, photos
  3. propertyDetailsSectionContentLabel/Value pairs → taxes, fee, year built

Fixtures in this file are minimal but structurally correct HTML strings that
mirror what ScraperAPI returns for a rendered Realtor.ca listing page.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

from realtor_scraper import ScrapedListing, scrape_listing  # noqa: E402

VALID_URL = "https://www.realtor.ca/real-estate/27219242/5702-5-buttermill-ave-vaughan"
INVALID_URL = "https://www.realtor.ca/not-a-listing-url"

# ── HTML fixtures ─────────────────────────────────────────────────────────────
#
# FULL_HTML: all fields present.
#
#   - price 729900 → for-sale
#   - beds 3, baths 2, sqft: 111.48 m² × 10.7639 ≈ 1200 sqft
#   - taxes $3,326.00, condo fee $761.00/mo, year built 2015
#   - address from JSON-LD name; only highres photo included by the parser

FULL_HTML = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '729900.00',
        leasePrice: '',
        bathrooms: '2',
        bedrooms: '3',
        interiorFloorSpace: '111.48 m2',
        city: 'Vaughan',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "name": "5702 Buttermill Ave, Vaughan, ON L4H 3X8",
    "description": "Beautiful condo with great views.",
    "image": [
        "https://cdn.realtor.ca/highres/photo1.jpg",
        "https://cdn.realtor.ca/medres/photo1.jpg"
    ]
}
</script>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Annual Property Taxes</div>
<div class="propertyDetailsSectionContentValue">$3,326.00(CAD)</div>
</div>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Maintenance Fees</div>
<div class="propertyDetailsSectionContentValue">$761.00 Monthly(CAD)</div>
</div>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Year Built</div>
<div class="propertyDetailsSectionContentValue">2015</div>
</div>
</body></html>"""

# Variant: taxes label-value pair absent from DOM (field not populated by the agent)
HTML_NO_TAXES = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '729900.00',
        leasePrice: '',
        bathrooms: '2',
        bedrooms: '3',
        interiorFloorSpace: '111.48 m2',
        city: 'Vaughan',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "name": "5702 Buttermill Ave, Vaughan, ON L4H 3X8",
    "description": "Beautiful condo with great views.",
    "image": ["https://cdn.realtor.ca/highres/photo1.jpg"]
}
</script>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Maintenance Fees</div>
<div class="propertyDetailsSectionContentValue">$761.00 Monthly(CAD)</div>
</div>
</body></html>"""

# Variant: maintenance fee label-value pair absent
HTML_NO_FEE = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '729900.00',
        leasePrice: '',
        bathrooms: '2',
        bedrooms: '3',
        interiorFloorSpace: '111.48 m2',
        city: 'Vaughan',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "name": "5702 Buttermill Ave, Vaughan, ON L4H 3X8",
    "description": "Beautiful condo with great views.",
    "image": ["https://cdn.realtor.ca/highres/photo1.jpg"]
}
</script>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Annual Property Taxes</div>
<div class="propertyDetailsSectionContentValue">$3,326.00(CAD)</div>
</div>
</body></html>"""

# Variant: year built label-value pair absent
HTML_NO_YEAR = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '729900.00',
        leasePrice: '',
        bathrooms: '2',
        bedrooms: '3',
        interiorFloorSpace: '111.48 m2',
        city: 'Vaughan',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "name": "5702 Buttermill Ave, Vaughan, ON L4H 3X8",
    "description": "Beautiful condo with great views.",
    "image": ["https://cdn.realtor.ca/highres/photo1.jpg"]
}
</script>
<div class="propertyDetailsSectionContentSubCon">
<div class="propertyDetailsSectionContentLabel">Annual Property Taxes</div>
<div class="propertyDetailsSectionContentValue">$3,326.00(CAD)</div>
</div>
</body></html>"""

# Variant: for-rent listing (leasePrice > 0, price = 0)
HTML_FOR_RENT = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '0.00',
        leasePrice: '2150.00',
        bathrooms: '1',
        bedrooms: '2',
        interiorFloorSpace: '57.60 m2',
        city: 'Toronto',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "name": "Unit 3705, 28 Charles St E, Toronto, ON M4Y 0A1",
    "description": "Great rental unit.",
    "image": ["https://cdn.realtor.ca/highres/photo2.jpg"]
}
</script>
</body></html>"""

# Variant: JSON-LD missing the "name" field (address unavailable)
HTML_NO_ADDRESS = """\
<!DOCTYPE html><html><body>
<script>
dataLayer.push({
    property: {
        propertyID: '27219242',
        listingID: 'N12345678',
        propertyType: 'Condo',
        price: '729900.00',
        leasePrice: '',
        bathrooms: '2',
        bedrooms: '3',
        interiorFloorSpace: '111.48 m2',
        city: 'Vaughan',
        province: 'Ontario',
    }
});
</script>
<script type="application/ld+json">
{
    "@context": "http://schema.org/",
    "@type": "Product",
    "description": "No name field here.",
    "image": ["https://cdn.realtor.ca/highres/photo1.jpg"]
}
</script>
</body></html>"""


# ── Mock helpers ──────────────────────────────────────────────────────────────


def _make_mock_client(html: str, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.AsyncClient that returns the given rendered HTML."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.text = html

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


@pytest.fixture(autouse=True)
def patch_api_key():
    """Ensure SCRAPER_API_KEY is always non-empty so tests don't short-circuit."""
    with patch("realtor_scraper.SCRAPER_API_KEY", "test-key"):
        yield


# ── Tests ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_all_fields_present():
    """All fields present in rendered HTML → all parsed correctly, _known flags True."""
    mock_client = _make_mock_client(FULL_HTML)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert isinstance(result, ScrapedListing)
    assert result.url == VALID_URL
    assert result.address == "5702 Buttermill Ave, Vaughan, ON L4H 3X8"
    assert result.price == 729900
    assert result.beds == 3
    assert result.baths == 2.0
    assert result.sqft == 1200  # 111.48 m² × 10.7639 ≈ 1200
    assert result.property_type == "Condo"
    assert result.annual_taxes == 3326
    assert result.taxes_known is True
    assert result.condo_fee_monthly == 761
    assert result.condo_fee_known is True
    assert result.year_built == 2015
    assert result.year_built_known is True
    assert result.listing_type == "for_sale"
    assert result.listing_description == "Beautiful condo with great views."
    assert result.photo_urls == ["https://cdn.realtor.ca/highres/photo1.jpg"]
    assert result.days_on_market is None  # not available from static/rendered HTML
    assert result.raw == {
        "mls": "N12345678",
        "city": "Vaughan",
        "province": "Ontario",
    }


@pytest.mark.asyncio
async def test_tax_field_absent():
    """Annual Property Taxes label absent → taxes_known False, annual_taxes None."""
    mock_client = _make_mock_client(HTML_NO_TAXES)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is not None
    assert result.taxes_known is False
    assert result.annual_taxes is None


@pytest.mark.asyncio
async def test_maintenance_fee_absent():
    """Maintenance Fees label absent → condo_fee_known False, condo_fee_monthly None."""
    mock_client = _make_mock_client(HTML_NO_FEE)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is not None
    assert result.condo_fee_known is False
    assert result.condo_fee_monthly is None


@pytest.mark.asyncio
async def test_construction_year_absent():
    """Year Built label absent → year_built_known False, year_built None."""
    mock_client = _make_mock_client(HTML_NO_YEAR)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is not None
    assert result.year_built_known is False
    assert result.year_built is None


@pytest.mark.asyncio
async def test_transaction_type_for_rent():
    """leasePrice > 0 and price = 0 → listing_type 'for_rent', price = lease amount."""
    mock_client = _make_mock_client(HTML_FOR_RENT)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is not None
    assert result.listing_type == "for_rent"
    assert result.price == 2150


@pytest.mark.asyncio
async def test_http_error_returns_none():
    """ScraperAPI HTTP 429 response → returns None."""
    mock_client = _make_mock_client("", status_code=429)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is None


@pytest.mark.asyncio
async def test_invalid_url_returns_none_no_http_call():
    """URL with no /real-estate/{id}/ pattern → returns None, no HTTP call made."""
    with patch("realtor_scraper.httpx.AsyncClient") as mock_client_class:
        result = await scrape_listing(INVALID_URL)

    assert result is None
    mock_client_class.assert_not_called()


@pytest.mark.asyncio
async def test_missing_address_returns_none():
    """JSON-LD missing 'name' field → address is None → returns None."""
    mock_client = _make_mock_client(HTML_NO_ADDRESS)
    with patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client):
        result = await scrape_listing(VALID_URL)

    assert result is None
