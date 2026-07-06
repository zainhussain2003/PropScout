"""
Unit tests for the ScraperAPI-based scrapers.realtor_scraper.

This scraper replaced the old direct-api2.realtor.ca one (Incapsula-blocked, thin
shape). It fetches listing HTML through ScraperAPI premium and parses three
sources: the dataLayer.property JS block, the schema.org JSON-LD, and the
propertyDetailsSection label/value pairs. Its flat output is what the Fastify API
consumes — the contract is pinned by test_scrape_response_shape_matches_api_contract.
"""

import dataclasses
from unittest.mock import AsyncMock, patch

import pytest

import scrapers.realtor_scraper as realtor_scraper
from scrapers.realtor_scraper import (
    ScrapedListing,
    _DetailFields,
    _dl,
    _parse_photo_urls,
    _parse_rendered_fields,
    scrape_listing,
)

_URL = "https://www.realtor.ca/real-estate/12345678/test-listing"

# Minimal page: dataLayer.property with a lease price (for_rent) + JSON-LD address.
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

_FOR_SALE_PAGE = """
<script>
dataLayer.push({
  property: {
    price: '1,249,900',
    leasePrice: '',
    bedrooms: '4',
    bathrooms: '4',
    propertyType: 'Single Family',
    buildingType: 'House',
    interiorFloorSpace: '2000 sqft',
    listingID: 'W123',
    city: 'Mississauga',
    province: 'Ontario'
  }
});
</script>
<script type="application/ld+json">
{"@type": "Product",
 "name": "103 WHITCHURCH MEWS, Mississauga (Cooksville), Ontario L5A4B2",
 "description": "Beautiful &amp; bright home",
 "image": ["https://cdn.realtor.ca/listings/TS1/reb82/highres/0/w123_1.jpg"],
 "offers": {"@type": "Offer"}}
</script>
<div class="propertyDetailsSectionContentLabel">Annual Property Taxes</div>
<div class="propertyDetailsSectionContentValue">$8,239.00(CAD)</div>
"""


class _FakeResponse:
    def __init__(self, status_code: int, text: str = "") -> None:
        self.status_code = status_code
        self.text = text


def _client_returning(responses: list) -> tuple:
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


