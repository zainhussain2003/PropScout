"""
Functionality tests for the POST /scrape router.

Pins the contract the Fastify API consumes: on success the route returns 200 with
the FLAT ScrapedListing dict (dataclasses.asdict — NOT wrapped in {listing}); on
failure it returns 422 with a SCRAPER_FAILED error. scrape_listing is mocked so no
network is touched.
"""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from scrapers.realtor_scraper import ScrapedListing

client = TestClient(app)

# The exact keys apps/api/src/routes/scrape.ts::ScrapedListingResponse reads.
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


def _fixture() -> ScrapedListing:
    return ScrapedListing(
        url="https://www.realtor.ca/real-estate/1/x",
        address="123 Main St, Toronto, ON M5V 1A1",
        price=650_000,
        beds=2,
        baths=1.0,
        sqft=850,
        property_type="Single Family",
        annual_taxes=4200,
        taxes_known=True,
        condo_fee_monthly=550,
        condo_fee_known=True,
        year_built=2010,
        year_built_known=True,
        listing_type="for_sale",
        listing_description="Nice condo",
        photo_urls=["https://cdn.realtor.ca/x.jpg"],
        days_on_market=None,
        raw={"mls": "W1"},
        building_type="Apartment",
        parking_spaces=1,
    )


def test_scrape_success_returns_flat_listing():
    with patch("routers.scrape.scrape_listing", new=AsyncMock(return_value=_fixture())):
        res = client.post(
            "/scrape", json={"url": "https://www.realtor.ca/real-estate/1/x"}
        )
    assert res.status_code == 200
    body = res.json()
    # Flat, not wrapped in {"listing": ...}
    assert "listing" not in body
    assert set(body.keys()) == _API_CONTRACT_KEYS
    assert body["price"] == 650_000
    assert body["taxes_known"] is True
    assert body["photo_urls"] == ["https://cdn.realtor.ca/x.jpg"]
    assert body["building_type"] == "Apartment"


def test_scrape_failure_returns_422():
    with patch("routers.scrape.scrape_listing", new=AsyncMock(return_value=None)):
        res = client.post(
            "/scrape", json={"url": "https://www.realtor.ca/real-estate/1/x"}
        )
    assert res.status_code == 422
    assert res.json()["error"] == "SCRAPER_FAILED"


def test_scrape_missing_url_is_422():
    # Pydantic validation on ScrapeRequest.url
    res = client.post("/scrape", json={})
    assert res.status_code == 422
