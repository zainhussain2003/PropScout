"""
Unit tests for realtor_scraper.scrape_listing — ScraperAPI retry behaviour.

Live probing (2026-07-02) showed ScraperAPI premium succeeds ~1-in-3 against
Realtor.ca; a single-attempt fetch made the whole pipeline fail most runs.
These tests pin the bounded retry: transient non-200s are retried, permanent
failure gives up after _SCRAPER_API_ATTEMPTS, and a success stops retrying.
"""

from unittest.mock import AsyncMock, patch

import pytest

import realtor_scraper
from realtor_scraper import scrape_listing

_URL = "https://www.realtor.ca/real-estate/12345678/test-listing"

# Minimal page body the parser accepts: dataLayer.property with a lease price
# (for_rent) plus address/postal via JSON-LD.
_PAGE = """
<script>
dataLayer.push({
  property: {
    price: '',
    leasePrice: '2,650',
    bedrooms: '2',
    bathrooms: '2',
    propertyType: 'Single Family',
    interiorFloorSpace: '600'
  }
});
</script>
<script type="application/ld+json">
{"@type": "Product", "name": "1205 - 33 HELENDALE AVENUE, Toronto, Ontario M4R0A4",
 "offers": {"@type": "Offer"}}
</script>
"""


class _FakeResponse:
    def __init__(self, status_code: int, text: str = "") -> None:
        self.status_code = status_code
        self.text = text


def _client_returning(responses: list[_FakeResponse]) -> AsyncMock:
    """AsyncClient context-manager mock whose .get pops successive responses."""
    seq = list(responses)

    async def _get(*_args, **_kwargs):
        return seq.pop(0) if len(seq) > 1 else seq[0]

    client = AsyncMock()
    client.get = AsyncMock(side_effect=_get)
    cm = AsyncMock()
    cm.__aenter__.return_value = client
    cm.__aexit__.return_value = False
    return cm, client


@pytest.mark.asyncio
async def test_transient_failures_are_retried_until_success() -> None:
    cm, client = _client_returning(
        [_FakeResponse(500), _FakeResponse(500), _FakeResponse(200, _PAGE)]
    )
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)

    assert result is not None
    assert result.listing_type == "for_rent"
    assert result.price == 2650
    assert client.get.await_count == 3  # two failures + the success


@pytest.mark.asyncio
async def test_gives_up_after_max_attempts() -> None:
    cm, client = _client_returning([_FakeResponse(500)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)

    assert result is None
    assert client.get.await_count == realtor_scraper._SCRAPER_API_ATTEMPTS


@pytest.mark.asyncio
async def test_first_attempt_success_makes_exactly_one_request() -> None:
    cm, client = _client_returning([_FakeResponse(200, _PAGE)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)

    assert result is not None
    assert client.get.await_count == 1


# ── Field extraction: building type, parking, above-grade beds, photos ─────────

_RICH_PAGE = """
<script>
dataLayer.push({
  property: {
    price: '',
    leasePrice: '2,650',
    bedrooms: '3',
    bathrooms: '2',
    propertyType: 'Single Family',
    buildingType: 'Apartment',
    interiorFloorSpace: '600'
  }
});
</script>
<script type="application/ld+json">
{"@type": "Product", "name": "1205 - 33 HELENDALE AVENUE, Toronto, Ontario M4R0A4",
 "image": ["https://cdn.realtor.ca/listings/TS1/reb82/highres/0/c135_1.jpg"],
 "offers": {"@type": "Offer"}}
</script>
<div class="propertyDetailsSectionContentLabel">Above Grade</div>
<div class="propertyDetailsSectionContentValue">2</div>
<div class="propertyDetailsSectionContentLabel">Below Grade</div>
<div class="propertyDetailsSectionContentValue">1</div>
<div class="propertyDetailsSectionContentLabel">Total Parking Spaces</div>
<div class="propertyDetailsSectionContentValue">1</div>
<img src="https://cdn.realtor.ca/listings/TS1/reb82/highres/0/c135_2.jpg">
<img src="https://cdn.realtor.ca/listings/TS1/reb82/highres/0/c135_10.jpg?w=512">
<img src="https://cdn.realtor.ca/listings/TS1/reb82/highres/0/c135_3.jpg">
"""


@pytest.mark.asyncio
async def test_building_type_parking_and_above_grade_beds_are_captured() -> None:
    """Realtor's propertyType is 'Single Family' for a condo apartment — the
    buildingType discriminator, real parking count, and the above-grade
    bedroom count (a '2 + 1' den is not a legal bedroom) must all come
    through (live Whitehaus condo mapped to detached/0-parking/3-bed before)."""
    cm, _client = _client_returning([_FakeResponse(200, _RICH_PAGE)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)

    assert result is not None
    assert result.building_type == "Apartment"
    assert result.parking_spaces == 1
    assert result.beds == 2  # above-grade, not the dataLayer '3'


@pytest.mark.asyncio
async def test_photo_sweep_collects_all_cdn_photos_in_gallery_order() -> None:
    """JSON-LD only carries photo #1; the page HTML has the full set (18–42
    live). Sweep, dedupe, order by the CDN sequence number."""
    cm, _client = _client_returning([_FakeResponse(200, _RICH_PAGE)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)

    assert result is not None
    assert [u.rsplit("_", 1)[1] for u in result.photo_urls] == [
        "1.jpg",
        "2.jpg",
        "3.jpg",
        "10.jpg",
    ]


# ── contract: flat JSON shape the Fastify API consumes (mirror of the calc-engine
#    /scrape contract test — the two /scrape servers MUST return the same keys) ──

_API_CONTRACT_KEYS = {
    "url",
    "address",
    "price",
    "beds",
    "baths",
    "sqft",
    "property_type",
    "annual_taxes",
    "taxes_known",
    "condo_fee_monthly",
    "condo_fee_known",
    "year_built",
    "year_built_known",
    "listing_type",
    "listing_description",
    "photo_urls",
    "days_on_market",
    "raw",
    "building_type",
    "parking_spaces",
}


def test_scrape_response_shape_matches_api_contract() -> None:
    import dataclasses

    from realtor_scraper import ScrapedListing

    listing = ScrapedListing(
        url="u",
        address="a",
        price=1,
        beds=1,
        baths=1.0,
        sqft=None,
        property_type="p",
        annual_taxes=None,
        taxes_known=False,
        condo_fee_monthly=None,
        condo_fee_known=False,
        year_built=None,
        year_built_known=False,
        listing_type="for_sale",
        listing_description=None,
        photo_urls=[],
        days_on_market=None,
        raw={},
    )
    assert set(dataclasses.asdict(listing).keys()) == _API_CONTRACT_KEYS