async def _scrape(page: str, url: str = _URL, key: str = "test-key"):
    cm, client = _client_returning([_FakeResponse(200, page)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", key),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        return await scrape_listing(url)


# ── _dl (dataLayer field extraction) ────────────────────────────────────────────

_DL_BLOCK = (
    "price: '1,000', leasePrice: '', bedrooms: '3', propertyType: 'Single Family'"
)


@pytest.mark.parametrize(
    "field,expected",
    [
        ("price", "1,000"),
        ("leasePrice", ""),  # present but empty
        ("bedrooms", "3"),
        ("propertyType", "Single Family"),
        ("bathrooms", None),  # absent → None
        ("missingField", None),
    ],
)
def test_dl_extracts_field(field, expected):
    assert _dl(field, _DL_BLOCK) == expected


def test_dl_handles_extra_whitespace():
    assert _dl("price", "price:   '500'") == "500"


def test_dl_value_with_spaces():
    assert _dl("city", "city: 'Richmond Hill'") == "Richmond Hill"


def test_dl_word_boundary_not_substring():
    # 'price' must not match inside 'leasePrice'
    assert _dl("price", "leasePrice: '99'") is None


def test_dl_empty_block_returns_none():
    assert _dl("price", "") is None


# ── _parse_photo_urls ───────────────────────────────────────────────────────────

_P = "https://cdn.realtor.ca/listings/TS1/reb82/highres/0"


def test_parse_photo_urls_orders_by_sequence():
    page = f'"{_P}/x_3.jpg" "{_P}/x_1.jpg" "{_P}/x_2.jpg"'
    assert _parse_photo_urls(page) == [
        f"{_P}/x_1.jpg",
        f"{_P}/x_2.jpg",
        f"{_P}/x_3.jpg",
    ]


def test_parse_photo_urls_dedupes():
    page = f'"{_P}/x_1.jpg" "{_P}/x_1.jpg" "{_P}/x_2.jpg"'
    assert _parse_photo_urls(page) == [f"{_P}/x_1.jpg", f"{_P}/x_2.jpg"]


def test_parse_photo_urls_caps_at_12():
    page = " ".join(f'"{_P}/x_{i}.jpg"' for i in range(1, 30))
    assert len(_parse_photo_urls(page)) == 12


def test_parse_photo_urls_none_found():
    assert _parse_photo_urls("<html>no photos</html>") == []


def test_parse_photo_urls_ignores_non_highres():
    page = '"https://cdn.realtor.ca/listings/TS1/reb82/lowres/0/x_1.jpg"'
    assert _parse_photo_urls(page) == []


def test_parse_photo_urls_stops_at_query_string():
    page = f'"{_P}/x_1.jpg?w=512"'
    assert _parse_photo_urls(page) == [f"{_P}/x_1.jpg"]


# ── _parse_rendered_fields ──────────────────────────────────────────────────────


def _detail(label: str, value: str) -> str:
    return (
        f'<div class="propertyDetailsSectionContentLabel">{label}</div>'
        f'<div class="propertyDetailsSectionContentValue">{value}</div>'
    )


def test_detail_taxes_parsed():
    out = _parse_rendered_fields(_detail("Annual Property Taxes", "$3,326.00(CAD)"))
    assert out.annual_taxes == 3326 and out.taxes_known is True


def test_detail_taxes_generic_label():
    out = _parse_rendered_fields(_detail("Property Taxes", "$2,696.29"))
    assert out.annual_taxes == 2696 and out.taxes_known is True


def test_detail_condo_fee_parsed():
    out = _parse_rendered_fields(_detail("Maintenance Fees", "$761.00 Monthly"))
    assert out.condo_fee_monthly == 761 and out.condo_fee_known is True


def test_detail_condo_fee_include_label_ignored():
    # "Maintenance Fees Include" is a description, not the fee amount.
    out = _parse_rendered_fields(_detail("Maintenance Fees Include", "Heat, Water"))
    assert out.condo_fee_monthly is None and out.condo_fee_known is False


def test_detail_condo_fee_company_label_ignored():
    out = _parse_rendered_fields(_detail("Maintenance Fees Company", "ABC Corp"))
    assert out.condo_fee_monthly is None and out.condo_fee_known is False


def test_detail_year_built_parsed():
    out = _parse_rendered_fields(_detail("Year Built", "2019"))
    assert out.year_built == 2019 and out.year_built_known is True


def test_detail_year_built_approx():
    out = _parse_rendered_fields(_detail("Construction Year", "2015 approx"))
    assert out.year_built == 2015 and out.year_built_known is True


def test_detail_parking_parsed():
    out = _parse_rendered_fields(_detail("Total Parking Spaces", "5"))
    assert out.parking_spaces == 5


def test_detail_above_grade_beds_parsed():
    out = _parse_rendered_fields(_detail("Above Grade", "2"))
    assert out.beds_above_grade == 2


def test_detail_missing_value_sibling_skipped():
    html = '<div class="propertyDetailsSectionContentLabel">Year Built</div>'
    out = _parse_rendered_fields(html)
    assert out.year_built is None and out.year_built_known is False


def test_detail_unparseable_tax_left_unknown():
    out = _parse_rendered_fields(_detail("Annual Property Taxes", "Contact agent"))
    assert out.annual_taxes is None and out.taxes_known is False


def test_detail_empty_page_returns_blank_fields():
    out = _parse_rendered_fields("<html></html>")
    assert out == _DetailFields()


def test_detail_malformed_html_non_fatal():
    # Must not raise even on junk input.
    out = _parse_rendered_fields("<div class=propertyDetailsSectionContentLabel>x")
    assert isinstance(out, _DetailFields)


def test_detail_year_built_bad_value_unknown():
    out = _parse_rendered_fields(_detail("Year Built", "old"))
    assert out.year_built is None and out.year_built_known is False


# ── scrape_listing: guards ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invalid_url_returns_none_without_http():
    cm, client = _client_returning([_FakeResponse(200, _PAGE)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "test-key"),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing("https://www.realtor.ca/not-a-listing")
    assert result is None
    client.get.assert_not_awaited()


@pytest.mark.asyncio
async def test_missing_api_key_returns_none():
    result = await _scrape(_PAGE, key="")
    assert result is None


# ── scrape_listing: retry behaviour ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_transient_failures_retried_until_success():
    cm, client = _client_returning(
        [_FakeResponse(500), _FakeResponse(500), _FakeResponse(200, _PAGE)]
    )
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "k"),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)
    assert result is not None
    assert client.get.await_count == 3


@pytest.mark.asyncio
async def test_gives_up_after_max_attempts():
    cm, client = _client_returning([_FakeResponse(500)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "k"),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)
    assert result is None
    assert client.get.await_count == realtor_scraper._SCRAPER_API_ATTEMPTS


@pytest.mark.asyncio
async def test_first_attempt_success_one_request():
    cm, client = _client_returning([_FakeResponse(200, _PAGE)])
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "k"),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)
    assert result is not None
    assert client.get.await_count == 1


