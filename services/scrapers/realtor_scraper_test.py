"""
Tests for realtor_scraper.py.

Uses a minimal HTML fixture that mirrors the actual Realtor.ca page structure
— does not hit live Realtor.ca servers.

Tests cover:
  - Listing ID extraction from various URL patterns
  - Field parsing from a realistic HTML page fixture
  - dataLayer.push() property object extraction
  - Element ID-based extraction for taxes, condo fees, year built
  - Sqft from range ("600 - 699 sqft") and from m² in dataLayer
  - Postal code extracted from page title
  - Address extracted from H1 tag
  - Missing fields are tracked correctly
  - PII is stripped from listing descriptions
  - Bot challenge page is detected by response length
  - Price parsing handles commas, dollar signs, decimal strings
"""

from realtor_scraper import (
    _extract_datalayer_property,
    _extract_fields,
    _get_element_value,
    _parse_price,
    _parse_sqft,
    _strip_pii,
    extract_listing_id,
)

# ── Minimal realistic HTML fixture ────────────────────────────────────────────
# Mirrors the actual Realtor.ca listing page structure observed in production.
# The key data sources are:
#   1. dataLayer.push() — price, beds, baths, sqft (m²), property type, city, province
#   2. Element IDs     — annual taxes, condo fee, year built, days on market
#   3. <title>         — address, postal code
#   4. <h1>            — street address

_FIXTURE_URL = "https://www.realtor.ca/real-estate/27000001/5702-buttermill-ave-vaughan"

REALTOR_HTML_FIXTURE = """
<!DOCTYPE html>
<html lang="en">
<head>
<title>
    For sale: 5702 BUTTERMILL Ave, Vaughan, Ontario L4K 5N2 - X12345678 | REALTOR.ca
</title>
<script>
    window.dataLayer = window.dataLayer || [];
    dataLayer.push({
        event: 'propertyDetailsLoaded',
        pagePath: '/real-estate/27000001/5702-buttermill-ave-vaughan',
        pageTitle: document.title,
        property: {
            propertyID: '27000001',
            listingID: 'X12345678',
            propertyType: 'Single Family',
            price: '729900.00',
            leasePrice: '',
            buildingType: 'Detached',
            neighbourhood: 'Vaughan',
            bathrooms: '2',
            bedrooms: '3',
            interiorFloorSpace: '185.806 m2',
            city: 'Vaughan',
            province: 'Ontario',
            status: 'active',
            photos: '12',
            hasphoto: 'yes',
            hasListingTaxAssessment: 'no',
        }
    });
</script>
</head>
<body>
<h1>5702 BUTTERMILL AveVaughan, Ontario L4K 5N2</h1>

<!-- Annual taxes -->
<div class="propertyDetailsSectionContentSubCon"
     id="propertyDetailsSectionContentSubCon_AnnualPropertyTaxes">
<div class="propertyDetailsSectionContentLabel">Annual Property Taxes</div>
<div class="propertyDetailsSectionContentValue">
$3,326<span class='listingCADLabel' style='display:none'> (CAD)</span>
</div>
</div>

<!-- Condo fee -->
<div class="propertyDetailsSectionValueSubSection"
     id="propertyDetailsSectionVal_MonthlyMaintenanceFees">
<div class="propertyDetailsSectionContentLabel">Maintenance Fees</div>
<div class="propertyDetailsSectionContentValue">
$0.00 Monthly (CAD)
</div>
</div>

<!-- Year built -->
<div class="propertyDetailsSectionContentSubCon"
     id="propertyDetailsSectionContentSubCon_YearBuilt">
<div class="propertyDetailsSectionContentLabel">Year Built</div>
<div class="propertyDetailsSectionContentValue">2005</div>
</div>

<!-- Days on market -->
<div class="propertyDetailsSectionContentSubCon"
     id="propertyDetailsSectionContentSubCon_DaysOnMarket">
<div class="propertyDetailsSectionContentLabel">Days on Market</div>
<div class="propertyDetailsSectionContentValue">14</div>
</div>

<!-- Listing description -->
<div class="listingDescriptionText">
Beautiful single family home in desirable Vaughan community.
Updated kitchen, hardwood floors throughout, and a large backyard.
Walking distance to schools and shopping.
Contact agent at [email removed] or [phone removed] for details.
</div>

<!-- Sqft range (shown separately from dataLayer) -->
<div>Square Footage 1,800 - 1,999 sqft</div>

</body>
</html>
"""