# ── scrape_listing: parsing ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_for_rent_uses_lease_price():
    r = await _scrape(_PAGE)
    assert r is not None
    assert r.listing_type == "for_rent"
    assert r.price == 2650


@pytest.mark.asyncio
async def test_for_sale_uses_price():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.listing_type == "for_sale"
    assert r.price == 1_249_900


@pytest.mark.asyncio
async def test_no_price_or_lease_returns_none():
    page = _PAGE.replace("leasePrice: '2,650'", "leasePrice: ''")
    r = await _scrape(page)
    assert r is None


@pytest.mark.asyncio
async def test_missing_datalayer_returns_none():
    r = await _scrape("<html>no datalayer</html>")
    assert r is None


@pytest.mark.asyncio
async def test_missing_address_returns_none():
    page = _PAGE.replace(
        '"name": "1205 - 33 HELENDALE AVENUE, Toronto, Ontario M4R0A4",', ""
    )
    r = await _scrape(page)
    assert r is None


@pytest.mark.asyncio
async def test_sqft_plain_number():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.sqft == 2000


@pytest.mark.asyncio
async def test_sqft_metric_converted_to_sqft():
    page = _FOR_SALE_PAGE.replace(
        "interiorFloorSpace: '2000 sqft'", "interiorFloorSpace: '88.26 m2'"
    )
    r = await _scrape(page)
    assert r is not None
    assert r.sqft == round(88.26 * 10.7639)


@pytest.mark.asyncio
async def test_address_and_description_from_json_ld():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.address.startswith("103 WHITCHURCH MEWS")
    assert r.listing_description == "Beautiful & bright home"  # HTML-unescaped


@pytest.mark.asyncio
async def test_building_type_captured():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.building_type == "House"


@pytest.mark.asyncio
async def test_taxes_from_detail_section():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.annual_taxes == 8239 and r.taxes_known is True


@pytest.mark.asyncio
async def test_raw_carries_mls_city_province():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.raw["mls"] == "W123"
    assert r.raw["city"] == "Mississauga"
    assert r.raw["province"] == "Ontario"


@pytest.mark.asyncio
async def test_above_grade_overrides_datalayer_beds():
    # dataLayer bedrooms=3, but Above Grade=2 → honest bed count is 2.
    page = _PAGE.replace("bedrooms: '2'", "bedrooms: '3'") + _detail("Above Grade", "2")
    r = await _scrape(page)
    assert r is not None
    assert r.beds == 2


@pytest.mark.asyncio
async def test_above_grade_ignored_when_larger_than_datalayer():
    page = _PAGE + _detail("Above Grade", "9")
    r = await _scrape(page)
    assert r is not None
    assert r.beds == 2  # dataLayer value kept (9 is not a plausible reduction)


@pytest.mark.asyncio
async def test_photos_swept_from_page_when_more_than_json_ld():
    page = _FOR_SALE_PAGE + " ".join(f'"{_P}/w123_{i}.jpg"' for i in range(2, 6))
    r = await _scrape(page)
    assert r is not None
    assert len(r.photo_urls) >= 4


@pytest.mark.asyncio
async def test_days_on_market_always_none():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert r.days_on_market is None