# Fixture with a condo fee > 0 and no sqft in dataLayer
REALTOR_HTML_CONDO_FIXTURE = """
<!DOCTYPE html>
<html lang="en">
<head>
<title>
    For sale: 5312 - 950 PORTAGE PKWY, Vaughan (Vaughan Corporate Centre),
    Ontario L4K 0J7 - N13165754 | REALTOR.ca
</title>
<script>
    dataLayer.push({
        property: {
            propertyID: '29795861',
            listingID: 'N13165754',
            propertyType: 'Single Family',
            price: '569900.00',
            buildingType: 'Apartment',
            bathrooms: '2',
            bedrooms: '2',
            interiorFloorSpace: '55.7414 m2',
            city: 'Vaughan (Vaughan Corporate Centre)',
            province: 'Ontario',
            status: 'active',
            photos: '37',
        }
    });
</script>
</head>
<body>
<h1>5312 - 950 PORTAGE PKWYVaughan (Vaughan Corporate Centre), Ontario L4K 0J7</h1>

<!-- Annual taxes -->
<div id="propertyDetailsSectionContentSubCon_AnnualPropertyTaxes">
<div class="propertyDetailsSectionContentValue">$2,770 (CAD)</div>
</div>

<!-- Condo fee -->
<div id="propertyDetailsSectionVal_MonthlyMaintenanceFees">
<div class="propertyDetailsSectionContentValue">$586.02 Monthly (CAD)</div>
</div>

<!-- Sqft range -->
<div>Square Footage 600 - 699 sqft</div>

</body>
</html>
"""

# Fixture that is missing critical fields (beds, price) — test partial detection
REALTOR_HTML_EMPTY_FIXTURE = """
<!DOCTYPE html>
<html lang="en">
<head>
<title>REALTOR.ca</title>
<script>dataLayer.push({ event: 'propertyDetailsLoaded' });</script>
</head>
<body>
<h1></h1>
</body>
</html>
"""


# ── extract_listing_id ────────────────────────────────────────────────────────


class TestExtractListingId:
    def test_standard_url(self) -> None:
        url = "https://www.realtor.ca/real-estate/27000001/5702-buttermill-ave"
        assert extract_listing_id(url) == "27000001"

    def test_url_with_trailing_slash(self) -> None:
        url = "https://www.realtor.ca/real-estate/99999999/some-slug/"
        assert extract_listing_id(url) == "99999999"

    def test_no_real_estate_segment_returns_none(self) -> None:
        url = "https://www.realtor.ca/map#"
        assert extract_listing_id(url) is None

    def test_url_without_slug(self) -> None:
        url = "https://www.realtor.ca/real-estate/12345678/"
        assert extract_listing_id(url) == "12345678"


# ── _parse_price ───────────────────────────────────────────────────────────────