@pytest.mark.asyncio
async def test_exception_during_fetch_returns_none():
    cm = AsyncMock()
    cm.__aenter__.side_effect = RuntimeError("boom")
    with (
        patch.object(realtor_scraper, "SCRAPER_API_KEY", "k"),
        patch("scrapers.realtor_scraper.httpx.AsyncClient", return_value=cm),
    ):
        result = await scrape_listing(_URL)
    assert result is None


@pytest.mark.asyncio
async def test_url_variant_with_trailing_path_accepted():
    r = await _scrape(
        _PAGE, url="https://www.realtor.ca/real-estate/999/some-address-here"
    )
    assert r is not None


# ── contract: the flat JSON shape the Fastify API consumes ──────────────────────

# apps/api/src/routes/scrape.ts :: ScrapedListingResponse — the exact keys the API
# reads off the /scrape response. If this drifts, the API silently mismaps fields.
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


def test_scrape_response_shape_matches_api_contract():
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


@pytest.mark.asyncio
async def test_scraped_result_serialises_to_contract_keys():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None
    assert set(dataclasses.asdict(r).keys()) == _API_CONTRACT_KEYS


# ── extra parsing coverage ──────────────────────────────────────────────────────


def test_detail_all_fields_together():
    html = (
        _detail("Annual Property Taxes", "$3,000.00")
        + _detail("Maintenance Fees", "$450.00 Monthly")
        + _detail("Year Built", "2018")
        + _detail("Total Parking Spaces", "2")
    )
    out = _parse_rendered_fields(html)
    assert out.annual_taxes == 3000
    assert out.condo_fee_monthly == 450
    assert out.year_built == 2018
    assert out.parking_spaces == 2


def test_detail_condo_fee_plain_label():
    out = _parse_rendered_fields(_detail("Maintenance Fees", "$300.00"))
    assert out.condo_fee_monthly == 300 and out.condo_fee_known is True


def test_parse_photo_urls_first_seen_sequence_wins():
    # Same URL twice; ordering key is the first-seen sequence number.
    page = f'"{_P}/x_5.jpg" "{_P}/x_1.jpg" "{_P}/x_5.jpg"'
    assert _parse_photo_urls(page) == [f"{_P}/x_1.jpg", f"{_P}/x_5.jpg"]


@pytest.mark.asyncio
async def test_beds_parsed_as_int():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None and r.beds == 4 and isinstance(r.beds, int)


@pytest.mark.asyncio
async def test_baths_parsed_as_float():
    page = _FOR_SALE_PAGE.replace("bathrooms: '4'", "bathrooms: '3.5'")
    r = await _scrape(page)
    assert r is not None and r.baths == 3.5


@pytest.mark.asyncio
async def test_property_type_passed_through_raw():
    r = await _scrape(_FOR_SALE_PAGE)
    assert r is not None and r.property_type == "Single Family"


@pytest.mark.asyncio
async def test_photos_from_json_ld_when_page_has_none():
    # No page-wide CDN sweep hits (photo host differs) → fall back to JSON-LD image.
    page = _PAGE.replace(
        '"offers": {"@type": "Offer"}',
        '"image": ["https://cdn.realtor.ca/listings/TS1/reb82/highres/0/z_1.jpg"],'
        ' "offers": {"@type": "Offer"}',
    )
    r = await _scrape(page)
    assert r is not None
    assert r.photo_urls == [
        "https://cdn.realtor.ca/listings/TS1/reb82/highres/0/z_1.jpg"
    ]


@pytest.mark.asyncio
async def test_condo_fee_captured_end_to_end():
    page = _FOR_SALE_PAGE + _detail("Maintenance Fees", "$511.06 Monthly")
    r = await _scrape(page)
    assert r is not None
    assert r.condo_fee_monthly == 511 and r.condo_fee_known is True


@pytest.mark.asyncio
async def test_parking_captured_end_to_end():
    page = _FOR_SALE_PAGE + _detail("Total Parking Spaces", "3")
    r = await _scrape(page)
    assert r is not None and r.parking_spaces == 3


@pytest.mark.asyncio
async def test_year_built_captured_end_to_end():
    page = _FOR_SALE_PAGE + _detail("Year Built", "2005")
    r = await _scrape(page)
    assert r is not None
    assert r.year_built == 2005 and r.year_built_known is True