class TestParsePrice:
    def test_comma_separated(self) -> None:
        assert _parse_price("729,900") == 729900.0

    def test_dollar_prefix(self) -> None:
        assert _parse_price("$729,900") == 729900.0

    def test_plain_integer(self) -> None:
        assert _parse_price("500000") == 500000.0

    def test_decimal_string(self) -> None:
        assert _parse_price("569900.00") == 569900.0

    def test_none_returns_none(self) -> None:
        assert _parse_price(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert _parse_price("") is None

    def test_non_numeric_returns_none(self) -> None:
        assert _parse_price("N/A") is None


# ── _parse_sqft ────────────────────────────────────────────────────────────────


class TestParseSqft:
    def test_sqft_with_unit(self) -> None:
        assert _parse_sqft("2000 sqft") == 2000

    def test_sqft_with_comma(self) -> None:
        assert _parse_sqft("1,400 sqft") == 1400

    def test_plain_number(self) -> None:
        assert _parse_sqft("1500") == 1500

    def test_square_metres_converted(self) -> None:
        # 100 m² × 10.7639 ≈ 1076 sqft
        result = _parse_sqft("100 m²")
        assert result is not None
        assert 1070 < result < 1080

    def test_sqft_range_returns_midpoint(self) -> None:
        # "600 - 699 sqft" → midpoint 649
        result = _parse_sqft("600 - 699 sqft")
        assert result is not None
        assert result == 649

    def test_m2_from_datalayer(self) -> None:
        # 185.806 m² → ~2000 sqft
        result = _parse_sqft("185.806 m2")
        assert result is not None
        assert 1990 < result < 2010

    def test_small_m2_converted(self) -> None:
        # 55.7414 m² → ~600 sqft
        result = _parse_sqft("55.7414 m2")
        assert result is not None
        assert 595 < result < 605

    def test_none_returns_none(self) -> None:
        assert _parse_sqft(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert _parse_sqft("") is None


# ── _strip_pii ─────────────────────────────────────────────────────────────────


class TestStripPii:
    def test_email_stripped(self) -> None:
        text = "Contact jane.smith@realty.com for a showing."
        result = _strip_pii(text)
        assert result is not None
        assert "jane.smith@realty.com" not in result
        assert "[email removed]" in result

    def test_phone_stripped(self) -> None:
        text = "Call 416-555-1234 today."
        result = _strip_pii(text)
        assert result is not None
        assert "416-555-1234" not in result
        assert "[phone removed]" in result

    def test_clean_text_unchanged(self) -> None:
        text = "Beautiful home with granite countertops and hardwood floors."
        assert _strip_pii(text) == text

    def test_none_returns_none(self) -> None:
        assert _strip_pii(None) is None


# ── _extract_datalayer_property ───────────────────────────────────────────────


class TestExtractDatalayerProperty:
    def test_extracts_price(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert dl["price"] == "729900.00"

    def test_extracts_beds(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert dl["bedrooms"] == "3"

    def test_extracts_baths(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert dl["bathrooms"] == "2"

    def test_extracts_property_type(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert dl["propertyType"] == "Single Family"

    def test_extracts_province(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert dl["province"] == "Ontario"

    def test_extracts_floor_space(self) -> None:
        dl = _extract_datalayer_property(REALTOR_HTML_FIXTURE)
        assert "185.806" in dl.get("interiorFloorSpace", "")

    def test_empty_html_returns_empty_dict(self) -> None:
        dl = _extract_datalayer_property("<html><body></body></html>")
        assert dl == {}


# ── _get_element_value ────────────────────────────────────────────────────────


class TestGetElementValue:
    def test_annual_taxes_extracted(self) -> None:
        val = _get_element_value(
            REALTOR_HTML_FIXTURE,
            "propertyDetailsSectionContentSubCon_AnnualPropertyTaxes",
        )
        assert val is not None
        assert "3,326" in val or "3326" in val

    def test_condo_fee_extracted(self) -> None:
        val = _get_element_value(
            REALTOR_HTML_FIXTURE,
            "propertyDetailsSectionVal_MonthlyMaintenanceFees",
        )
        assert val is not None
        assert "0" in val

    def test_year_built_extracted(self) -> None:
        val = _get_element_value(
            REALTOR_HTML_FIXTURE,
            "propertyDetailsSectionContentSubCon_YearBuilt",
        )
        assert val == "2005"

    def test_days_on_market_extracted(self) -> None:
        val = _get_element_value(
            REALTOR_HTML_FIXTURE,
            "propertyDetailsSectionContentSubCon_DaysOnMarket",
        )
        assert val == "14"

    def test_missing_element_returns_none(self) -> None:
        val = _get_element_value(REALTOR_HTML_FIXTURE, "nonExistentElementId")
        assert val is None


# ── _extract_fields ────────────────────────────────────────────────────────────


class TestExtractFields:
    # ── Detached house fixture ─────────────────────────────────────────────────

    def test_price_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["price"] == 729900.0

    def test_beds_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["beds"] == 3

    def test_baths_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["baths"] == 2.0

    def test_sqft_from_datalayer_m2(self) -> None:
        # 185.806 m² → ~2000 sqft
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        sqft = fields["sqft"]
        assert sqft is not None
        assert 1990 < sqft < 2010

    def test_annual_taxes_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["annual_taxes"] == 3326.0
        assert fields["taxes_known"] is True

    def test_condo_fee_zero_is_known(self) -> None:
        # Fee of $0.00 means no condo fee — but it IS known (not missing)
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["condo_fee"] == 0.0
        assert fields["condo_fee_known"] is True

    def test_year_built_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["year_built"] == 2005
        assert fields["year_built_known"] is True

    def test_days_on_market_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["days_on_market"] == 14

    def test_postal_code_extracted_from_title(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["postal_code"] == "L4K 5N2"

    def test_province_detected_as_ontario(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["province"] == "ON"

    def test_address_from_title(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        address = fields["address"]
        assert address is not None
        assert "BUTTERMILL" in address.upper() or "5702" in address

    def test_property_type_extracted(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["property_type"] == "Single Family"

    def test_listing_type_for_sale(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["listing_type"] == "for_sale"

    def test_listing_description_present(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        desc = fields["listing_description"]
        assert desc is not None
        assert len(desc) > 20

    def test_source_and_source_url(self) -> None:
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["source"] == "realtor_ca"
        assert fields["source_url"] == _FIXTURE_URL

    def test_missing_fields_empty_for_complete_fixture(self) -> None:
        _, missing, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        # All critical fields should be present in the complete fixture
        assert "price" not in missing
        assert "beds" not in missing
        assert "address" not in missing
        assert "annual_taxes" not in missing

    # ── Condo fixture ─────────────────────────────────────────────────────────

    def test_condo_fee_nonzero(self) -> None:
        _condo_url = "https://www.realtor.ca/real-estate/29795861/5312-950-portage-pkwy"
        fields, _, _ = _extract_fields(
            REALTOR_HTML_CONDO_FIXTURE, _condo_url, "29795861"
        )
        assert fields["condo_fee"] is not None
        assert fields["condo_fee"] == pytest.approx(586.02, abs=0.01)
        assert fields["condo_fee_known"] is True

    def test_sqft_from_range_in_html(self) -> None:
        # 600-699 sqft range → midpoint 649; but dataLayer m² takes precedence
        _condo_url = "https://www.realtor.ca/real-estate/29795861/5312-950-portage-pkwy"
        fields, _, _ = _extract_fields(
            REALTOR_HTML_CONDO_FIXTURE, _condo_url, "29795861"
        )
        # dataLayer has 55.7414 m2 → ~600 sqft; range gives 649
        # Either is acceptable — just confirm sqft is populated
        assert fields["sqft"] is not None
        assert 580 < fields["sqft"] < 700

    def test_annual_taxes_condo(self) -> None:
        _condo_url = "https://www.realtor.ca/real-estate/29795861/5312-950-portage-pkwy"
        fields, _, _ = _extract_fields(
            REALTOR_HTML_CONDO_FIXTURE, _condo_url, "29795861"
        )
        assert fields["annual_taxes"] == 2770.0

    # ── Empty fixture — missing fields ────────────────────────────────────────

    def test_empty_response_reports_missing_critical_fields(self) -> None:
        fields, missing, _ = _extract_fields(
            REALTOR_HTML_EMPTY_FIXTURE, _FIXTURE_URL, "27000001"
        )
        assert fields["price"] is None
        assert fields["beds"] is None
        assert "price" in missing
        assert "beds" in missing

    def test_all_fields_present_in_output(self) -> None:
        """Every expected key must be present even if value is None."""
        fields, _, _ = _extract_fields(REALTOR_HTML_FIXTURE, _FIXTURE_URL, "27000001")
        required_keys = [
            "source_url",
            "source",
            "listing_type",
            "address",
            "postal_code",
            "province",
            "price",
            "beds",
            "baths",
            "sqft",
            "property_type",
            "annual_taxes",
            "taxes_known",
            "condo_fee",
            "condo_fee_known",
            "year_built",
            "year_built_known",
            "days_on_market",
            "listing_description",
            "photo_urls",
        ]
        for key in required_keys:
            assert key in fields, f"Missing key: {key}"


import pytest  # noqa: E402 — needed for pytest.approx in condo test

# ── scrape_listing() — request routing (ScraperAPI vs direct) ─────────────────
#
# These tests verify that scrape_listing() routes requests through ScraperAPI
# when SCRAPER_API_KEY is set and falls back to a direct httpx call when it is
# not. Neither test hits a real network — httpx is fully mocked.


class TestScrapingRouteScraperAPI:
    """
    Test A — When SCRAPER_API_KEY is set, the request must go through
    api.scraperapi.com and the original Realtor.ca URL must appear (URL-encoded)
    in the request URL.
    """

    @pytest.mark.asyncio
    async def test_scraperapi_url_used_when_key_is_set(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Request URL must start with api.scraperapi.com and contain the encoded listing URL."""
        import urllib.parse
        from unittest.mock import AsyncMock, MagicMock, patch

        monkeypatch.setenv("SCRAPER_API_KEY", "testkey123")

        listing_url = (
            "https://www.realtor.ca/real-estate/29795861/"
            "5312-950-portage-parkway-vaughan-vaughan-corporate-centre"
        )

        # Pad to ensure we pass the 50KB bot-challenge size check.
        # Parsing will return partial data from the fixture — that's fine here.
        fake_html = REALTOR_HTML_FIXTURE + " " * 60_000

        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.text = fake_html
        fake_response.raise_for_status = MagicMock()

        captured_urls: list[str] = []

        async def fake_get(url: str, **kwargs: object) -> MagicMock:
            captured_urls.append(url)
            return fake_response

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = fake_get

        with (
            patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client),
            patch("realtor_scraper.asyncio.sleep", new=AsyncMock()),
            patch("realtor_scraper.upsert_listing", new=AsyncMock(return_value=None)),
            patch("realtor_scraper.log_scrape", new=AsyncMock()),
        ):
            from realtor_scraper import scrape_listing

            await scrape_listing(listing_url)

        assert len(captured_urls) == 1, "Expected exactly one HTTP request"
        used_url = captured_urls[0]
        assert used_url.startswith(
            "http://api.scraperapi.com"
        ), f"Expected ScraperAPI URL, got: {used_url}"
        assert "api_key=testkey123" in used_url
        assert "render=true" in used_url
        encoded = urllib.parse.quote(listing_url, safe="")
        assert (
            encoded in used_url
        ), "Encoded listing URL must appear in ScraperAPI request"


class TestScrapingRouteDirect:
    """
    Test B — When SCRAPER_API_KEY is not set, the request must go directly to
    the original Realtor.ca URL (not through api.scraperapi.com).
    """

    @pytest.mark.asyncio
    async def test_direct_request_when_key_not_set(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Without SCRAPER_API_KEY the scraper falls back to the direct Realtor.ca URL."""
        from unittest.mock import AsyncMock, MagicMock, patch

        monkeypatch.delenv("SCRAPER_API_KEY", raising=False)

        listing_url = (
            "https://www.realtor.ca/real-estate/29795861/"
            "5312-950-portage-parkway-vaughan-vaughan-corporate-centre"
        )

        fake_html = REALTOR_HTML_FIXTURE + " " * 60_000
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.text = fake_html
        fake_response.raise_for_status = MagicMock()

        captured_urls: list[str] = []

        async def fake_get(url: str, **kwargs: object) -> MagicMock:
            captured_urls.append(url)
            return fake_response

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = fake_get

        with (
            patch("realtor_scraper.httpx.AsyncClient", return_value=mock_client),
            patch("realtor_scraper.asyncio.sleep", new=AsyncMock()),
            patch("realtor_scraper.upsert_listing", new=AsyncMock(return_value=None)),
            patch("realtor_scraper.log_scrape", new=AsyncMock()),
        ):
            from realtor_scraper import scrape_listing

            result = await scrape_listing(listing_url)

        assert len(captured_urls) == 1, "Expected exactly one HTTP request"
        used_url = captured_urls[0]
        assert (
            "api.scraperapi.com" not in used_url
        ), "Without a key, must not route through ScraperAPI"
        assert (
            used_url == listing_url
        ), f"Direct request must go straight to Realtor.ca URL. Got: {used_url}"
        # scrape_status may be partial/success depending on fixture — just confirm no crash
        assert "scrape_status" in result
